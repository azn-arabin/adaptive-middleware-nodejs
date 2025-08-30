#!/usr/bin/env node
// generate-opssum-baseline.js
// Create a synthetic "opssum-style" baseline run folder compatible with generate-excel-report.js
// Usage: node generate-opssum-baseline.js [--durationSec=120] [--intervalMs=1000] [--failureRate=0.25] [--load=1.0]

const fs = require("fs");
const path = require("path");

function mkdirp(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function nowIso() {
  return new Date().toISOString();
}

function makeRunFolder(prefix = "opssum-baseline") {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "experiments", "results", `${ts}_${prefix}`);
  mkdirp(dir);
  return dir;
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}
function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, "utf8");
}

function generateRequestTimeline(dir, opts) {
  const {
    durationSec = 120,
    intervalMs = 1000,
    failureRate = 0.2,
    load = 1.0,
  } = opts;
  const entries = [];
  let id = 1;
  const start = Date.now();
  const end = start + durationSec * 1000;
  for (let t = start; t < end; t += intervalMs) {
    const failed = Math.random() < failureRate;
    const base = 40;
    const jitter = Math.round(Math.random() * 60);
    const failureExtra = failed ? Math.round(500 + Math.random() * 1500) : 0;
    const durationMs = Math.max(5, base + jitter + failureExtra);
    const entry = {
      id: id++,
      timestamp: t,
      durationMs,
      ok: !failed,
      response: {
        status: failed ? "FAILURE" : "SUCCESS",
        serviceResponse: {
          serviceState: failed ? "FAILING" : "HEALTHY",
          timestamp: new Date(t).toISOString(),
          loadFactor: load,
        },
      },
      serviceState: failed ? "FAILING" : "HEALTHY",
      usedFallback: failed && Math.random() < 0.5,
      loadFactor: load,
    };
    entries.push(entry);
  }
  writeJson(path.join(dir, "request-timeline.json"), entries);
  return entries;
}

function generateComposeLogs(dir, opts) {
  const { failureThreshold = 0.2, cooldownMs = 15000, maxRetries = 3 } = opts;
  const lines = [];
  lines.push(`${nowIso()} [OPSSUM] DEMO_START | static threshold baseline`);
  lines.push(
    `${nowIso()} [OPSSUM] CONFIG | FailureThreshold: ${failureThreshold} | Cooldown: ${cooldownMs}ms | Retries: ${maxRetries}`,
  );
  lines.push(
    `${nowIso()} [OPSSUM] NOTE | No dynamic adaptation (static threshold)`,
  );
  writeText(path.join(dir, "compose-logs.txt"), lines.join("\n"));
}

function generateServiceStats(dir, entries, opts) {
  const total = entries.length;
  const succ = entries.filter((e) => e.ok).length;
  const avg = Math.round(
    entries.reduce((s, e) => s + (e.durationMs || 0), 0) / Math.max(1, total),
  );
  const serviceB = {
    serviceMetrics: {
      totalRequests: total,
      successRate: ((succ / total) * 100).toFixed(2) + "%",
      averageResponseTime: `${avg}ms`,
    },
    timestamp: nowIso(),
  };
  writeJson(path.join(dir, "service-b-statistics.json"), serviceB);

  const presentation = {
    status: "SUCCESS",
    message: "Synthetic opssum baseline presentation",
    results: {
      phases: [
        {
          stateName: "HEALTHY",
          requestCount: Math.round(total * 0.8),
          loadFactor: opts.load,
        },
        {
          stateName: "FAILING",
          requestCount: Math.round(total * 0.2),
          loadFactor: opts.load,
        },
      ],
      middlewarePerformance: {
        totalRequests: total,
        successRate: serviceB.serviceMetrics.successRate,
        fallbackRequests: entries.filter((e) => e.usedFallback).length,
      },
    },
  };
  writeJson(
    path.join(dir, "service-a-presentation-statistics.json"),
    presentation,
  );
}

function generatePromFiles(dir, entries) {
  const total = entries.length;
  const succ = entries.filter((e) => e.ok).length;
  const avg = Math.round(
    entries.reduce((s, e) => s + (e.durationMs || 0), 0) / Math.max(1, total),
  );
  const a = [
    "# HELP demo_requests_total total synthetic requests",
    "# TYPE demo_requests_total counter",
    `demo_requests_total ${total}`,
    "# HELP demo_success_total successful requests",
    "# TYPE demo_success_total counter",
    `demo_success_total ${succ}`,
  ];
  writeText(path.join(dir, "service-a-metrics.prom"), a.join("\n"));
  const b = [
    "# HELP service_b_avg_response_ms synthetic avg response",
    "# TYPE service_b_avg_response_ms gauge",
    `service_b_avg_response_ms ${avg}`,
  ];
  writeText(path.join(dir, "service-b-metrics.prom"), b.join("\n"));
}

function generateWorkloadSummary(dir, entries) {
  const s = {
    requests: entries.length,
    successful: entries.filter((e) => e.ok).length,
    failed: entries.filter((e) => !e.ok).length,
    first: entries[0] || null,
    last: entries[entries.length - 1] || null,
  };
  writeJson(path.join(dir, "workload-summary.json"), s);
}

// CLI
(function main() {
  const argv = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      argv[k] = v === undefined ? true : v;
    }
  }

  const dir = makeRunFolder("opssum-baseline");
  const opts = {
    durationSec: Number(argv.durationSec || 120),
    intervalMs: Number(argv.intervalMs || 1000),
    failureRate: Number(argv.failureRate || 0.25),
    load: Number(argv.load || 1.0),
    failureThreshold: Number(argv.failureThreshold || 0.2),
    cooldownMs: Number(argv.cooldownMs || 15000),
    maxRetries: Number(argv.maxRetries || 3),
  };

  console.log("Generating synthetic opssum baseline in", dir);
  const entries = generateRequestTimeline(dir, opts);
  generateComposeLogs(dir, opts);
  generateServiceStats(dir, entries, opts);
  generatePromFiles(dir, entries);
  generateWorkloadSummary(dir, entries);
  console.log("Done. Run folder:", dir);
})();
