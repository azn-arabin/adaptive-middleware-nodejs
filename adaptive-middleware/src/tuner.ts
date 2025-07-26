import { getFailureWindow } from "./circuitBreaker.js";
import {
  updateConfig,
  failureThreshold,
  cooldown,
  maxRetries,
} from "./config.js";

export function startAdaptiveTuner() {
  console.log("[TUNER] 🎯 Starting adaptive tuner...");

  setInterval(() => {
    const window = getFailureWindow();
    if (window.length < 3) return; // Reduced from 5 to 3 for faster adaptation

    const failureRate = window.filter((r) => !r).length / window.length;

    // Adjust threshold (more aggressive adjustments)
    let newThreshold = failureThreshold;
    if (failureRate > 0.7)
      newThreshold = Math.max(0.2, failureThreshold - 0.15);
    else if (failureRate < 0.3)
      newThreshold = Math.min(0.7, failureThreshold + 0.1);

    // Adjust cooldown (more responsive)
    let newCooldown = cooldown;
    if (failureRate > 0.6)
      newCooldown = Math.min(30000, cooldown + 3000); // Cap at 30s
    else if (failureRate < 0.2) newCooldown = Math.max(2000, cooldown - 2000); // Min 2s

    // Adjust retry count (more dynamic)
    let newRetries = maxRetries;
    if (failureRate < 0.15 && maxRetries < 5) newRetries += 1; // Allow up to 5 retries
    if (failureRate > 0.65 && maxRetries > 0) newRetries -= 1; // Can go down to 0

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

      console.log(
        `[TUNER] 🎯 ADAPTED | FailureRate: ${failureRate.toFixed(
          2,
        )} | Threshold: ${failureThreshold}→${newThreshold} | Cooldown: ${cooldown}→${newCooldown}ms | Retries: ${maxRetries}→${newRetries}`,
      );
    } else {
      console.log(
        `[TUNER] 📊 STABLE | FailureRate: ${failureRate.toFixed(
          2,
        )} | Threshold: ${newThreshold} | Cooldown: ${newCooldown}ms | Retries: ${newRetries}`,
      );
    }
  }, 5000); // Reduced from 10s to 5s for faster testing
}
