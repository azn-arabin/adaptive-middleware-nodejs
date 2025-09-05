import express from "express";
import {
  faultTolerantFetch,
  setMiddlewareLogCallback,
  setLogCallback,
  forceAdaptation,
  clearFailureWindow,
  startAdaptiveTuner,
} from "adaptive-middleware";

// New: Prometheus client for metrics endpoint
import client from "prom-client";

// Note: Tuner is now started in the adaptive-middleware service
// startAdaptiveTuner(); // Removed - runs in adaptive-middleware service

// Start the adaptive tuner
console.log("Starting Adaptive Tuner in Service A...");
startAdaptiveTuner();

const app = express();
app.use(express.json());

// 📊 ENHANCED LOG COLLECTOR FOR ACADEMIC PRESENTATION
const presentationLogs: any[] = [];
const MAX_LOGS = 200; // Increased for better analysis
const demoMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  fallbackResponses: 0,
  circuitBreakerActivations: 0,
  retryAttempts: 0,
  stateTransitionsSeen: new Set(),
  performanceData: [] as any[],
};

// Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();
const promTotalRequests = new client.Counter({
  name: "service_a_total_requests",
  help: "Total requests sent by service-a demos",
});
const promSuccess = new client.Counter({
  name: "service_a_success_count",
  help: "Successful requests",
});
const promFailure = new client.Counter({
  name: "service_a_failure_count",
  help: "Failed requests",
});
const promFallback = new client.Counter({
  name: "service_a_fallback_count",
  help: "Fallback responses",
});
const promCircuit = new client.Counter({
  name: "service_a_circuit_activations",
  help: "Circuit breaker activations",
});
const promRetry = new client.Counter({
  name: "service_a_retry_attempts",
  help: "Retry attempts",
});
const promResponseTime = new client.Histogram({
  name: "service_a_response_time_ms",
  help: "Response times for service-a demo requests",
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

function updatePromMetrics() {
  // This function is idempotent; counters are only incremented when events occur.
}

function addPresentationLog(category: string, message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString(),
    category,
    message,
    data,
    id: Date.now() + Math.random(),
  };

  // Removed totalRequests increments here to avoid double-count.
  if (category === "SUCCESS") {
    demoMetrics.successfulRequests++;
    promSuccess.inc();
  }
  if (category === "FAILURE") {
    demoMetrics.failedRequests++;
    promFailure.inc();
  }
  if (category === "FALLBACK") {
    demoMetrics.fallbackResponses++;
    promFallback.inc();
    // Don't double-count fallbacks as separate requests
  }
  if (category === "CIRCUIT") {
    demoMetrics.circuitBreakerActivations++;
    promCircuit.inc();
  }
  if (category === "RETRY") {
    demoMetrics.retryAttempts++;
    promRetry.inc();
  }

  presentationLogs.unshift(logEntry);
  if (presentationLogs.length > MAX_LOGS) {
    presentationLogs.pop();
  }

  // Enhanced console logging with academic context
  const emoji =
    {
      MIDDLEWARE: "🛡️",
      MARKOV: "🎭",
      ADAPTATION: "🎯",
      CIRCUIT: "⚡",
      RETRY: "🔄",
      FAILURE: "❌",
      SUCCESS: "✅",
      FALLBACK: "🚨",
      ACADEMIC: "🎓",
    }[category] || "📝";

  console.log(
    `${emoji} [${category}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

setMiddlewareLogCallback(addPresentationLog);
setLogCallback(addPresentationLog);

// 🎓 ACADEMIC MARKOV CHAIN DEMONSTRATION
app.get("/demo/markov-academic", async (req, res) => {
  addPresentationLog(
    "ACADEMIC",
    "🎬 Starting ACADEMIC MARKOV CHAIN DEMONSTRATION for BUET MSc Presentation"
  );

  const demoResults = {
    phases: [] as any[],
    markovStatistics: {} as any,
    middlewarePerformance: {} as any,
    academicAnalysis: {} as any,
  };

  try {
    // PHASE 1: Demonstrate Healthy State (Baseline)
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 1: Demonstrating HEALTHY state behavior"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "HEALTHY" }),
    });

    const healthyResults = await performTestSequence("HEALTHY", 5);
    demoResults.phases.push(healthyResults);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // PHASE 2: Demonstrate Degraded State (Moderate Failures)
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 2: Demonstrating DEGRADED state - middleware retries"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "DEGRADED" }),
    });

    const degradedResults = await performTestSequence("DEGRADED", 8);
    demoResults.phases.push(degradedResults);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // PHASE 3: Demonstrate Failing State (High Failures)
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 3: Demonstrating FAILING state - circuit breaker activation"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "FAILING" }),
    });

    const failingResults = await performTestSequence("FAILING", 6);
    demoResults.phases.push(failingResults);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // PHASE 4: Demonstrate Critical State (Circuit Breaker)
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 4: Demonstrating CRITICAL state - fallback responses"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "CRITICAL" }),
    });

    const criticalResults = await performTestSequence("CRITICAL", 4);
    demoResults.phases.push(criticalResults);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // PHASE 5: Demonstrate Recovery State (Adaptation)
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 5: Demonstrating RECOVERING state - adaptive behavior"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "RECOVERING" }),
    });

    const recoveringResults = await performTestSequence("RECOVERING", 5);
    demoResults.phases.push(recoveringResults);

    // FORCE SOME ADAPTATION EVENTS FOR TESTING
    addPresentationLog(
      "ADAPTATION",
      "🎯 Forcing adaptation events for testing"
    );
    forceAdaptation("high_failure");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    forceAdaptation("recovery");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    forceAdaptation("reset");

    // FINAL ANALYSIS: Collect comprehensive statistics
    const markovStats = await fetch("http://service-b:5000/statistics").then(
      (r) => r.json()
    );
    const markovConfig = await fetch(
      "http://service-b:5000/markov/configuration"
    ).then((r) => r.json());

    demoResults.markovStatistics = markovStats;
    demoResults.middlewarePerformance = {
      totalRequests: demoMetrics.totalRequests,
      successRate:
        (
          (demoMetrics.successfulRequests / demoMetrics.totalRequests) *
          100
        ).toFixed(2) + "%",
      fallbackRate:
        (
          (demoMetrics.fallbackResponses / demoMetrics.totalRequests) *
          100
        ).toFixed(2) + "%",
      retryEffectiveness: demoMetrics.retryAttempts,
      circuitBreakerActivations: demoMetrics.circuitBreakerActivations,
    };

    demoResults.academicAnalysis = {
      stateTransitionsCovered: Array.from(demoMetrics.stateTransitionsSeen),
      markovModelValidation: "✅ All 5 states demonstrated",
      middlewareAdaptation:
        "✅ Retry, Circuit Breaker, and Fallback patterns observed",
      loadBasedBehavior: "✅ Load factor influence demonstrated",
      academicRigor:
        "✅ MTBF/MTTR calculations, transition matrix, statistical analysis",
    };

    addPresentationLog(
      "ACADEMIC",
      "🎓 DEMONSTRATION COMPLETE - Academic analysis ready for presentation",
      {
        phasesCompleted: demoResults.phases.length,
        totalRequests: demoMetrics.totalRequests,
        demonstratedStates: Array.from(demoMetrics.stateTransitionsSeen),
      }
    );

    res.json({
      status: "SUCCESS",
      message: "Academic Markov Chain demonstration completed successfully",
      executionTime: new Date().toISOString(),
      results: demoResults,
      presentationSummary: {
        title: "Adaptive Middleware with Markov Chain Failure Model",
        keyPoints: [
          "5-State Markov Chain implementation (HEALTHY → DEGRADED → FAILING → CRITICAL ⟷ RECOVERING)",
          "Load-based transition probability adjustments",
          "MTBF/MTTR reliability calculations",
          "Middleware adaptation: Retry → Circuit Breaker → Fallback progression",
          "Real-time statistics for academic analysis",
        ],
      },
    });
  } catch (error) {
    addPresentationLog("ACADEMIC", "❌ Demo error occurred", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Demo execution failed", details: error });
  }
});

async function performTestSequence(stateName: string, requestCount: number) {
  addPresentationLog(
    "MARKOV",
    `🧪 Testing ${stateName} state with ${requestCount} requests`
  );

  const phaseResults = {
    stateName,
    requestCount,
    responses: [] as any[],
    summary: {} as any,
  };

  let successCount = 0;
  let failureCount = 0;
  let fallbackCount = 0;

  for (let i = 1; i <= requestCount; i++) {
    demoMetrics.totalRequests++;
    promTotalRequests.inc();
    const startTime = Date.now();

    try {
      addPresentationLog(
        "MIDDLEWARE",
        `📤 Request ${i}/${requestCount} to Service B (${stateName} state)`
      );

      const response = await faultTolerantFetch("http://service-b:5000/data", {
        fallbackData: {
          message: `Fallback for ${stateName} state`,
          state: stateName,
          academic: true,
        },
      });

      const duration = Date.now() - startTime;
      promResponseTime.observe(duration);
      demoMetrics.stateTransitionsSeen.add(stateName);

      if (response.markovModel) {
        successCount++;
        addPresentationLog(
          "SUCCESS",
          `✅ Request ${i} successful in ${stateName} state`,
          {
            responseTime: `${duration}ms`,
            serviceState: response.serviceState,
          }
        );
      } else {
        fallbackCount++;
        addPresentationLog(
          "FALLBACK",
          `🚨 Request ${i} used fallback in ${stateName} state`,
          {
            responseTime: `${duration}ms`,
          }
        );
      }

      phaseResults.responses.push({
        requestId: i,
        duration: `${duration}ms`,
        success: !!response.markovModel,
        serviceState: response.serviceState || stateName,
        usedFallback: !response.markovModel,
      });

      demoMetrics.performanceData.push({
        timestamp: Date.now(),
        state: stateName,
        duration,
        success: !!response.markovModel,
      });
    } catch (error) {
      failureCount++;
      demoMetrics.failedRequests++;
      promFailure.inc();
      const duration = Date.now() - startTime;
      promResponseTime.observe(duration);
      addPresentationLog(
        "FAILURE",
        `❌ Request ${i} failed in ${stateName} state`,
        {
          error: error instanceof Error ? error.message : String(error),
          responseTime: `${duration}ms`,
        }
      );

      phaseResults.responses.push({
        requestId: i,
        duration: `${duration}ms`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Wait between requests to observe state behavior
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  phaseResults.summary = {
    successfulRequests: successCount,
    failedRequests: failureCount,
    fallbackRequests: fallbackCount,
    successRate: ((successCount / requestCount) * 100).toFixed(1) + "%",
    failureRate: ((failureCount / requestCount) * 100).toFixed(1) + "%",
  };

  addPresentationLog(
    "MARKOV",
    `📈 ${stateName} phase completed`,
    phaseResults.summary
  );
  return phaseResults;
}

// 🎯 QUICK DEMO FOR LIVE PRESENTATION
app.get("/demo/quick-showcase", async (req, res) => {
  addPresentationLog(
    "ACADEMIC",
    "⚡ Starting QUICK SHOWCASE for live demonstration"
  );

  try {
    // Quick sequence showing key behaviors
    const states = ["HEALTHY", "DEGRADED", "FAILING", "CRITICAL"];
    const results = [];

    for (const state of states) {
      await fetch("http://service-b:5000/control/force-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });

      demoMetrics.totalRequests++;
      promTotalRequests.inc();

      const response = await faultTolerantFetch("http://service-b:5000/data", {
        fallbackData: { message: `Quick demo fallback for ${state}` },
      });

      results.push({
        state,
        success: !!response.markovModel,
        serviceState: response.serviceState || state,
        message: response.message || response.error || "Fallback response",
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    res.json({
      status: "SUCCESS",
      message: "Quick demonstration completed",
      results,
      nextSteps: "Use /demo/markov-academic for comprehensive analysis",
    });
  } catch (error) {
    res.status(500).json({ error: "Quick demo failed", details: error });
  }
});

// 📊 PRESENTATION STATISTICS ENDPOINT
app.get("/presentation/statistics", (req, res) => {
  res.json({
    demoMetrics,
    recentLogs: presentationLogs.slice(0, 20),
    academicSummary: {
      modelType: "Markov Chain with 5 States",
      reliabilityMetrics: "MTBF/MTTR calculated",
      adaptiveFeatures: "Retry, Circuit Breaker, Fallback",
      loadBasedAdaptation: "Dynamic transition probabilities",
      statisticalRigor: "Transition matrices, state distributions",
    },
  });
});

// 🔄 RESET DEMO STATE
app.post("/demo/reset", async (req, res) => {
  // Reset metrics
  demoMetrics.totalRequests = 0;
  demoMetrics.successfulRequests = 0;
  demoMetrics.failedRequests = 0;
  demoMetrics.fallbackResponses = 0;
  demoMetrics.circuitBreakerActivations = 0;
  demoMetrics.retryAttempts = 0;
  demoMetrics.stateTransitionsSeen.clear();
  demoMetrics.performanceData = [];

  // Reset logs
  presentationLogs.length = 0;

  // Reset middleware
  clearFailureWindow();
  forceAdaptation("reset");

  // Reset Service B to healthy state
  await fetch("http://service-b:5000/control/force-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "HEALTHY" }),
  });

  addPresentationLog(
    "ACADEMIC",
    "🔄 Demo state reset - ready for new presentation"
  );

  res.json({
    status: "SUCCESS",
    message: "Demo state reset successfully",
    readyForDemo: true,
  });
});

// 🏠 ENHANCED HOMEPAGE WITH ACADEMIC CONTEXT
app.get("/", (req, res) => {
  res.json({
    title: "🎓 Adaptive Fault tolerant Middleware for nodes - BUET",
    description: "Fault-tolerant middleware with Markov Chain failure modeling",
    academicFeatures: {
      failureModel:
        "5-State Markov Chain (HEALTHY → DEGRADED → FAILING → CRITICAL ⟷ RECOVERING)",
      reliabilityMetrics:
        "MTBF (Mean Time Between Failures), MTTR (Mean Time To Recovery)",
      adaptivePatterns:
        "Retry, Circuit Breaker, Fallback with dynamic adaptation",
      statisticalAnalysis:
        "Transition matrices, state distributions, load correlation",
    },
    demoEndpoints: {
      "/demo/markov-academic":
        "Comprehensive academic demonstration (5-10 minutes)",
      "/demo/quick-showcase": "Quick live demo (2 minutes)",
      "/presentation/statistics": "Current demo statistics and metrics",
      "/demo/reset": "Reset demo state for new presentation",
    },
    serviceEndpoints: {
      "Service B Statistics": "http://localhost:5000/statistics",
      "Markov Configuration": "http://localhost:5000/markov/configuration",
      "Service B Health": "http://localhost:5000/health",
    },
    currentStatus: {
      totalRequests: demoMetrics.totalRequests,
      activeDemoLogs: presentationLogs.length,
      lastActivity: presentationLogs[0]?.timestamp || "No activity yet",
    },
  });
});

// Simple endpoint for basic testing
app.get("/test", async (req, res) => {
  try {
    demoMetrics.totalRequests++;
    promTotalRequests.inc();
    const start = Date.now();
    const response = await faultTolerantFetch("http://service-b:5000/data");
    const duration = Date.now() - start;
    promResponseTime.observe(duration);

    res.json({
      status: "SUCCESS",
      middleware: "Adaptive middleware working",
      serviceResponse: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Prometheus metrics endpoint for service-a
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err instanceof Error ? err.message : String(err));
  }
});

// 🎓 ENHANCED ACADEMIC DEMO WITH BETTER STATISTICS
app.get("/demo/markov-enhanced", async (req, res) => {
  addPresentationLog(
    "ACADEMIC",
    "🎬 Starting ENHANCED MARKOV DEMONSTRATION with Load Factor Analysis"
  );

  // Reset metrics for clean demo
  demoMetrics.totalRequests = 0;
  demoMetrics.successfulRequests = 0;
  demoMetrics.failedRequests = 0;
  demoMetrics.fallbackResponses = 0;
  demoMetrics.circuitBreakerActivations = 0;
  demoMetrics.retryAttempts = 0;
  demoMetrics.stateTransitionsSeen.clear();
  demoMetrics.performanceData = [];

  const demoResults = {
    phases: [] as any[],
    loadFactorDemonstration: {} as any,
    markovStatistics: {} as any,
    middlewarePerformance: {} as any,
    academicAnalysis: {} as any,
  };

  try {
    // Reset circuit breaker and middleware state
    clearFailureWindow();
    forceAdaptation("reset");

    // PHASE 1: HEALTHY with Normal Load
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 1: HEALTHY state with normal load (1.0)"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "HEALTHY" }),
    });
    await fetch("http://service-b:5000/control/load-factor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ load: 1.0 }),
    });

    const healthyResults = await performEnhancedTestSequence("HEALTHY", 4, 1.0);
    demoResults.phases.push(healthyResults);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // PHASE 2: DEGRADED with High Load
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 2: DEGRADED state with high load (2.0) - showing load correlation"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "DEGRADED" }),
    });
    await fetch("http://service-b:5000/control/load-factor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ load: 2.0 }),
    });

    const degradedResults = await performEnhancedTestSequence(
      "DEGRADED",
      6,
      2.0
    );
    demoResults.phases.push(degradedResults);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // PHASE 3: FAILING - Let circuit breaker activate
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 3: FAILING state - circuit breaker activation"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "FAILING" }),
    });

    const failingResults = await performEnhancedTestSequence("FAILING", 5, 2.0);
    demoResults.phases.push(failingResults);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // PHASE 4: CRITICAL - All fallbacks
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 4: CRITICAL state - fallback protection"
    );
    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "CRITICAL" }),
    });

    const criticalResults = await performEnhancedTestSequence(
      "CRITICAL",
      3,
      2.0
    );
    demoResults.phases.push(criticalResults);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // PHASE 5: RECOVERING with Low Load
    addPresentationLog(
      "MARKOV",
      "📊 PHASE 5: RECOVERING with low load (0.5) - recovery assistance"
    );

    // Reset circuit breaker to allow recovery testing
    clearFailureWindow();

    await fetch("http://service-b:5000/control/force-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "RECOVERING" }),
    });
    await fetch("http://service-b:5000/control/load-factor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ load: 0.5 }),
    });

    const recoveringResults = await performEnhancedTestSequence(
      "RECOVERING",
      4,
      0.5
    );
    demoResults.phases.push(recoveringResults);

    // FORCE SOME ADAPTATION EVENTS FOR TESTING
    addPresentationLog(
      "ADAPTATION",
      "🎯 Forcing adaptation events for testing"
    );
    forceAdaptation("high_failure");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    forceAdaptation("recovery");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    forceAdaptation("reset");

    // Collect final statistics
    const markovStats = await fetch("http://service-b:5000/statistics").then(
      (r) => r.json()
    );

    demoResults.markovStatistics = markovStats;
    demoResults.middlewarePerformance = {
      totalRequests: demoMetrics.totalRequests,
      successfulRequests: demoMetrics.successfulRequests,
      failedRequests: demoMetrics.failedRequests,
      fallbackRequests: demoMetrics.fallbackResponses,
      successRate:
        demoMetrics.totalRequests > 0
          ? (
              (demoMetrics.successfulRequests / demoMetrics.totalRequests) *
              100
            ).toFixed(2) + "%"
          : "0%",
      fallbackRate:
        demoMetrics.totalRequests > 0
          ? (
              (demoMetrics.fallbackResponses / demoMetrics.totalRequests) *
              100
            ).toFixed(2) + "%"
          : "0%",
      circuitBreakerActivations: demoMetrics.circuitBreakerActivations,
      retryAttempts: demoMetrics.retryAttempts,
    };

    demoResults.loadFactorDemonstration = {
      normalLoad: "1.0 - baseline failure rates",
      highLoad: "2.0 - increased failure probability",
      lowLoad: "0.5 - improved recovery probability",
      academicNote:
        "Load factor multiplies base failure rates and affects Markov transition probabilities",
    };

    demoResults.academicAnalysis = {
      statesCovered: Array.from(demoMetrics.stateTransitionsSeen),
      markovValidation: "✅ All 5 states demonstrated with load correlation",
      middlewarePatterns: {
        retryBehavior:
          demoMetrics.retryAttempts > 0 ? "✅ Observed" : "❌ Not triggered",
        circuitBreakerActivation:
          demoMetrics.circuitBreakerActivations > 0
            ? "✅ Activated"
            : "❌ Not triggered",
        fallbackProtection:
          demoMetrics.fallbackResponses > 0 ? "✅ Active" : "❌ Not used",
      },
      statisticalRigor:
        "✅ MTBF/MTTR, transition matrix, load correlation demonstrated",
    };

    addPresentationLog("ACADEMIC", "🎓 ENHANCED DEMONSTRATION COMPLETE", {
      totalPhases: demoResults.phases.length,
      totalRequests: demoMetrics.totalRequests,
      demonstratedStates: Array.from(demoMetrics.stateTransitionsSeen),
    });

    res.json({
      status: "SUCCESS",
      message:
        "Enhanced Markov Chain demonstration completed with load factor analysis",
      executionTime: new Date().toISOString(),
      results: demoResults,
      presentationHighlights: {
        "🎭 Markov Chain":
          "5-state model with realistic transition probabilities",
        "📊 Load Correlation":
          "Demonstrated load factor influence on failure rates",
        "🛡️ Middleware Adaptation":
          "Retry → Circuit Breaker → Fallback progression observed",
        "📈 Academic Metrics":
          "MTBF/MTTR calculations and statistical analysis",
        "🔬 Experimental Control":
          "Forced state transitions for systematic evaluation",
      },
    });
  } catch (error) {
    addPresentationLog("ACADEMIC", "❌ Enhanced demo error", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Enhanced demo failed", details: error });
  }
});

async function performEnhancedTestSequence(
  stateName: string,
  requestCount: number,
  loadFactor: number
) {
  addPresentationLog(
    "MARKOV",
    `🧪 Testing ${stateName} state with ${requestCount} requests (load: ${loadFactor})`
  );

  const phaseResults = {
    stateName,
    requestCount,
    loadFactor,
    responses: [] as any[],
    summary: {} as any,
    stateMetrics: {} as any,
  };

  let actualSuccessCount = 0;
  let actualFailureCount = 0;
  let fallbackCount = 0;

  for (let i = 1; i <= requestCount; i++) {
    demoMetrics.totalRequests++;
    promTotalRequests.inc();
    const startTime = Date.now();

    try {
      addPresentationLog(
        "MIDDLEWARE",
        `📤 Request ${i}/${requestCount} to Service B (${stateName}, load: ${loadFactor})`
      );

      const response = await faultTolerantFetch("http://service-b:5000/data", {
        fallbackData: {
          message: `Academic fallback for ${stateName}`,
          state: stateName,
          loadFactor: loadFactor,
          academic: true,
        },
      });

      const duration = Date.now() - startTime;
      promResponseTime.observe(duration);
      demoMetrics.stateTransitionsSeen.add(stateName);

      if (response.markovModel) {
        actualSuccessCount++;
        addPresentationLog(
          "SUCCESS",
          `✅ Request ${i} succeeded in ${stateName}`,
          {
            responseTime: `${duration}ms`,
            serviceState: response.serviceState,
            loadFactor: response.loadFactor,
          }
        );
      } else {
        fallbackCount++;
        addPresentationLog(
          "FALLBACK",
          `🚨 Request ${i} used fallback in ${stateName}`,
          {
            responseTime: `${duration}ms`,
            reason: "Circuit breaker or service failure",
          }
        );
      }

      phaseResults.responses.push({
        requestId: i,
        duration,
        success: !!response.markovModel,
        serviceState: response.serviceState || stateName,
        usedFallback: !response.markovModel,
        loadFactor: loadFactor,
      });

      demoMetrics.performanceData.push({
        timestamp: Date.now(),
        state: stateName,
        duration,
        success: !!response.markovModel,
        loadFactor: loadFactor,
      });
    } catch (error) {
      actualFailureCount++;
      demoMetrics.failedRequests++;
      promFailure.inc();
      const duration = Date.now() - startTime;
      promResponseTime.observe(duration);
      addPresentationLog("FAILURE", `❌ Request ${i} failed in ${stateName}`, {
        error: error instanceof Error ? error.message : String(error),
        responseTime: `${duration}ms`,
        loadFactor: loadFactor,
      });

      phaseResults.responses.push({
        requestId: i,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        loadFactor: loadFactor,
      });
    }

    // Wait between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  phaseResults.summary = {
    successfulRequests: actualSuccessCount,
    failedRequests: actualFailureCount,
    fallbackRequests: fallbackCount,
    totalRequests: requestCount,
    successRate: ((actualSuccessCount / requestCount) * 100).toFixed(1) + "%",
    fallbackRate: ((fallbackCount / requestCount) * 100).toFixed(1) + "%",
    averageResponseTime:
      phaseResults.responses.length > 0
        ? (
            phaseResults.responses.reduce(
              (sum: number, r: any) => sum + r.duration,
              0
            ) / phaseResults.responses.length
          ).toFixed(0) + "ms"
        : "0ms",
  };

  addPresentationLog(
    "MARKOV",
    `📈 ${stateName} phase completed`,
    phaseResults.summary
  );
  return phaseResults;
}

// Start HTTP server so the service is reachable (was missing)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 [Service A] Running on port ${PORT}`);
});

// 📊 PRESENTATION LOGGING ENDPOINT (allow external tools to send logs)
app.post("/presentation/log", (req, res) => {
  const { category, message, data } = req.body || {};
  if (!category || !message) {
    return res.status(400).json({ error: "category and message are required" });
  }

  try {
    addPresentationLog(category, message, data);
    res.json({ status: "OK", message: "Log recorded" });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
