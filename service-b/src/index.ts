import express from "express";

const app = express();
app.use(express.json());

// Service state for controlling failure patterns
let failureRate = 0.3; // Start with 30% failure rate
let responseDelay = 0; // No delay by default
let consecutiveFailures = 0;
let totalRequests = 0;
let successfulRequests = 0;

// Failure patterns
const FAILURE_PATTERNS = {
  RANDOM: "random",
  BURST: "burst", // High failure rate for a period, then recovery
  DEGRADING: "degrading", // Gradually increasing failure rate
  HEALTHY: "healthy", // Very low failure rate
};

let currentPattern = FAILURE_PATTERNS.RANDOM;
let patternStartTime = Date.now();

function getFailureRateForPattern() {
  const timeSinceStart = Date.now() - patternStartTime;
  const minutes = timeSinceStart / (1000 * 60);

  switch (currentPattern) {
    case FAILURE_PATTERNS.BURST:
      // High failure for 2 minutes, then low failure for 2 minutes, repeat
      return minutes % 4 < 2 ? 0.8 : 0.1;

    case FAILURE_PATTERNS.DEGRADING:
      // Gradually increase from 10% to 70% over 5 minutes, then reset
      const cycle = minutes % 5;
      return Math.min(0.1 + cycle * 0.12, 0.7);

    case FAILURE_PATTERNS.HEALTHY:
      return 0.05; // 5% failure rate

    case FAILURE_PATTERNS.RANDOM:
    default:
      return failureRate;
  }
}

app.get("/data", (req, res) => {
  totalRequests++;
  const currentFailureRate = getFailureRateForPattern();
  const shouldFail = Math.random() < currentFailureRate;

  // Add response delay if configured
  setTimeout(() => {
    if (shouldFail) {
      consecutiveFailures++;
      const errorTypes = [
        { status: 500, message: "Internal Server Error" },
        { status: 503, message: "Service Unavailable" },
        { status: 408, message: "Request Timeout" },
        { status: 502, message: "Bad Gateway" },
      ];
      const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];

      console.log(
        `❌ [Service B] Request ${totalRequests} FAILED (${error.status}) - Consecutive failures: ${consecutiveFailures}, Current failure rate: ${(currentFailureRate * 100).toFixed(1)}%`,
      );
      res.status(error.status).json({
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: totalRequests,
        consecutiveFailures,
      });
    } else {
      consecutiveFailures = 0; // Reset on success
      successfulRequests++;
      const successRate = ((successfulRequests / totalRequests) * 100).toFixed(
        1,
      );

      console.log(
        `✅ [Service B] Request ${totalRequests} SUCCESS - Overall success rate: ${successRate}%, Current failure rate: ${(currentFailureRate * 100).toFixed(1)}%`,
      );
      res.json({
        data: "Hello from Service B",
        timestamp: new Date().toISOString(),
        requestId: totalRequests,
        successRate: `${successRate}%`,
        message: "Service operating normally",
      });
    }
  }, responseDelay);
});

// Control endpoints for testing
app.post("/control/failure-rate", (req, res) => {
  const { rate } = req.body;
  if (rate >= 0 && rate <= 1) {
    failureRate = rate;
    currentPattern = FAILURE_PATTERNS.RANDOM;
    console.log(
      `🔧 [Service B] Failure rate set to ${(rate * 100).toFixed(1)}%`,
    );
    res.json({ message: `Failure rate set to ${(rate * 100).toFixed(1)}%` });
  } else {
    res.status(400).json({ error: "Failure rate must be between 0 and 1" });
  }
});

app.post("/control/pattern", (req, res) => {
  const { pattern } = req.body;
  if (Object.values(FAILURE_PATTERNS).includes(pattern)) {
    currentPattern = pattern;
    patternStartTime = Date.now();
    console.log(`🔧 [Service B] Failure pattern set to: ${pattern}`);
    res.json({ message: `Failure pattern set to: ${pattern}` });
  } else {
    res
      .status(400)
      .json({
        error: `Invalid pattern. Use: ${Object.values(FAILURE_PATTERNS).join(", ")}`,
      });
  }
});

app.post("/control/delay", (req, res) => {
  const { delay } = req.body;
  if (delay >= 0 && delay <= 5000) {
    responseDelay = delay;
    console.log(`🔧 [Service B] Response delay set to ${delay}ms`);
    res.json({ message: `Response delay set to ${delay}ms` });
  } else {
    res.status(400).json({ error: "Delay must be between 0 and 5000ms" });
  }
});

// Status endpoint
app.get("/status", (req, res) => {
  const uptime = process.uptime();
  const currentFailureRate = getFailureRateForPattern();
  res.json({
    status: "running",
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    stats: {
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      successRate:
        totalRequests > 0
          ? `${((successfulRequests / totalRequests) * 100).toFixed(1)}%`
          : "0%",
      consecutiveFailures,
    },
    config: {
      currentPattern,
      staticFailureRate: `${(failureRate * 100).toFixed(1)}%`,
      currentFailureRate: `${(currentFailureRate * 100).toFixed(1)}%`,
      responseDelay: `${responseDelay}ms`,
    },
    availablePatterns: Object.values(FAILURE_PATTERNS),
  });
});

app.listen(5000, () => {
  console.log("🚀 Service B running on port 5000");
  console.log("📊 Available endpoints:");
  console.log("  GET  /data - Main data endpoint");
  console.log("  GET  /status - Service status and stats");
  console.log(
    "  POST /control/failure-rate - Set failure rate (body: {rate: 0.0-1.0})",
  );
  console.log(
    "  POST /control/pattern - Set failure pattern (body: {pattern: 'random|burst|degrading|healthy'})",
  );
  console.log(
    "  POST /control/delay - Set response delay (body: {delay: 0-5000})",
  );
  console.log(
    `🎯 Starting with ${(failureRate * 100).toFixed(1)}% failure rate`,
  );
});
