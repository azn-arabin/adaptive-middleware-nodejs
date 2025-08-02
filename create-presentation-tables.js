const fs = require("fs");
const path = require("path");

// Your actual data from the execution
const demoData = {
  demoMetrics: {
    totalRequests: 28,
    successfulRequests: 32,
    failedRequests: 0,
    fallbackResponses: 24,
    circuitBreakerActivations: 5,
    retryAttempts: 82,
    performanceData: [
      {
        timestamp: 1754066597393,
        state: "HEALTHY",
        duration: 81,
        success: true,
      },
      {
        timestamp: 1754066598954,
        state: "HEALTHY",
        duration: 60,
        success: true,
      },
      {
        timestamp: 1754066600504,
        state: "HEALTHY",
        duration: 50,
        success: true,
      },
      {
        timestamp: 1754066602063,
        state: "HEALTHY",
        duration: 57,
        success: true,
      },
      {
        timestamp: 1754066603614,
        state: "HEALTHY",
        duration: 51,
        success: true,
      },
      {
        timestamp: 1754066609463,
        state: "DEGRADED",
        duration: 1322,
        success: true,
      },
      {
        timestamp: 1754066612408,
        state: "DEGRADED",
        duration: 1442,
        success: true,
      },
      {
        timestamp: 1754066614103,
        state: "DEGRADED",
        duration: 194,
        success: true,
      },
      {
        timestamp: 1754066615833,
        state: "DEGRADED",
        duration: 229,
        success: true,
      },
      {
        timestamp: 1754066617537,
        state: "DEGRADED",
        duration: 207,
        success: true,
      },
      {
        timestamp: 1754066619226,
        state: "DEGRADED",
        duration: 188,
        success: true,
      },
      {
        timestamp: 1754066620974,
        state: "DEGRADED",
        duration: 247,
        success: true,
      },
      {
        timestamp: 1754066623112,
        state: "DEGRADED",
        duration: 635,
        success: true,
      },
      {
        timestamp: 1754066628628,
        state: "FAILING",
        duration: 1005,
        success: true,
      },
      {
        timestamp: 1754066631082,
        state: "FAILING",
        duration: 951,
        success: true,
      },
      {
        timestamp: 1754066640085,
        state: "FAILING",
        duration: 7502,
        success: false,
      },
      {
        timestamp: 1754066642538,
        state: "FAILING",
        duration: 951,
        success: true,
      },
      {
        timestamp: 1754066650998,
        state: "FAILING",
        duration: 6957,
        success: false,
      },
      {
        timestamp: 1754066660781,
        state: "FAILING",
        duration: 8281,
        success: false,
      },
      {
        timestamp: 1754066672508,
        state: "CRITICAL",
        duration: 8218,
        success: false,
      },
      {
        timestamp: 1754066682223,
        state: "CRITICAL",
        duration: 8212,
        success: false,
      },
      {
        timestamp: 1754066691895,
        state: "CRITICAL",
        duration: 8168,
        success: false,
      },
      {
        timestamp: 1754066701623,
        state: "CRITICAL",
        duration: 8225,
        success: false,
      },
      {
        timestamp: 1754066710119,
        state: "RECOVERING",
        duration: 4970,
        success: false,
      },
      {
        timestamp: 1754066711621,
        state: "RECOVERING",
        duration: 1,
        success: false,
      },
      {
        timestamp: 1754066713125,
        state: "RECOVERING",
        duration: 2,
        success: false,
      },
      {
        timestamp: 1754066714629,
        state: "RECOVERING",
        duration: 3,
        success: false,
      },
      {
        timestamp: 1754066716134,
        state: "RECOVERING",
        duration: 1,
        success: false,
      },
    ],
  },
};

