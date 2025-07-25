const express = require("express");
const { faultTolerantFetch } = require("../adaptive-middleware");
const app = express();

app.get("/call-b", async (req, res) => {
  const response = await faultTolerantFetch("http://service-b:5000/data", {
    retries: 2,
    fallbackData: { message: "Using fallback response" },
  });
  res.send(response);
});

app.listen(3000, () => {
  console.log("Service A running on port 3000");
});
