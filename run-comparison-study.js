#!/usr/bin/env node
// run-comparison-study.js
// MSc Research Comparison Framework: Adaptive Middleware vs OPPSUM (Static Configuration)
// This script runs both adaptive and static OPPSUM experiments for direct comparison

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🎓 MSc Research Comparison Study: Adaptive vs OPPSUM");
console.log("=".repeat(60));

// Configuration for the comparison study
const studyConfig = {
  // Duration for each experiment (6 hours for full study)
  durationSec: 21600, // 6 hours for full research data
  // durationSec: 300,   // 5 minutes for quick testing

  // Test scenarios to compare
  scenarios: [
    {
      name: "low_failure",
      failureRate: 0.15,
      description: "Low failure rate scenario (15%)",
    },
    {
      name: "medium_failure",
      failureRate: 0.35,
      description: "Medium failure rate scenario (35%)",
    },
    {
      name: "high_failure",
      failureRate: 0.55,
      description: "High failure rate scenario (55%)",
    },
  ],

  // Static OPPSUM configurations to test
  oppsumConfigs: [
    {
      name: "conservative",
      failureThreshold: 0.3,
      cooldownMs: 20000,
      maxRetries: 2,
      description: "Conservative static configuration",
    },
    {
      name: "moderate",
      failureThreshold: 0.5,
      cooldownMs: 10000,
      maxRetries: 3,
      description: "Moderate static configuration",
    },
    {
      name: "aggressive",
      failureThreshold: 0.7,
      cooldownMs: 5000,
      maxRetries: 4,
      description: "Aggressive static configuration",
    },
  ],
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(cmd, description) {
  console.log(`\n🔧 ${description}`);
  console.log(`Command: ${cmd}`);
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function runAdaptiveExperiment(scenario) {
  console.log(`\n📈 Running ADAPTIVE experiment: ${scenario.description}`);

  // Update scenarios.json for this experiment
  const scenariosPath = path.join(__dirname, "experiments", "scenarios.json");
  const scenarios = JSON.parse(fs.readFileSync(scenariosPath, "utf8"));
  scenarios.runDurationSec = studyConfig.durationSec;
  scenarios.generateExcelReport = true;
  fs.writeFileSync(scenariosPath, JSON.stringify(scenarios, null, 2));

  // Run the adaptive experiment
  const success = runCommand(
    "node experiments/runner.js",
    `Adaptive experiment: ${scenario.name}`
  );

  if (success) {
    console.log(`✅ Adaptive experiment ${scenario.name} completed`);
    return true;
  } else {
    console.log(`❌ Adaptive experiment ${scenario.name} failed`);
    return false;
  }
}

async function runOppsumExperiment(scenario, oppsumConfig) {
  console.log(
    `\n📊 Running OPPSUM experiment: ${scenario.description} with ${oppsumConfig.description}`
  );

  const cmd = `node generate-opssum-baseline.js --durationSec=${studyConfig.durationSec} --failureRate=${scenario.failureRate} --failureThreshold=${oppsumConfig.failureThreshold} --cooldownMs=${oppsumConfig.cooldownMs} --maxRetries=${oppsumConfig.maxRetries}`;

  const success = runCommand(
    cmd,
    `OPPSUM baseline: ${scenario.name}_${oppsumConfig.name}`
  );

  if (success) {
    console.log(
      `✅ OPPSUM experiment ${scenario.name}_${oppsumConfig.name} completed`
    );
    return true;
  } else {
    console.log(
      `❌ OPPSUM experiment ${scenario.name}_${oppsumConfig.name} failed`
    );
    return false;
  }
}

async function generateComparisonReport() {
  console.log(`\n📋 Generating comparison report...`);

  const success = runCommand(
    "node generate-compare-report.js",
    "Generating comparison analysis"
  );

  if (success) {
    console.log(`✅ Comparison report generated`);
  } else {
    console.log(`❌ Comparison report generation failed`);
  }
}

async function runFullStudy() {
  const timestamp = createTimestamp();
  console.log(`\n🚀 Starting full comparison study at ${timestamp}`);
  console.log(
    `Duration per experiment: ${studyConfig.durationSec} seconds (${(
      studyConfig.durationSec / 3600
    ).toFixed(1)} hours)`
  );

  const results = {
    studyTimestamp: timestamp,
    adaptive: [],
    oppsum: [],
    failed: [],
  };

  // Run experiments for each scenario
  for (const scenario of studyConfig.scenarios) {
    console.log(`\n🔍 Testing scenario: ${scenario.description}`);

    // 1. Run Adaptive Experiment
    const adaptiveSuccess = await runAdaptiveExperiment(scenario);
    if (adaptiveSuccess) {
      results.adaptive.push(`${scenario.name}_adaptive`);
    } else {
      results.failed.push(`${scenario.name}_adaptive`);
    }

    // 2. Run OPPSUM Experiments (all configurations)
    for (const oppsumConfig of studyConfig.oppsumConfigs) {
      const oppsumSuccess = await runOppsumExperiment(scenario, oppsumConfig);
      if (oppsumSuccess) {
        results.oppsum.push(`${scenario.name}_${oppsumConfig.name}`);
      } else {
        results.failed.push(`${scenario.name}_${oppsumConfig.name}`);
      }

      // Brief pause between experiments
      await wait(2000);
    }

    console.log(`\n✅ Scenario ${scenario.name} completed`);
  }

  // 3. Generate comparison analysis
  await generateComparisonReport();

  // 4. Save study results summary
  const summaryPath = path.join(__dirname, `study-summary-${timestamp}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  console.log(`\n🎉 STUDY COMPLETED!`);
  console.log(`Summary saved to: ${summaryPath}`);
  console.log(`\n📊 Results:`);
  console.log(`- Adaptive experiments: ${results.adaptive.length}`);
  console.log(`- OPPSUM experiments: ${results.oppsum.length}`);
  console.log(`- Failed experiments: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed experiments:`);
    results.failed.forEach((failed) => console.log(`  - ${failed}`));
  }
}

// CLI interface
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node run-comparison-study.js [options]

Options:
  --quick        Run quick 5-minute experiments for testing
  --adaptive     Run only adaptive experiments  
  --oppsum       Run only OPPSUM experiments
  --help, -h     Show this help

Examples:
  node run-comparison-study.js --quick    # Quick test run
  node run-comparison-study.js            # Full 6-hour study
  node run-comparison-study.js --adaptive # Only adaptive experiments
`);
  process.exit(0);
}

if (args.includes("--quick")) {
  studyConfig.durationSec = 300; // 5 minutes for testing
  console.log("🚀 Quick test mode: 5-minute experiments");
}

// Run the appropriate experiments
if (args.includes("--adaptive")) {
  console.log("🔬 Running only ADAPTIVE experiments");
  (async () => {
    for (const scenario of studyConfig.scenarios) {
      await runAdaptiveExperiment(scenario);
    }
    console.log("✅ All adaptive experiments completed");
  })();
} else if (args.includes("--oppsum")) {
  console.log("🔬 Running only OPPSUM experiments");
  (async () => {
    for (const scenario of studyConfig.scenarios) {
      for (const oppsumConfig of studyConfig.oppsumConfigs) {
        await runOppsumExperiment(scenario, oppsumConfig);
      }
    }
    console.log("✅ All OPPSUM experiments completed");
  })();
} else {
  // Run full study
  runFullStudy().catch((error) => {
    console.error("❌ Study failed:", error);
    process.exit(1);
  });
}
