export interface FaultTolerantOptions {
  retries?: number;
  timeout?: number;
  fallbackData?: any;
}

export interface FallbackResponse {
  source: string;
  [key: string]: any;
}
