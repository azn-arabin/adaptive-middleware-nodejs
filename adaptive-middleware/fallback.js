function getFallbackResponse(data) {
  return {
    source: "fallback",
    ...data,
  };
}

module.exports = { getFallbackResponse };
