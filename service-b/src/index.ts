import express from "express";
import { MarkovFailureModel, ServiceState } from "./markovFailureModel.js";

const app = express();
app.use(express.json());

// Initialize Markov Chain Failure Model
const failureModel = new MarkovFailureModel();

// Service metrics for tracking
let totalRequests = 0;
let requestHistory: Array<{
  id: number;
  timestamp: number;
  success: boolean;
  responseTime: number;
  state: ServiceState;
  errorDetails?: any;
}> = [];

// Keep last 1000 requests for statistics
const MAX_HISTORY = 1000;

console.log("🎭 [Service B] Started with Markov Chain Failure Model");
console.log(
  "📊 Available states: HEALTHY → DEGRADED → FAILING → CRITICAL ⟷ RECOVERING",
);

app.get("/data", (req, res) => {
  totalRequests++;
  const requestStart = Date.now();

  // Get failure decision from Markov model
  const result = failureModel.processRequest();
  const currentState = failureModel.getCurrentState();

  // Simulate load-based effects (optional: could be based on concurrent requests)
  const currentLoad = Math.min(3.0, 1.0 + (totalRequests % 100) / 50); // Simulate varying load
  failureModel.setLoadFactor(currentLoad);

  // Add response delay
  setTimeout(() => {
    const responseTime = Date.now() - requestStart;

    if (result.shouldFail && result.errorDetails) {
      // Record failed request
      const requestRecord = {
        id: totalRequests,
        timestamp: requestStart,
        success: false,
        responseTime,
        state: currentState,
        errorDetails: result.errorDetails,
      };

      requestHistory.unshift(requestRecord);
      if (requestHistory.length > MAX_HISTORY) requestHistory.pop();

      console.log(
        `❌ [Service B] Request ${totalRequests} FAILED (${result.errorDetails.status}) - State: ${currentState}, Load: ${currentLoad.toFixed(2)}`,
      );

      res.status(result.errorDetails.status).json({
        error: result.errorDetails.message,
        timestamp: new Date().toISOString(),
        requestId: totalRequests,
        serviceState: currentState,
        loadFactor: result.errorDetails.loadFactor,
        markovModel: true,
      });
    } else {
      // Record successful request
      const requestRecord = {
        id: totalRequests,
        timestamp: requestStart,
        success: true,
        responseTime,
        state: currentState,
      };

      requestHistory.unshift(requestRecord);
      if (requestHistory.length > MAX_HISTORY) requestHistory.pop();

      const successRate = (
        (requestHistory.filter((r) => r.success).length /
          requestHistory.length) *
        100
      ).toFixed(1);

      console.log(
        `✅ [Service B] Request ${totalRequests} SUCCESS - State: ${currentState}, Success Rate: ${successRate}%`,
      );

      res.json({
        data: "Hello from Service B with Markov Model",
        timestamp: new Date().toISOString(),
        requestId: totalRequests,
        serviceState: currentState,
        successRate: `${successRate}%`,
        loadFactor: currentLoad.toFixed(2),
        message: `Service operating in ${currentState} state`,
        markovModel: true,
      });
    }
  }, result.responseDelay);
});