const enhancedData = {
  results: {
    phases: [
      {
        stateName: "HEALTHY",
        requestCount: 4,
        loadFactor: 1,
        summary: {
          successfulRequests: 4,
          failedRequests: 0,
          fallbackRequests: 0,
          successRate: "100.0%",
          averageResponseTime: "159ms",
        },
      },
      {
        stateName: "DEGRADED",
        requestCount: 6,
        loadFactor: 2,
        summary: {
          successfulRequests: 6,
          failedRequests: 0,
          fallbackRequests: 0,
          successRate: "100.0%",
          averageResponseTime: "2061ms",
        },
      },
      {
        stateName: "FAILING",
        requestCount: 5,
        loadFactor: 2,
        summary: {
          successfulRequests: 3,
          failedRequests: 0,
          fallbackRequests: 2,
          successRate: "60.0%",
          averageResponseTime: "3280ms",
        },
      },
      {
        stateName: "CRITICAL",
        requestCount: 3,
        loadFactor: 2,
        summary: {
          successfulRequests: 0,
          failedRequests: 0,
          fallbackRequests: 3,
          successRate: "0.0%",
          averageResponseTime: "8245ms",
        },
      },
      {
        stateName: "RECOVERING",
        requestCount: 4,
        loadFactor: 0.5,
        summary: {
          successfulRequests: 3,
          failedRequests: 0,
          fallbackRequests: 1,
          successRate: "75.0%",
          averageResponseTime: "2851ms",
        },
      },
    ],
    markovStatistics: {
      stateTransitions: {
        "HEALTHY->DEGRADED": 2,
        "DEGRADED->HEALTHY": 1,
        "HEALTHY->FAILING": 1,
        "FAILING->HEALTHY": 1,
        "DEGRADED->FAILING": 2,
        "FAILING->DEGRADED": 2,
        "DEGRADED->CRITICAL": 1,
        "CRITICAL->RECOVERING": 1,
        "RECOVERING->FAILING": 1,
      },
    },
  },
};

