const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

// Usage: node generate-excel-report.js [path/to/runFolder]
// If no argument provided, it will pick the latest folder under experiments/results

function findLatestRun(resultsRoot) {
  if (!fs.existsSync(resultsRoot)) return null;
  const entries = fs
    .readdirSync(resultsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory());
  if (entries.length === 0) return null;
  // Sort by name (timestamped folders) descending
  entries.sort((a, b) => b.name.localeCompare(a.name));
  return path.join(resultsRoot, entries[0].name);
}

function safeReadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const txt = fs.readFileSync(filePath, "utf8");
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

function parseAdaptationEventsFromLogs(logText, runStartTs) {
  if (!logText) return [];
  const lines = logText.split(/\r?\n/);
  const events = [];

  // Updated regex patterns to match actual log formats
  const tunerRegex = /\[TUNER\].*ADAPTED?\s*\|\s*(.*)/i;
  const forcedRegex = /\[TUNER\].*FORCED ADAPTATION\s*\|\s*(.*)/i;
  const adaptationRegex = /🎯 \[ADAPTATION\]/i;

  for (const l of lines) {
    let match = null;
    let payload = null;

    // Try different regex patterns
    if (tunerRegex.test(l)) {
      match = l.match(tunerRegex);
      if (match && match[1]) payload = match[1].trim();
    } else if (forcedRegex.test(l)) {
      match = l.match(forcedRegex);
      if (match && match[1]) payload = match[1].trim();
    } else if (adaptationRegex.test(l)) {
      // Look for the next line or extract from current line
      const adaptMatch = l.match(/🎯 \[ADAPTATION\]\s*(.*)/i);
      if (adaptMatch && adaptMatch[1]) payload = adaptMatch[1].trim();
    }

    if (!payload) continue;

    // Try to extract timestamp from the line
    const timeMatch = l.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/);
    let ts = null;
    if (timeMatch) {
      ts = Date.parse(timeMatch[1]);
    } else {
      // Look for epoch timestamp in the line
      const epochMatch = l.match(/(17\d{11,13})/);
      if (epochMatch) ts = Number(epochMatch[1]);
    }

    const evt = {
      rawLine: l,
      timestamp: ts || runStartTs || null,
      event: "ADAPTATION",
    };

    if (payload) {
      // Parse key-value pairs from payload
      const parts = payload.split("|").map((p) => p.trim());
      for (const p of parts) {
        const kv = p.split(":");
        if (kv.length < 2) continue;
        const key = kv[0].trim();
        const val = kv.slice(1).join(":").trim();

        // Normalize keys and extract final values (after → if present)
        const k = key
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");
        let finalVal = val;

        // Extract the final value from ranges like "0.5→0.5" or "10000→10000ms"
        if (val.includes("→")) {
          const parts = val.split("→");
          finalVal = parts[parts.length - 1].trim();
          // Remove units like "ms" from the end
          finalVal = finalVal.replace(/ms$/, "").replace(/s$/, "");
        }

        evt[k] = finalVal;
      }
    }

    events.push(evt);
  }

  // Sort by timestamp
  events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  return events;
}

