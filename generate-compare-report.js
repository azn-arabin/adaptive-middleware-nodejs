#!/usr/bin/env node
// generate-compare-report.js
// Enhanced MSc Research Comparison Tool
// Usage:
//   node generate-compare-report.js <baselineRunFolder> <adaptiveRunFolder> [out.xlsx]
//   node generate-compare-report.js --auto  # Auto-find latest runs for comparison

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

function findLatestRuns(resultsDir) {
  if (!fs.existsSync(resultsDir)) return { adaptive: null, oppsum: null };

  const entries = fs
    .readdirSync(resultsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => b.localeCompare(a)); // Latest first

  const adaptive = entries.find(
    (name) => !name.includes("opssum") && !name.includes("baseline")
  );

  const oppsum = entries.find(
    (name) => name.includes("opssum") || name.includes("baseline")
  );

  return {
    adaptive: adaptive ? path.join(resultsDir, adaptive) : null,
    oppsum: oppsum ? path.join(resultsDir, oppsum) : null,
  };
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
    if (!/ADAPTATION|ADAPTED|\[TUNER\]|\bADAPT\b|OPPSUM/i.test(l)) continue;
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

function calculatePerformanceMetrics(timeline) {
  const total = timeline.length;
  const successes = timeline.filter((r) => r.ok).length;
  const failed = total - successes;

  const durations = timeline
    .map((r) => Number(r.durationMs || r.duration || 0))
    .filter((n) => !isNaN(n));

  const throughput =
    total > 0
      ? total /
        ((timeline[timeline.length - 1]?.timestamp - timeline[0]?.timestamp) /
          1000 || 1)
      : 0;

  return {
    total,
    successes,
    failed,
    successRate: total ? ((successes / total) * 100).toFixed(2) + "%" : "N/A",
    failureRate: total ? ((failed / total) * 100).toFixed(2) + "%" : "N/A",
    avgDuration: durations.length
      ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length)
      : null,
    p50: pctile(durations, 0.5),
    p90: pctile(durations, 0.9),
    p95: pctile(durations, 0.95),
    p99: pctile(durations, 0.99),
    throughputRPS: throughput.toFixed(2),
    fallbacks: timeline.filter((r) => r.usedFallback).length,
  };
}

function summarizeRun(runPath) {
  const timeline = readRequestTimeline(runPath);
  const metrics = calculatePerformanceMetrics(timeline);
  const compose = readComposeLogs(runPath);
  const adaptations = parseAdaptationEventsFromLogs(compose);

  const runType =
    path.basename(runPath).includes("opssum") ||
    path.basename(runPath).includes("baseline")
      ? "OPPSUM (Static)"
      : "Adaptive";

  const pres =
    safeReadJSON(
      path.join(runPath, "service-a-presentation-statistics.json")
    ) || {};
  const bstat =
    safeReadJSON(path.join(runPath, "service-b-statistics.json")) || {};

  return {
    runPath,
    runType,
    ...metrics,
    adaptationCount: adaptations.length,
    presentation: pres,
    serviceB: bstat,
    adaptationEvents: adaptations,
  };
}

