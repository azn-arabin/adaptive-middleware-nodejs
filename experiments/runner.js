#!/usr/bin/env node
// Simple experiment runner for the adaptive-middleware project
// - writes .env with MARKOV_* settings
// - runs docker-compose up -d --build
// - waits for service-a and service-b to become responsive
// - triggers demo endpoint on service-a
// - collects /metrics and /presentation/statistics and /statistics
// - saves artifacts under experiments/results/<timestamp>/<runId>/
// - (NEW) optionally runs a workload against service-a for configured runDurationSec
// - (NEW) invokes generate-excel-report.js to produce an XLSX report in the run folder

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const scenarios = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      process.argv.includes("--quick") ? "quick-test.json" : "scenarios.json"
    ),
    "utf8"
  )
);
// Allow quick CLI overrides for smoke testing without editing scenarios.json
// Usage: node experiments/runner.js --smoke  (runs 120s)
//        node experiments/runner.js --durationSec=60
const cliArgs = {};
process.argv.slice(2).forEach((arg) => {
  if (arg === "--smoke") cliArgs.durationSec = 120;
  if (arg.startsWith("--durationSec=")) {
    const v = parseInt(arg.split("=")[1], 10);
    if (!Number.isNaN(v)) cliArgs.durationSec = v;
  }
  if (arg === "--generateReport") cliArgs.generateReport = true;
});

if (cliArgs.durationSec) {
  // override scenarios for quick smoke runs
  scenarios.runDurationSec = cliArgs.durationSec;
  scenarios.requestIntervalMs = scenarios.requestIntervalMs || 1500;
  scenarios.runsPerCombination = 1;
  console.log(
    `Override: runDurationSec=${scenarios.runDurationSec} (from CLI)`
  );
}

const resultsDir = path.join(__dirname, "results");
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForUrl(url, timeoutSec = 60) {
  const start = Date.now();
  const deadline = start + timeoutSec * 1000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (
        res &&
        (res.status === 200 || res.status === 204 || res.status === 503)
      ) {
        return true;
      }
    } catch (e) {
      // ignore
    }
    await wait(1000);
  }
  return false;
}

