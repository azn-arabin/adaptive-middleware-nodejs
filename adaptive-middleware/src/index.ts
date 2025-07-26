import axios from "axios";
import { retryRequest, setRetryLogCallback } from "./retry.js";
import {
  shouldAllowRequest,
  recordResult,
  setCircuitLogCallback,
  clearFailureWindow,
} from "./circuitBreaker.js";
import { getFallbackResponse } from "./fallback.js";
import { FaultTolerantOptions } from "./types.js";
import * as config from "./config.js";

// Callback for sending logs to presentation system
let logCallback:
  | ((category: string, message: string, data?: any) => void)
  | null = null;

export function setMiddlewareLogCallback(
  callback: (category: string, message: string, data?: any) => void,
) {
  logCallback = callback;
  // Set callbacks for all modules
  setRetryLogCallback(callback);
  setCircuitLogCallback(callback);
}

export async function faultTolerantFetch(
  url: string,
  options: FaultTolerantOptions = {},
): Promise<any> {
  const {
    retries = config.maxRetries, // Use dynamic retry count from config
    timeout = 1000,
    fallbackData = { error: "Service temporarily unavailable" },
  } = options;

  if (!shouldAllowRequest()) {
    console.log(`[Circuit Open] Skipping call to: ${url}`);

    if (logCallback) {
      logCallback(
        "FALLBACK",
        "🚨 Circuit breaker blocked request - using fallback",
        {
          url,
          reason: "CIRCUIT_OPEN",
          fallbackData,
        },
      );
    }

    return getFallbackResponse(fallbackData);
  }

  try {
    console.log(`[Fault Tolerant] Calling ${url} with ${retries} max retries`);
    const result: any = await retryRequest(
      () => axios.get(url, { timeout }),
      retries,
    );

    console.log(`[Circuit Closed] Successful call to: ${url}`);
    recordResult(true);

    if (logCallback) {
      logCallback("SUCCESS", "✅ Request succeeded", {
        url,
        retries: retries,
        responseTime: "< 1s",
      });
    }

    return result.data;
  } catch (err) {
    console.log(`[Fault Tolerant] All retries failed for: ${url}`);
    recordResult(false);

    if (logCallback) {
      logCallback(
        "FALLBACK",
        "🚨 All retries exhausted - using fallback response",
        {
          url,
          retriesAttempted: retries,
          reason: "RETRIES_EXHAUSTED",
          fallbackData,
          error: err instanceof Error ? err.message : String(err),
        },
      );
    }

    return getFallbackResponse(fallbackData);
  }
}

// Export all modules
export * from "./types.js";
export { retryRequest } from "./retry.js";
export {
  shouldAllowRequest,
  recordResult,
  clearFailureWindow,
} from "./circuitBreaker.js";
export { getFallbackResponse } from "./fallback.js";
export {
  startAdaptiveTuner,
  setLogCallback,
  forceAdaptation,
} from "./tuner.js";