async function writeComparison(baselinePath, adaptivePath, outPath) {
  console.log("📊 Generating research comparison report...");
  console.log(`Baseline (OPPSUM): ${baselinePath}`);
  console.log(`Adaptive: ${adaptivePath}`);

  const baseline = summarizeRun(baselinePath);
  const adaptive = summarizeRun(adaptivePath);

  const wb = new ExcelJS.Workbook();

  // Summary Comparison Sheet
  const summary = wb.addWorksheet("Research_Comparison");
  summary.columns = [
    { header: "Metric", key: "metric", width: 35 },
    { header: "OPPSUM (Static)", key: "baseline", width: 20 },
    { header: "Adaptive Middleware", key: "adaptive", width: 20 },
    { header: "Improvement", key: "improvement", width: 15 },
    { header: "Research Notes", key: "notes", width: 40 },
  ];

  // Calculate improvements
  function calcImprovement(adaptiveVal, baselineVal, isPercentage = false) {
    if (!adaptiveVal || !baselineVal || baselineVal === 0) return "N/A";
    const improvement = (
      ((adaptiveVal - baselineVal) / baselineVal) *
      100
    ).toFixed(2);
    return `${improvement > 0 ? "+" : ""}${improvement}%`;
  }

  const improvementRows = [
    {
      metric: "🎯 SUCCESS RATE",
      baseline: baseline.successRate,
      adaptive: adaptive.successRate,
      improvement: calcImprovement(
        parseFloat(adaptive.successRate),
        parseFloat(baseline.successRate)
      ),
      notes: "Higher success rate indicates better fault tolerance",
    },
    {
      metric: "⚡ AVERAGE RESPONSE TIME (ms)",
      baseline: baseline.avgDuration,
      adaptive: adaptive.avgDuration,
      improvement: calcImprovement(adaptive.avgDuration, baseline.avgDuration),
      notes: "Lower response time indicates better performance",
    },
    {
      metric: "🔄 THROUGHPUT (req/sec)",
      baseline: baseline.throughputRPS,
      adaptive: adaptive.throughputRPS,
      improvement: calcImprovement(
        parseFloat(adaptive.throughputRPS),
        parseFloat(baseline.throughputRPS)
      ),
      notes: "Higher throughput indicates better system capacity",
    },
    {
      metric: "📊 P95 RESPONSE TIME (ms)",
      baseline: baseline.p95,
      adaptive: adaptive.p95,
      improvement: calcImprovement(adaptive.p95, baseline.p95),
      notes: "Lower P95 indicates more consistent performance",
    },
    {
      metric: "🛡️ FALLBACK USAGE",
      baseline: baseline.fallbacks,
      adaptive: adaptive.fallbacks,
      improvement: calcImprovement(adaptive.fallbacks, baseline.fallbacks),
      notes:
        "Lower fallback usage indicates better primary service utilization",
    },
    {
      metric: "🔧 ADAPTATION EVENTS",
      baseline: baseline.adaptationCount,
      adaptive: adaptive.adaptationCount,
      improvement: "N/A",
      notes: "Adaptive middleware dynamically adjusts; OPPSUM is static",
    },
  ];

  improvementRows.forEach((row) => summary.addRow(row));

  // Detailed Metrics Sheet
  const details = wb.addWorksheet("Detailed_Metrics");
  details.columns = [
    { header: "Metric", key: "m", width: 40 },
    { header: "OPPSUM (Static)", key: "b", width: 20 },
    { header: "Adaptive Middleware", key: "a", width: 20 },
  ];

  const detailRows = [
    ["Run Type", baseline.runType, adaptive.runType],
    ["Total Requests", baseline.total, adaptive.total],
    ["Successful Requests", baseline.successes, adaptive.successes],
    ["Failed Requests", baseline.failed, adaptive.failed],
    ["Success Rate", baseline.successRate, adaptive.successRate],
    ["Failure Rate", baseline.failureRate, adaptive.failureRate],
    ["Average Response Time (ms)", baseline.avgDuration, adaptive.avgDuration],
    ["Median Response Time (ms)", baseline.p50, adaptive.p50],
    ["90th Percentile (ms)", baseline.p90, adaptive.p90],
    ["95th Percentile (ms)", baseline.p95, adaptive.p95],
    ["99th Percentile (ms)", baseline.p99, adaptive.p99],
    ["Throughput (req/sec)", baseline.throughputRPS, adaptive.throughputRPS],
    ["Fallback Activations", baseline.fallbacks, adaptive.fallbacks],
    ["Adaptation Events", baseline.adaptationCount, adaptive.adaptationCount],
  ];

  detailRows.forEach((r) => details.addRow({ m: r[0], b: r[1], a: r[2] }));

  // Research Insights Sheet
  const insights = wb.addWorksheet("Research_Insights");
  insights.addRow(["🎓 MSc Research Analysis: Adaptive Middleware vs OPPSUM"]);
  insights.addRow([]);
  insights.addRow(["Key Findings:"]);
  insights.addRow([
    `1. Success Rate: ${adaptive.successRate} (Adaptive) vs ${baseline.successRate} (OPPSUM)`,
  ]);
  insights.addRow([
    `2. Average Response: ${adaptive.avgDuration}ms (Adaptive) vs ${baseline.avgDuration}ms (OPPSUM)`,
  ]);
  insights.addRow([
    `3. Adaptation Events: ${adaptive.adaptationCount} dynamic adjustments vs 0 static adjustments`,
  ]);
  insights.addRow([]);
  insights.addRow(["Research Questions Addressed:"]);
  insights.addRow([
    "Q1: Does adaptive middleware improve system resilience? " +
      (parseFloat(adaptive.successRate) > parseFloat(baseline.successRate)
        ? "YES"
        : "NO"),
  ]);
  insights.addRow([
    "Q2: Does adaptation reduce response times? " +
      (adaptive.avgDuration < baseline.avgDuration ? "YES" : "NO"),
  ]);
  insights.addRow([
    "Q3: How many adaptations occurred? " +
      adaptive.adaptationCount +
      " events",
  ]);

  await wb.xlsx.writeFile(outPath);
  console.log(`✅ Research comparison report written to: ${outPath}`);
}

// CLI Interface
(async () => {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🎓 MSc Research Comparison Tool

Usage:
  node generate-compare-report.js <oppsumRunFolder> <adaptiveRunFolder> [out.xlsx]
  node generate-compare-report.js --auto  # Auto-find latest runs
  
Examples:
  node generate-compare-report.js experiments/results/2025-xx-baseline experiments/results/2025-xx-adaptive
  node generate-compare-report.js --auto
`);
    process.exit(0);
  }

  let baselinePath, adaptivePath, outPath;

  if (args.includes("--auto")) {
    console.log("🔍 Auto-detecting latest runs...");
    const resultsDir = path.join(__dirname, "experiments", "results");
    const runs = findLatestRuns(resultsDir);

    if (!runs.oppsum || !runs.adaptive) {
      console.error("❌ Could not find both OPPSUM and Adaptive runs");
      console.log("Available runs:");
      if (runs.oppsum) console.log(`  OPPSUM: ${runs.oppsum}`);
      if (runs.adaptive) console.log(`  Adaptive: ${runs.adaptive}`);
      process.exit(1);
    }

    baselinePath = runs.oppsum;
    adaptivePath = runs.adaptive;
    outPath = path.join(
      process.cwd(),
      `research-comparison-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.xlsx`
    );
  } else if (args.length >= 2) {
    baselinePath = args[0];
    adaptivePath = args[1];
    outPath =
      args[2] ||
      path.join(
        process.cwd(),
        `comparison_${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`
      );
  } else {
    console.error(
      "❌ Usage: node generate-compare-report.js <oppsumRunFolder> <adaptiveRunFolder> [out.xlsx]"
    );
    console.error("   Or: node generate-compare-report.js --auto");
    process.exit(1);
  }

  // Validate paths
  if (!fs.existsSync(baselinePath)) {
    console.error(`❌ Baseline path not found: ${baselinePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(adaptivePath)) {
    console.error(`❌ Adaptive path not found: ${adaptivePath}`);
    process.exit(1);
  }

  try {
    await writeComparison(baselinePath, adaptivePath, outPath);
    console.log("\n🎉 Research comparison completed successfully!");
  } catch (e) {
    console.error("❌ Failed to generate comparison:", e.message);
    process.exit(1);
  }
})();