async function runWorkload(
  runPath,
  serviceAUrl,
  endpoint,
  durationSec,
  intervalMs
) {
  const reqs = [];
  const start = Date.now();
  const end = start + durationSec * 1000;
  let id = 1;
  let currentLoadFactor = null;
  let currentTestPhase = "workload";

  // Get initial state info
  try {
    const serviceB = await fetch("http://localhost:5000/statistics");
    const serviceBData = await serviceB.json().catch(() => null);
    if (serviceBData?.serviceMetrics?.loadFactor) {
      currentLoadFactor = serviceBData.serviceMetrics.loadFactor;
    }
  } catch (e) {
    // ignore initial state fetch errors
  }

  while (Date.now() < end) {
    const t0 = Date.now();
    const relativeTime = (Date.now() - start) / 1000;

    // Determine test phase based on time
    if (relativeTime < durationSec * 0.2) {
      currentTestPhase = "initial";
    } else if (relativeTime < durationSec * 0.5) {
      currentTestPhase = "ramp-up";
    } else if (relativeTime < durationSec * 0.8) {
      currentTestPhase = "steady-state";
    } else {
      currentTestPhase = "wind-down";
    }

    try {
      const raw = await fetch(serviceAUrl + endpoint);
      const r = await raw.json().catch(() => ({
        // Synthesize a fallback response on JSON parsing failure
        ok: false,
        usedFallback: true,
        error: "json_parse_error",
        status: "FALLBACK",
      }));

      // Normalize response to capture key fields for plotting
      const serviceState =
        r?.serviceState ?? r?.serviceResponse?.serviceState ?? null;
      const markovModelPresent = !!(
        r?.markovModel ||
        r?.serviceResponse?.markovModel ||
        (r?.serviceResponse && r.serviceResponse.markovModel)
      );
      const usedFallback = r ? !markovModelPresent : true;

      // Enhanced load factor extraction with fallback preservation
      let loadFactor = r?.loadFactor ?? r?.serviceResponse?.loadFactor ?? null;

      // For fallback responses, preserve the current load factor or get from fallback data
      if (usedFallback && !loadFactor) {
        loadFactor =
          r?.serviceResponse?.loadFactor ?? r?.loadFactor ?? currentLoadFactor;
      }

      // Try to get service state from Service B directly for fallback cases
      let finalServiceState = serviceState;
      if (usedFallback && !serviceState) {
        try {
          const serviceBStatus = await fetch(
            "http://localhost:5000/statistics"
          );
          const serviceBData = await serviceBStatus.json();
          if (serviceBData?.markovChainMetrics?.currentState) {
            finalServiceState = serviceBData.markovChainMetrics.currentState;
          }
          if (serviceBData?.serviceMetrics?.loadFactor) {
            currentLoadFactor = serviceBData.serviceMetrics.loadFactor;
            if (!loadFactor) {
              loadFactor = currentLoadFactor;
            }
          }
        } catch (e) {
          // fallback to previous known state
          finalServiceState = finalServiceState || "UNKNOWN";
        }
      }

      reqs.push({
        id: id++,
        timestamp: Date.now(),
        durationMs: Date.now() - t0,
        ok: r !== null,
        response: r,
        serviceState: finalServiceState,
        usedFallback: usedFallback,
        loadFactor: loadFactor,
        testPhase: currentTestPhase,
        relativeTimeSeconds: relativeTime.toFixed(3),
      });
    } catch (e) {
      reqs.push({
        id: id++,
        timestamp: Date.now(),
        durationMs: Date.now() - t0,
        ok: false,
        error: e.message,
        serviceState: "ERROR",
        usedFallback: true,
        loadFactor: currentLoadFactor,
        testPhase: currentTestPhase,
        relativeTimeSeconds: relativeTime.toFixed(3),
      });
    }

    // Periodically flush partial results to disk so partial data is preserved on crash
    if (reqs.length % 10 === 0) {
      try {
        fs.writeFileSync(
          path.join(runPath, "request-timeline.json"),
          JSON.stringify(reqs, null, 2),
          "utf8"
        );
      } catch (e) {
        // ignore write errors
      }
    }

    // Wait for next interval (account for request duration)
    const elapsed = Date.now() - t0;
    const toWait = Math.max(0, intervalMs - elapsed);
    await wait(toWait);
  }

  // Final write
  try {
    fs.writeFileSync(
      path.join(runPath, "request-timeline.json"),
      JSON.stringify(reqs, null, 2),
      "utf8"
    );
  } catch (e) {}

  return {
    requests: reqs.length,
    first: reqs[0],
    last: reqs[reqs.length - 1],
  };
}

