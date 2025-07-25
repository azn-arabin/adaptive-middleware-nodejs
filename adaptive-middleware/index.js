const axios = require("axios");
const retryRequest = require("./retry");
const { shouldAllowRequest, recordResult } = require("./circuitBreaker");
const { getFallbackResponse } = require("./fallback");

async function faultTolerantFetch(url, options = {}) {
  const {
    retries = 2,
    timeout = 1000,
    fallbackData = { error: "Service temporarily unavailable" },
  } = options;

  if (!shouldAllowRequest()) {
    console.log("[Circuit Open] Skipping call to:", url);
    return getFallbackResponse(fallbackData);
  }

  try {
    const result = await retryRequest(
      () => axios.get(url, { timeout }),
      retries,
    );
    recordResult(true);
    return result.data;
  } catch (err) {
    recordResult(false);
    return getFallbackResponse(fallbackData);
  }
}

module.exports = { faultTolerantFetch };