async function generateExcelReportForRun(runPath) {
  if (!runPath || !fs.existsSync(runPath)) {
    throw new Error(`Run path not found: ${runPath}`);
  }

  const workbook = new ExcelJS.Workbook();

  // Try to read known artifacts
  const serviceAPres = safeReadJSON(
    path.join(runPath, "service-a-presentation-statistics.json")
  );
  const serviceAmetrics = fs.existsSync(
    path.join(runPath, "service-a-metrics.prom")
  )
    ? fs.readFileSync(path.join(runPath, "service-a-metrics.prom"), "utf8")
    : null;
  const serviceBstat = safeReadJSON(
    path.join(runPath, "service-b-statistics.json")
  );
  const serviceBmetrics = fs.existsSync(
    path.join(runPath, "service-b-metrics.prom")
  )
    ? fs.readFileSync(path.join(runPath, "service-b-metrics.prom"), "utf8")
    : null;
  const demoResponse = safeReadJSON(path.join(runPath, "demo-response.json"));

  // read request timeline if present
  const requestTimeline = safeReadJSON(
    path.join(runPath, "request-timeline.json")
  );

  // read compose logs to extract tuner/adaptation events
  const composeLogs = fs.existsSync(path.join(runPath, "compose-logs.txt"))
    ? fs.readFileSync(path.join(runPath, "compose-logs.txt"), "utf8")
    : null;

  // determine run start timestamp for relative times
  let runStartTs = null;
  if (Array.isArray(requestTimeline) && requestTimeline.length > 0) {
    runStartTs = requestTimeline[0].timestamp;
  } else if (demoResponse && demoResponse.executionTime) {
    runStartTs = Date.parse(demoResponse.executionTime);
  }

  // Sheet: Summary
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Key", key: "k", width: 40 },
    { header: "Value", key: "v", width: 80 },
  ];

  summarySheet.addRow({ k: "Run Path", v: runPath });
  summarySheet.addRow({ k: "Generated At", v: new Date().toISOString() });

  if (serviceAPres && serviceAPres.results) {
    summarySheet.addRow({
      k: "Service A - total demo requests",
      v: serviceAPres.results.middlewarePerformance?.totalRequests ?? "N/A",
    });
    summarySheet.addRow({
      k: "Service A - success rate",
      v: serviceAPres.results.middlewarePerformance?.successRate ?? "N/A",
    });
  }
  if (serviceBstat && serviceBstat.serviceMetrics) {
    summarySheet.addRow({
      k: "Service B - totalRequests (reported)",
      v: serviceBstat.serviceMetrics.totalRequests ?? "N/A",
    });
    summarySheet.addRow({
      k: "Service B - successRate",
      v: serviceBstat.serviceMetrics.successRate ?? "N/A",
    });
    summarySheet.addRow({
      k: "Service B - avgResponseTime",
      v: serviceBstat.serviceMetrics.averageResponseTime ?? "N/A",
    });
  }

  // Sheet: Service A presentation (if available)
  if (serviceAPres) {
    const s = workbook.addWorksheet("ServiceA_Presentation");
    s.addRow(["Field", "Value"]);
    s.addRow(["Status", serviceAPres.status || "N/A"]);
    s.addRow(["Message", serviceAPres.message || "N/A"]);
    if (serviceAPres.results && serviceAPres.results.phases) {
      s.addRow([]);
      s.addRow(["Phases summary"]);
      s.addRow([
        "Phase",
        "Requests",
        "SuccessRate",
        "FallbackRate",
        "AvgRespTime",
      ]);
      for (const ph of serviceAPres.results.phases) {
        const summ = ph.summary || {};
        s.addRow([
          ph.stateName || ph.state,
          summ.totalRequests ?? ph.requestCount ?? "N/A",
          summ.successRate ?? "N/A",
          summ.fallbackRate ?? "N/A",
          summ.averageResponseTime ?? "N/A",
        ]);
      }
    }
  }

  // Sheet: Request timeline (tabular) if available
  if (Array.isArray(requestTimeline) && requestTimeline.length > 0) {
    const rt = workbook.addWorksheet("Request_Timeline");
    rt.columns = [
      { header: "Time (seconds)", key: "t", width: 15 },
      { header: "Request ID", key: "id", width: 12 },
      { header: "System State", key: "state", width: 15 },
      { header: "Response Time (ms)", key: "rt", width: 18 },
      { header: "Result", key: "result", width: 12 },
      { header: "Used Fallback", key: "fallback", width: 12 },
      { header: "Load Factor", key: "load", width: 12 },
      { header: "Test Phase", key: "phase", width: 18 },
    ];

    // build quick phase lookup from demoResponse if present: map by loadFactor or state
    const phaseByLoad = new Map();
    const phaseByState = new Map();
    if (
      demoResponse &&
      demoResponse.results &&
      Array.isArray(demoResponse.results.phases)
    ) {
      for (const ph of demoResponse.results.phases) {
        if (ph.loadFactor !== undefined)
          phaseByLoad.set(
            String(ph.loadFactor),
            ph.stateName || ph.stateName || ph.stateName || ph.stateName
          );
        if (ph.stateName) phaseByState.set(ph.stateName, ph.stateName);
      }
    }

    const firstTs = requestTimeline[0].timestamp || runStartTs;
    for (const entry of requestTimeline) {
      const ts = entry.timestamp || null;
      const rel = firstTs && ts ? ((ts - firstTs) / 1000).toFixed(3) : "";
      const result =
        entry.response?.status ?? (entry.ok ? "SUCCESS" : "FAILURE");
      const usedFallback =
        entry.usedFallback === true
          ? "YES"
          : entry.usedFallback === false
          ? "NO"
          : entry.response?.usedFallback
          ? "YES"
          : "NO";
      let loadFactor =
        entry.loadFactor ??
        entry.response?.serviceResponse?.loadFactor ??
        entry.response?.loadFactor ??
        "";

      // Additional fallback for load factor when usedFallback is true
      if (!loadFactor && usedFallback === "YES") {
        // Try to get load factor from the response data or use a default
        loadFactor =
          entry.response?.loadFactor ??
          entry.response?.serviceResponse?.loadFactor ??
          "N/A";
      }

      if (typeof loadFactor === "number") loadFactor = String(loadFactor);

      // Enhanced state extraction with fallback handling
      let serviceState =
        entry.serviceState ??
        entry.response?.serviceResponse?.serviceState ??
        entry.response?.serviceState ??
        "";

      // If no state and used fallback, try to infer from context
      if (!serviceState && usedFallback === "YES") {
        serviceState = "FALLBACK_ACTIVE";
      }

      // Enhanced test phase detection
      let phase = entry.testPhase ?? "";
      if (!phase && entry.relativeTimeSeconds) {
        const relTime = parseFloat(entry.relativeTimeSeconds);
        const totalDuration = rel && firstTs ? rel * 5 : 3600; // estimate if unknown
        if (relTime < totalDuration * 0.2) {
          phase = "initial";
        } else if (relTime < totalDuration * 0.5) {
          phase = "ramp-up";
        } else if (relTime < totalDuration * 0.8) {
          phase = "steady-state";
        } else {
          phase = "wind-down";
        }
      }

      // If still no phase, try to determine from demoResponse phases
      if (!phase && loadFactor && phaseByLoad.has(String(loadFactor))) {
        phase = phaseByLoad.get(String(loadFactor));
      } else if (!phase && serviceState && phaseByState.has(serviceState)) {
        phase = phaseByState.get(serviceState);
      }

      // Default phase if nothing else works
      if (!phase) {
        phase = "workload";
      }

      rt.addRow({
        t: rel,
        id: entry.id ?? "",
        state: serviceState,
        rt: entry.durationMs ?? entry.duration ?? "",
        result: result,
        fallback: usedFallback,
        load: loadFactor,
        phase: phase,
      });
    }
  }

  // Sheet: Adaptation timeline (parse compose logs / tuner logs)
  const adaptationEvents = parseAdaptationEventsFromLogs(
    composeLogs,
    runStartTs
  );

  if (adaptationEvents && adaptationEvents.length > 0) {
    const at = workbook.addWorksheet("Adaptation_Timeline");
    at.columns = [
      { header: "Time (seconds)", key: "t", width: 15 },
      { header: "Adaptation Event", key: "event", width: 30 },
      { header: "Failure Threshold", key: "failure_threshold", width: 20 },
      { header: "Cooldown (s)", key: "cooldown_s", width: 12 },
      { header: "Cooldown (m)", key: "cooldown_m", width: 12 },
      { header: "Max Retries", key: "retries", width: 12 },
      { header: "Reason", key: "reason", width: 40 },
      { header: "System State", key: "state", width: 16 },
      { header: "Effective Failure Rate", key: "failure_rate", width: 16 },
      { header: "Raw", key: "raw", width: 80 },
    ];

    const startTs =
      runStartTs ||
      (adaptationEvents[0] && adaptationEvents[0].timestamp) ||
      Date.now();

    for (const e of adaptationEvents) {
      const rel =
        e.timestamp && startTs
          ? ((e.timestamp - startTs) / 1000).toFixed(3)
          : "0.000";

      // Extract values with better mapping
      const failureRate =
        e.failurerate ??
        e.failure_rate ??
        e.failure ??
        e.effective_failure_rate ??
        "";
      const threshold = e.threshold ?? e.failure_threshold ?? "";
      const cooldown = e.cooldown ?? e.cooldown_ms ?? "";
      const retries = e.retries ?? e.max_retries ?? e.maxretries ?? "";
      const reason = e.reason ?? e.scenario ?? e.message ?? "";
      const state = e.state ?? e.system_state ?? e.systemstate ?? "";

      // Convert cooldown to seconds if it's in milliseconds
      let cooldown_s = "";
      if (cooldown) {
        const numCooldown = parseFloat(cooldown);
        if (!isNaN(numCooldown)) {
          // If cooldown is > 1000, assume it's milliseconds
          cooldown_s =
            numCooldown > 1000 ? (numCooldown / 1000).toString() : cooldown;
        } else {
          cooldown_s = cooldown;
        }
      }

      at.addRow({
        t: rel,
        event: e.event || "ADAPTATION",
        failure_threshold: threshold,
        cooldown_s: cooldown_s,
        cooldown_m: cooldown_s ? (parseFloat(cooldown_s) / 60).toFixed(2) : "",
        retries: retries,
        reason: reason,
        state: state,
        failure_rate: failureRate,
        raw: e.rawLine || "",
      });
    }
  }

  // Sheet: Service B statistics (if available)
  if (serviceBstat) {
    const sb = workbook.addWorksheet("ServiceB_Statistics");
    sb.addRow(["Service B Statistics"]);
    sb.addRow([]);
    if (serviceBstat.serviceMetrics) {
      sb.addRow(["Metric", "Value"]);
      Object.entries(serviceBstat.serviceMetrics).forEach(([k, v]) =>
        sb.addRow([k, v])
      );
    }

    if (serviceBstat.markovChainMetrics) {
      sb.addRow([]);
      sb.addRow(["Markov Chain Metrics"]);
      sb.addRow(["Field", "Value"]);
      sb.addRow([
        "currentState",
        serviceBstat.markovChainMetrics.currentState || "N/A",
      ]);
      sb.addRow(["mtbf", serviceBstat.markovChainMetrics.mtbf || "N/A"]);
      sb.addRow(["mttr", serviceBstat.markovChainMetrics.mttr || "N/A"]);
    }
  }

  // Sheet: Raw Prometheus text (if present)
  if (serviceAmetrics) {
    const s = workbook.addWorksheet("service-a-metrics");
    const lines = serviceAmetrics.split(/\r?\n/);
    s.addRow(["Prometheus metrics for service-a (raw)"]);
    lines.forEach((l) => s.addRow([l]));
  }
  if (serviceBmetrics) {
    const s = workbook.addWorksheet("service-b-metrics");
    const lines = serviceBmetrics.split(/\r?\n/);
    s.addRow(["Prometheus metrics for service-b (raw)"]);
    lines.forEach((l) => s.addRow([l]));
  }

  // Save workbook
  const outName = path.join(
    runPath,
    `report_${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`
  );
  await workbook.xlsx.writeFile(outName);
  return outName;
}

(async () => {
  try {
    const argPath = process.argv[2];
    let runPath = argPath;
    if (!runPath) {
      const resultsRoot = path.join(__dirname, "experiments", "results");
      const latest = findLatestRun(resultsRoot);
      if (!latest) {
        console.error(
          "No run folders found under experiments/results. Please provide a run path."
        );
        process.exit(1);
      }
      runPath = latest;
    }

    console.log("Generating Excel report for:", runPath);
    const out = await generateExcelReportForRun(runPath);
    console.log("Report written to:", out);
  } catch (e) {
    console.error(
      "Failed to generate report:",
      e instanceof Error ? e.message : String(e)
    );
    process.exit(1);
  }
})();
