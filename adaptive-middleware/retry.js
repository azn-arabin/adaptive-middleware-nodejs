async function retryRequest(fn, retries) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      console.log(`[Retry] Attempt ${attempt} failed`);
      if (attempt > retries) throw err;
      await new Promise((res) => setTimeout(res, 300)); // basic backoff
    }
  }
}

module.exports = retryRequest;
