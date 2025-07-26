import axios from "axios";
import { retryRequest } from "./retry.js";
import { shouldAllowRequest, recordResult } from "./circuitBreaker.js";
import { getFallbackResponse } from "./fallback.js";
import { FaultTolerantOptions } from "./types.js";
import * as config from "./config.js";

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
    return getFallbackResponse(fallbackData);
  }

  try {
    console.log(`[Fault Tolerant] Calling ${url} with ${retries} max retries`);
    const result = await retryRequest(
      () => axios.get(url, { timeout }),
      retries,
    );

    console.log(`[Circuit Closed] Successful call to: ${url}`);
    recordResult(true);
    return result.data;
  } catch (err) {
    console.log(`[Fault Tolerant] All retries failed for: ${url}`);
    recordResult(false);
    return getFallbackResponse(fallbackData);
  }
}

// Export all modules
export * from "./types.js";
export { retryRequest } from "./retry.js";
export { shouldAllowRequest, recordResult } from "./circuitBreaker.js";
export { getFallbackResponse } from "./fallback.js";
export { startAdaptiveTuner } from "./tuner.js";
