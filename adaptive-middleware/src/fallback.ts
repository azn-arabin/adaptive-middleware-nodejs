import { FallbackResponse } from "./types.js";

export function getFallbackResponse(data: any): FallbackResponse {
  return {
    source: "fallback",
    ...data,
  };
}