// Generate CSV files for Excel import
function generateCSVTables() {
  // TABLE 1: Request Performance Over Time by System State
  console.log("\n📊 TABLE 1: Request Performance Over Time by System State");
  console.log("=".repeat(80));

  let table1CSV =
    "Request_ID,Timestamp,Time_Elapsed_Sec,System_State,Duration_ms,Success,Response_Type\n";

  const startTime = demoData.demoMetrics.performanceData[0].timestamp;

  demoData.demoMetrics.performanceData.forEach((entry, index) => {
    const timeElapsed = ((entry.timestamp - startTime) / 1000).toFixed(1);
    const responseType = entry.success ? "SUCCESS" : "FALLBACK";

    table1CSV += `${index + 1},${entry.timestamp},${timeElapsed},${entry.state},${entry.duration},${entry.success},${responseType}\n`;
  });

  fs.writeFileSync("Table1_Request_Performance_Timeline.csv", table1CSV);
  console.log("✅ Created: Table1_Request_Performance_Timeline.csv");

  // TABLE 2: Markov State Analysis & Middleware Adaptation
  console.log("\n📈 TABLE 2: Markov State Analysis & Middleware Adaptation");
  console.log("=".repeat(80));

  let table2CSV =
    "Markov_State,Request_Count,Load_Factor,Success_Rate,Fallback_Rate,Avg_Response_Time_ms,Failure_Probability\n";

  // State-based failure probabilities from Markov model
  const failureRates = {
    HEALTHY: 0.05,
    DEGRADED: 0.25,
    FAILING: 0.6,
    CRITICAL: 0.9,
    RECOVERING: 0.35,
  };

  enhancedData.results.phases.forEach((phase) => {
    const successRate = parseFloat(phase.summary.successRate.replace("%", ""));
    const fallbackRate = parseFloat(
      phase.summary.fallbackRate || "0%".replace("%", ""),
    );
    const avgResponseTime = parseFloat(
      phase.summary.averageResponseTime.replace("ms", ""),
    );
    const failureProb = failureRates[phase.stateName];

    table2CSV += `${phase.stateName},${phase.requestCount},${phase.loadFactor},${successRate}%,${fallbackRate}%,${avgResponseTime},${failureProb}\n`;
  });

  fs.writeFileSync("Table2_Markov_State_Analysis.csv", table2CSV);
  console.log("✅ Created: Table2_Markov_State_Analysis.csv");

  // TABLE 3: State Transition Matrix (Bonus for academic rigor)
  console.log("\n🔄 TABLE 3: Markov Transition Matrix");
  console.log("=".repeat(80));

  let table3CSV =
    "From_State,To_HEALTHY,To_DEGRADED,To_FAILING,To_CRITICAL,To_RECOVERING\n";

  // Actual transition probabilities from your implementation
  const transitionMatrix = {
    HEALTHY: [0.85, 0.12, 0.03, 0.0, 0.0],
    DEGRADED: [0.3, 0.5, 0.18, 0.02, 0.0],
    FAILING: [0.0, 0.25, 0.45, 0.25, 0.05],
    CRITICAL: [0.0, 0.0, 0.05, 0.7, 0.25],
    RECOVERING: [0.4, 0.35, 0.05, 0.0, 0.2],
  };

  Object.entries(transitionMatrix).forEach(([state, probs]) => {
    table3CSV += `${state},${probs.join(",")}\n`;
  });

  fs.writeFileSync("Table3_Transition_Matrix.csv", table3CSV);
  console.log("✅ Created: Table3_Transition_Matrix.csv");

  // TABLE 4: Middleware Adaptation Timeline
  console.log("\n⚙️ TABLE 4: Middleware Adaptation Timeline");
  console.log("=".repeat(80));

  let table4CSV =
    "Time_Sec,System_State,Failure_Rate,Threshold,Cooldown_ms,Retries,Adaptation_Reason\n";

  // Sample adaptation timeline based on your logs
  const adaptationEvents = [
    {
      time: 0,
      state: "HEALTHY",
      failureRate: 0.05,
      threshold: 0.1,
      cooldown: 15000,
      retries: 1,
      reason: "Initial_Config",
    },
    {
      time: 12,
      state: "DEGRADED",
      failureRate: 0.25,
      threshold: 0.15,
      cooldown: 20000,
      retries: 2,
      reason: "Degradation_Detected",
    },
    {
      time: 31,
      state: "FAILING",
      failureRate: 0.6,
      threshold: 0.2,
      cooldown: 25000,
      retries: 3,
      reason: "High_Failure_Rate",
    },
    {
      time: 75,
      state: "CRITICAL",
      failureRate: 0.9,
      threshold: 0.25,
      cooldown: 30000,
      retries: 3,
      reason: "Critical_State",
    },
    {
      time: 113,
      state: "RECOVERING",
      failureRate: 0.35,
      threshold: 0.15,
      cooldown: 22000,
      retries: 2,
      reason: "Recovery_Mode",
    },
  ];

  adaptationEvents.forEach((event) => {
    table4CSV += `${event.time},${event.state},${event.failureRate},${event.threshold},${event.cooldown},${event.retries},${event.reason}\n`;
  });

  fs.writeFileSync("Table4_Adaptation_Timeline.csv", table4CSV);
  console.log("✅ Created: Table4_Adaptation_Timeline.csv");

  // Print summary for presentation
  console.log("\n🎓 PRESENTATION SUMMARY");
  console.log("=".repeat(80));
  console.log("📁 Files Created:");
  console.log("   • Table1_Request_Performance_Timeline.csv");
  console.log("   • Table2_Markov_State_Analysis.csv");
  console.log("   • Table3_Transition_Matrix.csv");
  console.log("   • Table4_Adaptation_Timeline.csv");
  console.log("\n📊 Graphs to Create in Excel:");
  console.log("   1. Response Time vs System State (Table 1)");
  console.log("   2. Success Rate by Markov State (Table 2)");
  console.log("   3. Heatmap of Transition Matrix (Table 3)");
  console.log("   4. Adaptation Parameter Changes Over Time (Table 4)");
  console.log("\n🎯 Key Academic Points:");
  console.log("   • Markov Chain replaces random failures");
  console.log("   • 5-state model with realistic transitions");
  console.log("   • Load factor influences failure probabilities");
  console.log("   • Middleware adapts thresholds based on state");
  console.log("   • MTBF/MTTR metrics demonstrate reliability");
}

// Answer the difference between test phase and system state
console.log("\n❓ DIFFERENCE: Test Phase vs System State");
console.log("=".repeat(80));
console.log("🧪 TEST PHASE: Your controlled demonstration phases");
console.log("   - HEALTHY phase: 4 requests with load factor 1.0");
console.log("   - DEGRADED phase: 6 requests with load factor 2.0");
console.log("   - FAILING phase: 5 requests with load factor 2.0");
console.log("   - CRITICAL phase: 3 requests with load factor 2.0");
console.log("   - RECOVERING phase: 4 requests with load factor 0.5");
console.log("\n🎭 SYSTEM STATE: Markov Chain current internal state");
console.log(
  "   - Service-B internal state (HEALTHY/DEGRADED/FAILING/CRITICAL/RECOVERING)",
);
console.log("   - Changes based on transition probabilities");
console.log(
  "   - Can differ from test phase (e.g., DEGRADED phase → FAILING state)",
);
console.log("\n📝 Academic Note: Test phases force load conditions,");
console.log(
  "   but Markov states evolve naturally based on probability matrix",
);

generateCSVTables();
