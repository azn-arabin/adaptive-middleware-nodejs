import express from "express";
import { faultTolerantFetch, startAdaptiveTuner } from "adaptive-middleware";

startAdaptiveTuner();

const app = express();
app.use(express.json());

// 📊 LOG COLLECTOR FOR PRESENTATION
const presentationLogs: any[] = [];
const MAX_LOGS = 100; // Keep last 100 logs

function addPresentationLog(category: string, message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString(),
    category,
    message,
    data,
    id: Date.now() + Math.random(),
  };

  presentationLogs.unshift(logEntry); // Add to beginning
  if (presentationLogs.length > MAX_LOGS) {
    presentationLogs.pop(); // Remove oldest
  }

  // Also log to console with emoji
  const emoji = {
    MIDDLEWARE: "🛡️",
    ADAPTATION: "🎯",
    CIRCUIT: "⚡",
    RETRY: "🔄",
    FAILURE: "❌",
    SUCCESS: "✅",
    FALLBACK: "🚨",
  }[category]
    ? "📝"
    : "ℹ️";

  console.log(
    `${emoji} [${category}] ${message}`,
    data ? JSON.stringify(data) : "",
  );
}

// Main endpoint - uses adaptive retry count (no hardcoded retries)
app.get("/call-b", async (req, res) => {
  try {
    addPresentationLog(
      "MIDDLEWARE",
      "Starting fault-tolerant request to Service B",
    );

    const response = await faultTolerantFetch("http://service-b:5000/data", {
      fallbackData: { message: "Using fallback response from Service A" },
    });

    if (response.message && response.message.includes("fallback")) {
      addPresentationLog(
        "FALLBACK",
        "Fallback response used - Service B unavailable",
        {
          fallbackData: response,
        },
      );
    } else {
      addPresentationLog("SUCCESS", "Service B responded successfully", {
        response: response.data || response,
      });
    }

    res.json(response);
  } catch (error: any) {
    addPresentationLog("FAILURE", "Critical error in fault-tolerant fetch", {
      error: error.message,
    });
    console.error("Error calling service B:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🎯 PRESENTATION DEMO ENDPOINT - Perfect for showing adaptation in action
app.get("/demo/adaptive-showcase", async (req, res) => {
  const scenario = req.query.scenario || "mixed";
  addPresentationLog(
    "MIDDLEWARE",
    `🎬 Starting presentation demo: ${scenario}`,
  );

  const results = [];
  let requestCount = 0;

  try {
    // Scenario 1: Mixed load with adaptation
    if (scenario === "mixed") {
      for (let i = 1; i <= 15; i++) {
        requestCount++;
        addPresentationLog(
          "MIDDLEWARE",
          `Demo request ${i}/15 - observing adaptation`,
        );

        const start = Date.now();
        const response = await faultTolerantFetch(
          "http://service-b:5000/data",
          {
            fallbackData: { message: `Demo fallback ${i}` },
          },
        );
        const duration = Date.now() - start;

        const success =
          !response.error && !response.message?.includes("fallback");
        results.push({
          request: i,
          success,
          duration: `${duration}ms`,
          response: success ? "Service B success" : "Fallback used",
        });

        addPresentationLog(
          success ? "SUCCESS" : "FALLBACK",
          `Demo request ${i} result: ${success ? "SUCCESS" : "FALLBACK"} (${duration}ms)`,
        );

        // Pause between requests to show adaptation
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    addPresentationLog("MIDDLEWARE", "🎬 Presentation demo completed", {
      totalRequests: requestCount,
      summary: results,
    });

    res.json({
      demoType: scenario,
      totalRequests: requestCount,
      results,
      summary: {
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        successRate: `${(
          (results.filter((r) => r.success).length / requestCount) *
          100
        ).toFixed(1)}%`,
      },
      message: "🎯 Check /logs/presentation for detailed adaptation logs!",
    });
  } catch (error: any) {
    addPresentationLog("FAILURE", "Demo scenario failed", {
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

// 📊 PRESENTATION LOGS ENDPOINT - This is what you need for your presentation!
app.get("/logs/presentation", (req, res) => {
  const category = req.query.category as string;
  const last = parseInt(req.query.last as string) || 50;

  let filteredLogs = presentationLogs;

  if (category) {
    filteredLogs = presentationLogs.filter((log) =>
      log.category.toLowerCase().includes(category.toLowerCase()),
    );
  }

  const logsToShow = filteredLogs.slice(0, last);

  res.json({
    totalLogs: presentationLogs.length,
    showing: logsToShow.length,
    filter: category || "all",
    logs: logsToShow,
    categories: [
      "MIDDLEWARE",
      "ADAPTATION",
      "CIRCUIT",
      "RETRY",
      "FAILURE",
      "SUCCESS",
      "FALLBACK",
    ],
    usage: {
      allLogs: "/logs/presentation",
      onlyRetries: "/logs/presentation?category=retry",
      onlyAdaptation: "/logs/presentation?category=adaptation",
      last10: "/logs/presentation?last=10",
    },
  });
});

// 🎯 PRESENTATION STATS ENDPOINT - Great for showing current middleware state
app.get("/presentation/stats", async (req, res) => {
  try {
    const serviceBStatus = await faultTolerantFetch(
      "http://service-b:5000/status",
      {
        fallbackData: { error: "Service B status unavailable" },
      },
    );

    const recentLogs = presentationLogs.slice(0, 20);
    const categoryStats = recentLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {});

    res.json({
      currentTime: new Date().toLocaleTimeString(),
      middleware: {
        status: "🛡️ ACTIVE",
        uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(
          process.uptime() % 60,
        )}s`,
        totalLogs: presentationLogs.length,
      },
      recentActivity: categoryStats,
      services: {
        serviceA: "🟢 RUNNING",
        serviceB: serviceBStatus.status || "🔴 UNAVAILABLE",
      },
      lastEvents: recentLogs.slice(0, 5).map((log) => ({
        time: log.time,
        event: `${log.category}: ${log.message}`,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint - make multiple calls to trigger adaptation
app.get("/test/burst", async (req, res) => {
  const results = [];
  const count = parseInt(req.query.count as string) || 10;

  console.log(`🧪 [Service A] Starting burst test with ${count} requests...`);

  for (let i = 1; i <= count; i++) {
    try {
      const start = Date.now();
      const response = await faultTolerantFetch("http://service-b:5000/data", {
        fallbackData: { message: `Fallback for request ${i}` },
      });
      const duration = Date.now() - start;

      results.push({
        request: i,
        success: !response.error,
        duration: `${duration}ms`,
        response: response.data || response.message || response.error,
      });

      console.log(
        `🧪 Request ${i}/${count}: ${
          response.error ? "❌ FAILED" : "✅ SUCCESS"
        } (${duration}ms)`,
      );
    } catch (error: any) {
      results.push({
        request: i,
        success: false,
        error: error.message,
      });
    }

    // Small delay between requests to see adaptation
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  res.json({
    testType: "burst",
    totalRequests: count,
    results,
    summary: {
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      successRate: `${(
        (results.filter((r) => r.success).length / count) *
        100
      ).toFixed(1)}%`,
    },
  });
});

// Endpoint to control Service-B remotely
app.post("/control-service-b/:action", async (req, res) => {
  const { action } = req.params;
  const { value } = req.body;

  try {
    let response;
    switch (action) {
      case "failure-rate":
        // ❌ Removed method parameter - not supported by faultTolerantFetch
        response = await faultTolerantFetch(
          "http://service-b:5000/control/failure-rate",
          {
            fallbackData: { error: "Could not set failure rate" },
          },
        );
        break;
      case "pattern":
        response = await faultTolerantFetch(
          "http://service-b:5000/control/pattern",
          {
            fallbackData: { error: "Could not set pattern" },
          },
        );
        break;
      case "delay":
        response = await faultTolerantFetch(
          "http://service-b:5000/control/delay",
          {
            fallbackData: { error: "Could not set delay" },
          },
        );
        break;
      default:
        return res.status(400).json({ error: "Invalid action" });
    }
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Status endpoint
app.get("/status", async (req, res) => {
  try {
    const serviceBStatus = await faultTolerantFetch(
      "http://service-b:5000/status",
      {
        fallbackData: { error: "Service B status unavailable" },
      },
    );

    res.json({
      serviceA: {
        status: "running",
        uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(
          process.uptime() % 60,
        )}s`,
        adaptiveMiddleware: "active",
      },
      serviceB: serviceBStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Service A running on port 3000");
  console.log("📊 Available endpoints:");
  console.log("  GET  /call-b - Single call to Service B (adaptive)");
  console.log("  GET  /test/burst?count=20 - Burst test with N requests");
  console.log(
    "  POST /control-service-b/failure-rate - Set Service B failure rate",
  );
  console.log(
    "  POST /control-service-b/pattern - Set Service B failure pattern",
  );
  console.log("  POST /control-service-b/delay - Set Service B response delay");
  console.log("  GET  /status - View both services status");
  console.log("🎯 Adaptive middleware is active and tuning...");
});
