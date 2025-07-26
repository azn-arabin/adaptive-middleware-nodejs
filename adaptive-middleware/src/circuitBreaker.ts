import * as config from "./config.js";

let failureWindow: boolean[] = [];
const windowSize = 10;

let circuitOpen = false;
let lastOpened: number | null = null;

// Callback for sending logs to presentation system
let logCallback:
  | ((category: string, message: string, data?: any) => void)
  | null = null;

export function setCircuitLogCallback(
  callback: (category: string, message: string, data?: any) => void,
) {
  logCallback = callback;
}

// Function to clear failure window for clean demo
export function clearFailureWindow() {
  failureWindow = [];
}

export function recordResult(success: boolean) {
  failureWindow.push(success);
  if (failureWindow.length > windowSize) failureWindow.shift();

  const failureRate =
    failureWindow.filter((r) => !r).length / failureWindow.length;

  // Get current threshold dynamically
  if (failureRate >= config.failureThreshold && !circuitOpen) {
    circuitOpen = true;
    lastOpened = Date.now();
    const logMessage = `CIRCUIT BREAKER OPENED (rate = ${failureRate.toFixed(
      2,
    )}, threshold = ${config.failureThreshold})`;

    console.log(`[Circuit Breaker] ${logMessage}`);

    // Send to presentation logs
    if (logCallback) {
      logCallback("CIRCUIT", "⚡ Circuit breaker OPENED - protecting system", {
        failureRate: parseFloat(failureRate.toFixed(2)),
        threshold: config.failureThreshold,
        failureWindow: failureWindow.slice(),
        action: "BLOCK_REQUESTS",
      });
    }
  }

  // Get current cooldown dynamically
  if (circuitOpen && lastOpened && Date.now() - lastOpened > config.cooldown) {
    const logMessage = `CIRCUIT BREAKER HALF-OPEN (probing after ${config.cooldown}ms)`;
    console.log(`[Circuit Breaker] ${logMessage}`);

    // Send to presentation logs
    if (logCallback) {
      logCallback(
        "CIRCUIT",
        "🔍 Circuit breaker HALF-OPEN - testing recovery",
        {
          cooldownPeriod: config.cooldown,
          timeElapsed: Date.now() - lastOpened,
          action: "PROBE_REQUEST",
        },
      );
    }

    circuitOpen = false;
  }
}

export function shouldAllowRequest(): boolean {
  const shouldBlock =
    circuitOpen && lastOpened && Date.now() - lastOpened < config.cooldown;

  if (shouldBlock && logCallback) {
    logCallback("CIRCUIT", "🚫 Request blocked by circuit breaker", {
      timeRemaining: config.cooldown - (Date.now() - (lastOpened || 0)),
      cooldownPeriod: config.cooldown,
    });
  }

  return !shouldBlock;
}

export function getFailureWindow() {
  return failureWindow.slice(); // for stats
}
