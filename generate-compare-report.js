#!/usr/bin/env node
// generate-compare-report.js
// Usage: node generate-compare-report.js <baselineRunFolder> <adaptiveRunFolder> [out.xlsx]
// Produces an XLSX with side-by-side summary metrics for quick comparison.

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return null;
  }
}

function readRequestTimeline(runPath) {
  const p = path.join(runPath, "request-timeline.json");
  return safeReadJSON(p) || [];
}

function readComposeLogs(runPath) {
  const p = path.join(runPath, "compose-logs.txt");
  try {
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    return null;
  }
}

function parseAdaptationEventsFromLogs(logText) {
  if (!logText) return [];
  const lines = logText.split(/\r?\n/);
  const events = [];
  const isoRe =
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/;
  for (const l of lines) {
    if (!/ADAPTATION|ADAPTED|\[TUNER\]|\bADAPT\b/i.test(l)) continue;
    const tm = l.match(isoRe);
    const ts = tm ? Date.parse(tm[1]) : null;
    events.push({ raw: l, timestamp: ts });
  }
  events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  return events;
}

function pctile(arr, p) {
  if (!arr || arr.length === 0) return null;
  const a = arr.slice().sort((x, y) => x - y);
  const idx = (a.length - 1) * p;
  const lo = Math.floor(idx),
    hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  return a[lo] * (hi - idx) + a[hi] * (idx - lo);
}

function summarizeRun(runPath) {
  const timeline = readRequestTimeline(runPath);
  const total = timeline.length;
  const successes = timeline.filter((r) => r.ok).length;
  const failed = total - successes;
  const durations = timeline
    .map((r) => Number(r.durationMs || r.duration || 0))
    .filter((n) => !isNaN(n));
  const p50 = pctile(durations, 0.5);
  const p90 = pctile(durations, 0.9);
  const p99 = pctile(durations, 0.99);
  const avg = durations.length
    ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length)
    : null;
  const fallback = timeline.filter((r) => r.usedFallback).length;
  const compose = readComposeLogs(runPath);
  const adaptations = parseAdaptationEventsFromLogs(compose);
  const pres =
    safeReadJSON(
      path.join(runPath, "service-a-presentation-statistics.json"),
    ) || {};
  const bstat =
    safeReadJSON(path.join(runPath, "service-b-statistics.json")) || {};
  return {
    runPath,
    total,
    successes,
    failed,
    successRate: total ? ((successes / total) * 100).toFixed(2) + "%" : "N/A",
    avg,
    p50,
    p90,
    p99,
    fallback,
    adaptationCount: adaptations.length,
    presentation: pres,
    serviceB: bstat,
  };
}

async function writeComparison(baselinePath, adaptivePath, outPath) {
  const base = summarizeRun(baselinePath);
  const adapt = summarizeRun(adaptivePath);

  const wb = new ExcelJS.Workbook();
  const s = wb.addWorksheet("SummaryComparison");
  s.columns = [
    { header: "Metric", key: "m", width: 40 },
    { header: "Baseline", key: "b", width: 20 },
    { header: "Adaptive", key: "a", width: 20 },
  ];
  const rows = [
    ["Run Path", base.runPath, adapt.runPath],
    ["Total Requests", base.total, adapt.total],
    ["Successful", base.successes, adapt.successes],
    ["Failed", base.failed, adapt.failed],
    ["Success Rate", base.successRate, adapt.successRate],
    ["Avg Response (ms)", base.avg, adapt.avg],
    ["p50 (ms)", base.p50, adapt.p50],
    ["p90 (ms)", base.p90, adapt.p90],
    ["p99 (ms)", base.p99, adapt.p99],
    ["Fallbacks", base.fallback, adapt.fallback],
    ["Adaptation Events", base.adaptationCount, adapt.adaptationCount],
  ];
  rows.forEach((r) => s.addRow({ m: r[0], b: r[1], a: r[2] }));

  // add sheets with a few raw fields
  const ba = wb.addWorksheet("Baseline_Presentation");
  ba.addRow(["Presentation JSON (partial)"]);
  ba.addRow([]);
  ba.addRow(["Key", "Value"]);
  Object.entries(base.presentation || {})
    .slice(0, 20)
    .forEach(([k, v]) =>
      ba.addRow([k, typeof v === "object" ? JSON.stringify(v) : String(v)]),
    );

  const aa = wb.addWorksheet("Adaptive_Presentation");
  aa.addRow(["Presentation JSON (partial)"]);
  aa.addRow([]);
  aa.addRow(["Key", "Value"]);
  Object.entries(adapt.presentation || {})
    .slice(0, 20)
    .forEach(([k, v]) =>
      aa.addRow([k, typeof v === "object" ? JSON.stringify(v) : String(v)]),
    );

  await wb.xlsx.writeFile(outPath);
}

// CLI
(async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: node generate-compare-report.js <baselineRunFolder> <adaptiveRunFolder> [out.xlsx]",
    );
    process.exit(1);
  }
  const baseline = args[0];
  const adaptive = args[1];
  const out =
    args[2] ||
    path.join(
      process.cwd(),
      `comparison_${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`,
    );
  try {
    await writeComparison(baseline, adaptive, out);
    console.log("Comparison written to", out);
  } catch (e) {
    console.error(
      "Failed to write comparison:",
      e && e.message ? e.message : e,
    );
    process.exit(1);
  }
})();
