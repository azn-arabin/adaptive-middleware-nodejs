import { getFailureWindow } from "./circuitBreaker.js";
import {
  updateConfig,
  failureThreshold,
  cooldown,
  maxRetries,
} from "./config.js";

// Callback for sending logs to presentation system
let logCallback:
  | ((category: string, message: string, data?: any) => void)
  | null = null;

export function setLogCallback(
  callback: (category: string, message: string, data?: any) => void,
) {
  logCallback = callback;
}

// allow tuner interval to be configured via env var for faster demos
const tunerIntervalMs = Number(process.env.TUNER_INTERVAL_MS) || 5000;

// Force adaptation for demo purposes
export function forceAdaptation(
  scenario: "high_failure" | "recovery" | "reset",
) {
  const window = getFailureWindow();
  let newThreshold = failureThreshold;
  let newCooldown = cooldown;
  let newRetries = maxRetries;

  if (scenario === "high_failure") {
    // Aggressive adaptation for high failure
    newThreshold = Math.max(0.2, failureThreshold - 0.2); // Lower threshold quickly
    newCooldown = Math.min(20000, cooldown + 5000); // Increase cooldown
    newRetries = Math.max(1, maxRetries - 1); // Reduce retries

    if (logCallback) {
      logCallback(
        "ADAPTATION",
        "🎯 AGGRESSIVE adaptation - high failure detected",
        {
          scenario: "HIGH_FAILURE_PROTECTION",
          changes: {
            threshold: { from: failureThreshold, to: newThreshold },
            cooldown: { from: cooldown, to: newCooldown },
            retries: { from: maxRetries, to: newRetries },
          },
          reason: "Protecting system from cascading failures",
          timestamp: Date.now(),
        },
      );
    }
  } else if (scenario === "recovery") {
    // Optimistic adaptation for recovery
    newThreshold = Math.min(0.7, failureThreshold + 0.15); // Raise threshold
    newCooldown = Math.max(3000, cooldown - 3000); // Reduce cooldown
    newRetries = Math.min(4, maxRetries + 1); // Increase retries

    if (logCallback) {
      logCallback(
        "ADAPTATION",
        "🎯 OPTIMISTIC adaptation - service recovering",
        {
          scenario: "RECOVERY_OPTIMIZATION",
          changes: {
            threshold: { from: failureThreshold, to: newThreshold },
            cooldown: { from: cooldown, to: newCooldown },
            retries: { from: maxRetries, to: newRetries },
          },
          reason: "Optimizing for improved service performance",
          timestamp: Date.now(),
        },
      );
    }
  } else if (scenario === "reset") {
    // Reset to defaults
    newThreshold = 0.5;
    newCooldown = 10000;
    newRetries = 2;

    if (logCallback) {
      logCallback(
        "ADAPTATION",
        "🎯 BASELINE reset - returning to default configuration",
        {
          scenario: "BASELINE_RESET",
          changes: {
            threshold: { from: failureThreshold, to: newThreshold },
            cooldown: { from: cooldown, to: newCooldown },
            retries: { from: maxRetries, to: newRetries },
          },
          reason: "Demo complete - resetting to baseline",
          timestamp: Date.now(),
        },
      );
    }
  }

  // Apply the changes
  updateConfig({
    threshold: newThreshold,
    cooldown: newCooldown,
    retries: newRetries,
  });

  console.log(
    `${new Date().toISOString()} [TUNER] 🎯 FORCED ADAPTATION | Scenario: ${scenario} | Threshold: ${failureThreshold}→${newThreshold} | Cooldown: ${cooldown}→${newCooldown}ms | Retries: ${maxRetries}→${newRetries}`,
  );
}

export function startAdaptiveTuner() {
  console.log(
    `${new Date().toISOString()} [TUNER] 🎯 Starting adaptive tuner... (interval ${tunerIntervalMs}ms)`,
  );

  // Emit initial configuration for presentation/reporting
  if (logCallback) {
    logCallback("ADAPTATION", "DEMO_START", {
      failureThreshold: failureThreshold,
      cooldownMs: cooldown,
      retryAttempts: maxRetries,
      reason: "Tuner initialized",
      timestamp: Date.now(),
    });
  }

  setInterval(() => {
    const window = getFailureWindow();
    if (window.length < 3) return; // Reduced from 5 to 3 for faster adaptation

    const failureRate = window.filter((r) => !r).length / window.length;

    // More aggressive adaptation thresholds
    let newThreshold = failureThreshold;
    if (failureRate > 0.6)
      // Lowered from 0.7
      newThreshold = Math.max(0.15, failureThreshold - 0.2); // More aggressive reduction
    else if (failureRate < 0.2)
      // Lowered from 0.3
      newThreshold = Math.min(0.8, failureThreshold + 0.15); // More aggressive increase

    // More responsive cooldown adjustments
    let newCooldown = cooldown;
    if (failureRate > 0.5)
      // Lowered from 0.6
      newCooldown = Math.min(25000, cooldown + 4000); // Larger increases
    else if (failureRate < 0.15)
      // Lowered from 0.2
      newCooldown = Math.max(2000, cooldown - 3000); // Larger decreases

    // More dynamic retry adjustments
    let newRetries = maxRetries;
    if (failureRate < 0.1 && maxRetries < 4) newRetries += 1; // More generous
    if (failureRate > 0.7 && maxRetries > 1) newRetries -= 1; // More aggressive

    // Only update if there are actual changes
    if (
      newThreshold !== failureThreshold ||
      newCooldown !== cooldown ||
      newRetries !== maxRetries
    ) {
      updateConfig({
        threshold: newThreshold,
        cooldown: newCooldown,
        retries: newRetries,
      });

      const adaptationLog = `FailureRate: ${failureRate.toFixed(
        2,
      )} | Threshold: ${failureThreshold}→${newThreshold} | Cooldown: ${cooldown}→${newCooldown}ms | Retries: ${maxRetries}→${newRetries}`;

      console.log(
        `${new Date().toISOString()} [TUNER] 🎯 ADAPTED | ${adaptationLog}`,
      );

      // Send to presentation logs
      if (logCallback) {
        logCallback("ADAPTATION", "🎯 Adaptive tuning triggered", {
          failureRate: parseFloat(failureRate.toFixed(2)),
          changes: {
            threshold: { from: failureThreshold, to: newThreshold },
            cooldown: { from: cooldown, to: newCooldown },
            retries: { from: maxRetries, to: newRetries },
          },
          reason:
            failureRate > 0.6
              ? "High failure rate detected"
              : failureRate < 0.2
                ? "Low failure rate - optimizing"
                : "Moderate adjustment",
          timestamp: Date.now(),
        });
      }
    } else {
      // Only log stability occasionally to reduce noise
      if (Math.random() < 0.3) {
        // 30% chance
        console.log(
          `${new Date().toISOString()} [TUNER] 📊 STABLE | FailureRate: ${failureRate.toFixed(
            2,
          )} | Threshold: ${newThreshold} | Cooldown: ${newCooldown}ms | Retries: ${newRetries}`,
        );

        // Send stability log too (but less frequently)
        if (logCallback && Math.random() < 0.2) {
          // 20% chance
          logCallback("ADAPTATION", "📊 Configuration stable", {
            failureRate: parseFloat(failureRate.toFixed(2)),
            currentConfig: {
              threshold: newThreshold,
              cooldown: newCooldown,
              retries: newRetries,
            },
            timestamp: Date.now(),
          });
        }
      }
    }
  }, tunerIntervalMs); // configurable interval
}
