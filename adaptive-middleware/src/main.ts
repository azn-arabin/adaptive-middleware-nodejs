import { startAdaptiveTuner, setLogCallback } from "./tuner.js";

// Set up logging callback for the tuner
setLogCallback((category: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(
    `${timestamp} [${category}] ${message}`,
    data ? JSON.stringify(data) : ""
  );
});

// Start the adaptive tuner
console.log("Starting Adaptive Middleware Tuner...");
startAdaptiveTuner();

// Keep the process running
process.on("SIGINT", () => {
  console.log("Adaptive Middleware shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Adaptive Middleware shutting down...");
  process.exit(0);
});
