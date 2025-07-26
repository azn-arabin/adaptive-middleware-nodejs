export let failureThreshold = 0.5; // starts at 50%
export let cooldown = 10000; // 10s cooldown
export let maxRetries = 2; // max 2 retries

export function updateConfig(params: {
  threshold?: number;
  cooldown?: number;
  retries?: number;
}) {
  if (params.threshold !== undefined) failureThreshold = params.threshold;
  if (params.cooldown !== undefined) cooldown = params.cooldown;
  if (params.retries !== undefined) maxRetries = params.retries;
}