// Enhanced statistics endpoint for academic presentation
app.get("/statistics", (req, res) => {
  const markovStats = failureModel.getStatistics();
  const recentRequests = requestHistory.slice(0, 100); // Last 100 requests

  // Calculate additional metrics
  const successRate =
    recentRequests.length > 0
      ? (recentRequests.filter((r) => r.success).length /
          recentRequests.length) *
        100
      : 0;

  const avgResponseTime =
    recentRequests.length > 0
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) /
        recentRequests.length
      : 0;

  // State distribution for recent requests
  const stateDistribution = new Map<ServiceState, number>();
  recentRequests.forEach((r) => {
    stateDistribution.set(r.state, (stateDistribution.get(r.state) || 0) + 1);
  });

  // Transition matrix statistics
  const transitionStats: any = {};
  markovStats.transitionCount.forEach((count, transition) => {
    transitionStats[transition] = count;
  });

  res.json({
    // Service-level metrics
    serviceMetrics: {
      totalRequests: totalRequests,
      successRate: successRate.toFixed(2) + "%",
      failureRate: (100 - successRate).toFixed(2) + "%",
      averageResponseTime: avgResponseTime.toFixed(2) + "ms",
      requestsInLast100: recentRequests.length,
    },

    // Markov Chain specific metrics
    markovChainMetrics: {
      currentState: markovStats.currentState,
      mtbf: markovStats.mtbf.toFixed(2) + "ms", // Mean Time Between Failures
      mttr: markovStats.mttr.toFixed(2) + "ms", // Mean Time To Recovery
      stateTransitions: transitionStats,
      stateHistory: markovStats.stateHistory.slice(-10), // Last 10 state changes
    },

    // Academic presentation data
    presentationData: {
      stateDistributionRecent: Object.fromEntries(
        Array.from(stateDistribution.entries()).map(([state, count]) => [
          state,
          {
            count,
            percentage:
              ((count / recentRequests.length) * 100).toFixed(1) + "%",
          },
        ]),
      ),
      failurePatternAnalysis: {
        healthyRequests: recentRequests.filter(
          (r) => r.state === ServiceState.HEALTHY,
        ).length,
        degradedRequests: recentRequests.filter(
          (r) => r.state === ServiceState.DEGRADED,
        ).length,
        failingRequests: recentRequests.filter(
          (r) => r.state === ServiceState.FAILING,
        ).length,
        criticalRequests: recentRequests.filter(
          (r) => r.state === ServiceState.CRITICAL,
        ).length,
        recoveringRequests: recentRequests.filter(
          (r) => r.state === ServiceState.RECOVERING,
        ).length,
      },
    },

    timestamp: new Date().toISOString(),
    modelType: "Markov Chain",
  });
});

// Control endpoints for demonstration
app.post("/control/force-state", (req, res) => {
  const { state } = req.body;

  if (!Object.values(ServiceState).includes(state)) {
    return res.status(400).json({
      error: "Invalid state",
      validStates: Object.values(ServiceState),
    });
  }

  failureModel.forceStateTransition(state as ServiceState);
  console.log(`🎯 [Service B] Forced transition to state: ${state}`);

  res.json({
    message: `State forced to ${state}`,
    currentState: failureModel.getCurrentState(),
    timestamp: new Date().toISOString(),
  });
});

app.post("/control/load-factor", (req, res) => {
  const { load } = req.body;

  if (typeof load !== "number" || load < 0.1 || load > 3.0) {
    return res.status(400).json({
      error: "Load factor must be between 0.1 and 3.0",
    });
  }

  failureModel.setLoadFactor(load);
  console.log(`📊 [Service B] Load factor set to: ${load}`);

  res.json({
    message: `Load factor set to ${load}`,
    currentState: failureModel.getCurrentState(),
    timestamp: new Date().toISOString(),
  });
});

// Get current Markov Chain configuration
app.get("/markov/configuration", (req, res) => {
  const transitionMatrix = failureModel.getTransitionMatrix();
  const config: any = {};

  // Convert Map to JSON-serializable object
  transitionMatrix.forEach((transitions, state) => {
    config[state] = transitions;
  });

  res.json({
    currentState: failureModel.getCurrentState(),
    transitionMatrix: config,
    stateDescription: {
      [ServiceState.HEALTHY]: "5% failure rate, 50ms delay",
      [ServiceState.DEGRADED]: "25% failure rate, 200ms delay",
      [ServiceState.FAILING]: "60% failure rate, 800ms delay",
      [ServiceState.CRITICAL]: "90% failure rate, 2000ms delay",
      [ServiceState.RECOVERING]: "35% failure rate, 400ms delay",
    },
    academicNote: "Markov Chain model with load-based transition adjustments",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const currentState = failureModel.getCurrentState();
  const isHealthy =
    currentState === ServiceState.HEALTHY ||
    currentState === ServiceState.RECOVERING;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    state: currentState,
    timestamp: new Date().toISOString(),
    model: "Markov Chain",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `🚀 [Service B] Running on port ${PORT} with Markov Chain Failure Model`,
  );
  console.log(`📈 Academic endpoints:`);
  console.log(
    `   GET  /statistics - Comprehensive statistics for presentation`,
  );
  console.log(`   GET  /markov/configuration - Model configuration details`);
  console.log(`   POST /control/force-state - Force state transition`);
  console.log(`   POST /control/load-factor - Adjust load factor`);
});
