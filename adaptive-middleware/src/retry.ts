// Callback for sending logs to presentation system
let logCallback:
  | ((category: string, message: string, data?: any) => void)
  | null = null;

export function setRetryLogCallback(
  callback: (category: string, message: string, data?: any) => void,
) {
  logCallback = callback;
}

export async function retryRequest<T>(
  fn: () => Promise<T>,
  retries: number,
): Promise<T> {
  let attempt = 0;
  const baseDelay = 200; // Start with 200ms

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      console.log(`[Retry] Attempt ${attempt} failed`);

      // Send to presentation logs
      if (logCallback) {
        logCallback("RETRY", `🔄 Retry attempt ${attempt} failed`, {
          attemptNumber: attempt,
          maxRetries: retries,
          remainingAttempts: retries - attempt,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (attempt > retries) throw err;

      // Exponential backoff: baseDelay * 2^(attempt-1) + jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 100; // Add 0-100ms jitter to avoid thundering herd
      const totalDelay = exponentialDelay + jitter;

      console.log(
        `[Retry] Waiting ${Math.round(totalDelay)}ms before attempt ${attempt + 1}`,
      );

      // Send delay log to presentation
      if (logCallback) {
        logCallback(
          "RETRY",
          `⏱️ Exponential backoff delay: ${Math.round(totalDelay)}ms`,
          {
            delay: Math.round(totalDelay),
            exponentialDelay,
            jitter: Math.round(jitter),
            nextAttempt: attempt + 1,
          },
        );
      }

      await new Promise((res) => setTimeout(res, totalDelay));
    }
  }
  throw new Error("Retry limit exceeded");
}
