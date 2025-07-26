import * as config from "./config.js";

let failureWindow: boolean[] = [];
const windowSize = 10;

let circuitOpen = false;
let lastOpened: number | null = null;

export function recordResult(success: boolean) {
  failureWindow.push(success);
  if (failureWindow.length > windowSize) failureWindow.shift();

  const failureRate =
    failureWindow.filter((r) => !r).length / failureWindow.length;

  // Get current threshold dynamically
  if (failureRate >= config.failureThreshold && !circuitOpen) {
    circuitOpen = true;
    lastOpened = Date.now();
    console.log(
      `[Circuit Breaker] OPENED (rate = ${failureRate.toFixed(
        2,
      )}, threshold = ${config.failureThreshold})`,
    );
  }

  // Get current cooldown dynamically
  if (circuitOpen && lastOpened && Date.now() - lastOpened > config.cooldown) {
    console.log(
      `[Circuit Breaker] HALF-OPEN (probing after ${config.cooldown}ms)`,
    );
    circuitOpen = false;
  }
}

export function shouldAllowRequest(): boolean {
  // Get current cooldown value dynamically
  return !(
    circuitOpen &&
    lastOpened &&
    Date.now() - lastOpened < config.cooldown
  );
}

export function getFailureWindow() {
  return failureWindow.slice(); // for stats
}