(async () => {
  const runTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  for (const seed of scenarios.seeds) {
    for (const load of scenarios.loadFactors) {
      const runsPerCombination = scenarios.runsPerCombination || 1;
      for (let rep = 1; rep <= runsPerCombination; rep++) {
        const runId = `seed-${seed}_load-${load}_rep-${rep}`;
        const runPath = path.join(resultsDir, `${runTimestamp}_${runId}`);
        fs.mkdirSync(runPath, { recursive: true });

        console.log(`\n=== Starting run ${runId} ===`);

        // Write .env for docker-compose to pick up
        const tunerMs =
          scenarios.tunerIntervalMs || process.env.TUNER_INTERVAL_MS || 5000;
        const envContent = `MARKOV_SEED=${seed}\nMARKOV_MIN_TRANSITION_MS=${scenarios.minTransitionMs}\nMARKOV_MAX_TRANSITION_MS=${scenarios.maxTransitionMs}\nTUNER_INTERVAL_MS=${tunerMs}\n`;
        fs.writeFileSync(path.join(process.cwd(), ".env"), envContent);
        console.log("Wrote .env with MARKOV settings");

        // Start docker-compose
        console.log("Running: docker-compose up -d --build");
        try {
          execSync("docker-compose up -d --build", { stdio: "inherit" });
        } catch (err) {
          console.error("docker-compose up failed:", err.message);
          process.exit(1);
        }

        // Wait for service-b /health and service-a root
        const serviceBHealth = `${scenarios.serviceBUrl}/health`;
        const serviceAUrl = scenarios.serviceAUrl;
        console.log(`Waiting for Service B health at ${serviceBHealth}`);
        const okB = await waitForUrl(
          serviceBHealth,
          scenarios.waitForServicesTimeoutSec
        );
        console.log(`Service B ready: ${okB}`);

        console.log(`Waiting for Service A at ${serviceAUrl}`);
        const okA = await waitForUrl(
          serviceAUrl,
          scenarios.waitForServicesTimeoutSec
        );
        console.log(`Service A ready: ${okA}`);

        if (!okA || !okB) {
          console.error(
            "One or more services did not become ready in time. Collecting logs and exiting."
          );
          try {
            // Capture full compose logs programmatically to avoid shell redirection issues on Windows (paths with spaces)
            const allLogs = execSync("docker-compose logs --no-color", {
              encoding: "utf8",
            });
            fs.writeFileSync(
              path.join(runPath, "compose-logs.txt"),
              allLogs,
              "utf8"
            );

            // Also capture per-service logs to ease debugging
            try {
              const logsA = execSync(
                "docker-compose logs service-a --no-color",
                { encoding: "utf8" }
              );
              fs.writeFileSync(
                path.join(runPath, "service-a-logs.txt"),
                logsA,
                "utf8"
              );
            } catch (e) {
              // ignore per-service failures
            }
            try {
              const logsB = execSync(
                "docker-compose logs service-b --no-color",
                { encoding: "utf8" }
              );
              fs.writeFileSync(
                path.join(runPath, "service-b-logs.txt"),
                logsB,
                "utf8"
              );
            } catch (e) {}
            try {
              const logsM = execSync(
                "docker-compose logs adaptive-middleware --no-color",
                { encoding: "utf8" }
              );
              fs.writeFileSync(
                path.join(runPath, "adaptive-middleware-logs.txt"),
                logsM,
                "utf8"
              );
            } catch (e) {}
          } catch (e) {
            console.warn(
              "Failed to capture docker-compose logs programmatically:",
              e.message
            );
          }

          try {
            execSync("docker-compose down");
          } catch (e) {}
          continue;
        }

        // Set load factor on service-b
        try {
          await fetch(`${scenarios.serviceBUrl}/control/load-factor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ load }),
          });
          console.log(`Set load factor ${load} on Service B`);
        } catch (e) {
          console.warn("Failed to set load factor:", e.message);
        }

        // Trigger demo on service-a (initial)
        const demoEndpoint = scenarios.demoEndpoint || "/demo/markov-enhanced";
        const demoUrl = `${scenarios.serviceAUrl}${demoEndpoint}`;
        console.log(`Triggering demo: ${demoUrl}`);
        let demoResult = null;
        try {
          const r = await fetch(demoUrl);
          demoResult = await r.json().catch(() => null);
          fs.writeFileSync(
            path.join(runPath, "demo-response.json"),
            JSON.stringify(demoResult, null, 2)
          );
          console.log("Saved demo response");
        } catch (e) {
          console.error("Demo request failed:", e.message);
        }

        // If runDurationSec configured, run workload against service-a endpoint
        if (scenarios.runDurationSec && scenarios.runDurationSec > 0) {
          console.log(
            `Running workload for ${scenarios.runDurationSec} seconds (interval ${scenarios.requestIntervalMs} ms)`
          );
          try {
            const workloadResult = await runWorkload(
              runPath,
              scenarios.serviceAUrl,
              scenarios.workloadEndpoint || "/test",
              scenarios.runDurationSec,
              scenarios.requestIntervalMs || 1000
            );
            fs.writeFileSync(
              path.join(runPath, "workload-summary.json"),
              JSON.stringify(workloadResult, null, 2),
              "utf8"
            );
            console.log("Workload completed", workloadResult);
          } catch (e) {
            console.warn("Workload execution failed:", e.message);
          }
        }

        // Collect metrics and statistics
        try {
          const metricsA = await fetch(`${scenarios.serviceAUrl}/metrics`)
            .then((r) => r.text())
            .catch(() => null);
          if (metricsA)
            fs.writeFileSync(
              path.join(runPath, "service-a-metrics.prom"),
              metricsA
            );
          const metricsB = await fetch(`${scenarios.serviceBUrl}/metrics`)
            .then((r) => r.text())
            .catch(() => null);
          if (metricsB)
            fs.writeFileSync(
              path.join(runPath, "service-b-metrics.prom"),
              metricsB
            );

          const pres = await fetch(
            `${scenarios.serviceAUrl}/presentation/statistics`
          )
            .then((r) => r.json())
            .catch(() => null);
          if (pres)
            fs.writeFileSync(
              path.join(runPath, "service-a-presentation-statistics.json"),
              JSON.stringify(pres, null, 2)
            );

          const statB = await fetch(`${scenarios.serviceBUrl}/statistics`)
            .then((r) => r.json())
            .catch(() => null);
          if (statB)
            fs.writeFileSync(
              path.join(runPath, "service-b-statistics.json"),
              JSON.stringify(statB, null, 2)
            );

          console.log("Collected metrics and statistics");
        } catch (e) {
          console.warn("Error collecting metrics:", e.message);
        }

        // Archive docker-compose logs (optimized for large outputs)
        try {
          console.log("Capturing docker-compose logs...");
          // Capture ALL logs - don't use --tail to avoid missing adaptation events
          const allLogs = execSync(`docker-compose logs --no-color`, {
            encoding: "utf8",
            maxBuffer: 1024 * 1024 * 100, // 100MB buffer for large logs
            timeout: 60000, // 60 second timeout
          });
          fs.writeFileSync(
            path.join(runPath, "compose-logs.txt"),
            allLogs,
            "utf8"
          );
          console.log("Docker-compose logs captured successfully");
        } catch (e) {
          console.warn("Failed to capture compose logs:", e.message);
          // Try individual service logs as fallback with smaller buffers
          try {
            const serviceALogs = execSync(
              "docker-compose logs service-a --no-color",
              {
                encoding: "utf8",
                maxBuffer: 1024 * 1024 * 20,
                timeout: 30000,
              }
            );
            fs.writeFileSync(
              path.join(runPath, "service-a-logs.txt"),
              serviceALogs,
              "utf8"
            );
            console.log("Service-A logs captured as fallback");
          } catch (e2) {
            console.warn("Could not capture service-a logs:", e2.message);
          }
          try {
            const serviceBLogs = execSync(
              "docker-compose logs service-b --no-color",
              {
                encoding: "utf8",
                maxBuffer: 1024 * 1024 * 20,
                timeout: 30000,
              }
            );
            fs.writeFileSync(
              path.join(runPath, "service-b-logs.txt"),
              serviceBLogs,
              "utf8"
            );
            console.log("Service-B logs captured as fallback");
          } catch (e2) {
            console.warn("Could not capture service-b logs:", e2.message);
          }
          try {
            const middlewareLogs = execSync(
              "docker-compose logs adaptive-middleware --no-color",
              {
                encoding: "utf8",
                maxBuffer: 1024 * 1024 * 20,
                timeout: 30000,
              }
            );
            fs.writeFileSync(
              path.join(runPath, "adaptive-middleware-logs.txt"),
              middlewareLogs,
              "utf8"
            );
            console.log("Middleware logs captured as fallback");
          } catch (e2) {
            console.warn("Could not capture middleware logs:", e2.message);
          }
        }

        // Generate Excel report for this run (if generator exists)
        try {
          const generator = path.join(
            process.cwd(),
            "generate-excel-report.js"
          );
          if (fs.existsSync(generator)) {
            console.log("Generating Excel report for run...");
            execSync(`node "${generator}" "${runPath}"`, { stdio: "inherit" });
          }
        } catch (e) {
          console.warn("Excel report generation failed:", e.message);
        }

        // Tear down
        console.log("Tearing down docker-compose");
        try {
          execSync("docker-compose down", { stdio: "inherit" });
        } catch (e) {
          console.warn("docker-compose down failed:", e.message);
        }

        console.log(
          `=== Completed run ${runId} (results saved to ${runPath}) ===\n`
        );

        // small pause between runs
        await wait(2000);
      } // End of repetition loop
    }
  }

  console.log("All runs complete");
})();
