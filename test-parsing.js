const fs = require("fs");

// Simple test script to debug parsing
const logText = `service-a-1  | 2025-09-05T21:28:13.931Z [TUNER] 🎯 FORCED ADAPTATION | Scenario: reset | Threshold: 0.5→0.5 | Cooldown: 10000→10000ms | Retries: 2→2
service-a-1  | 2025-09-05T21:28:16.460Z [TUNER] 🎯 ADAPTED | FailureRate: 0.00 | Threshold: 0.65→0.65 | Cooldown: 7000→7000ms | Retries: 3→3
service-a-1  | 2025-09-05T21:28:21.456Z [TUNER] 🎯 ADAPTED | FailureRate: 0.00 | Threshold: 0.8→0.8 | Cooldown: 4000→4000ms | Retries: 4→4
service-a-1  | 2025-09-05T21:28:26.456Z [TUNER] 🎯 ADAPTED | FailureRate: 0.00 | Threshold: 0.8→0.8 | Cooldown: 2000→2000ms | Retries: 4→4`;

function parseAdaptationEventsFromLogs(logText, runStartTs) {
  if (!logText) return [];
  const lines = logText.split(/\r?\n/);
  const events = [];
  let lastValues = { threshold: null, cooldown: null, retries: null };

  // Updated regex patterns to match actual log formats
  const tunerRegex = /\[TUNER\].*(?:ADAPTED?|FORCED ADAPTATION)\s*\|\s*(.*)/i;
  const stableRegex = /\[TUNER\].*STABLE\s*\|\s*(.*)/i;
  const adaptationRegex = /🎯 \[ADAPTATION\]/i;

  for (const l of lines) {
    let match = null;
    let payload = null;

    // Try different regex patterns
    if (tunerRegex.test(l)) {
      match = l.match(tunerRegex);
      if (match && match[1]) payload = match[1].trim();
    } else if (stableRegex.test(l)) {
      match = l.match(stableRegex);
      if (match && match[1]) payload = match[1].trim();
    } else if (adaptationRegex.test(l)) {
      // Look for the next line or extract from current line
      const adaptMatch = l.match(/🎯 \[ADAPTATION\]\s*(.*)/i);
      if (adaptMatch && adaptMatch[1]) payload = adaptMatch[1].trim();
    }

    if (!payload) continue;

    console.log(`Processing line: ${l}`);
    console.log(`Payload: ${payload}`);

    // Try to extract timestamp from the line
    const timeMatch = l.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/);
    let ts = null;
    if (timeMatch) {
      ts = Date.parse(timeMatch[1]);
    } else {
      // Look for epoch timestamp in the line
      const epochMatch = l.match(/(17\d{11,13})/);
      if (epochMatch) ts = Number(epochMatch[1]);
    }

    const evt = {
      rawLine: l,
      timestamp: ts || runStartTs || null,
      event: "ADAPTATION",
    };

    if (payload) {
      // Parse key-value pairs from payload
      const parts = payload.split("|").map((p) => p.trim());
      console.log(`Parts: ${JSON.stringify(parts)}`);

      for (const p of parts) {
        const kv = p.split(":");
        if (kv.length < 2) continue;
        const key = kv[0].trim();
        const val = kv.slice(1).join(":").trim();

        console.log(`  Key: ${key}, Val: ${val}`);

        // Normalize keys and extract values
        const k = key
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");

        console.log(`  Normalized key: ${k}`);

        // Handle threshold values (extract final value and track changes)
        if (k === "threshold") {
          let currentVal = val;
          if (val.includes("→")) {
            const parts = val.split("→");
            currentVal = parts[parts.length - 1].trim();
          }

          console.log(
            `  Threshold - Last: ${lastValues.threshold}, Current: ${currentVal}`
          );

          // Track actual changes by comparing with last known value
          if (
            lastValues.threshold !== null &&
            lastValues.threshold !== currentVal
          ) {
            evt.threshold_from = lastValues.threshold;
            evt.threshold_to = currentVal;
            evt.threshold = `${lastValues.threshold}→${currentVal}`;
            console.log(
              `  Change detected: ${lastValues.threshold}→${currentVal}`
            );
          } else {
            evt.threshold = currentVal;
            console.log(`  No change, using: ${currentVal}`);
          }
          lastValues.threshold = currentVal;
        }
        // Handle cooldown values
        else if (k === "cooldown") {
          let currentVal = val.replace(/ms$/, "");
          if (val.includes("→")) {
            const parts = val.split("→");
            currentVal = parts[parts.length - 1].trim().replace(/ms$/, "");
          }

          console.log(
            `  Cooldown - Last: ${lastValues.cooldown}, Current: ${currentVal}`
          );

          if (
            lastValues.cooldown !== null &&
            lastValues.cooldown !== currentVal
          ) {
            evt.cooldown_from = lastValues.cooldown;
            evt.cooldown_to = currentVal;
            evt.cooldown = `${lastValues.cooldown}→${currentVal}`;
            console.log(
              `  Change detected: ${lastValues.cooldown}→${currentVal}`
            );
          } else {
            evt.cooldown = currentVal;
            console.log(`  No change, using: ${currentVal}`);
          }
          lastValues.cooldown = currentVal;
        }
        // Handle retries values
        else if (k === "retries") {
          let currentVal = val;
          if (val.includes("→")) {
            const parts = val.split("→");
            currentVal = parts[parts.length - 1].trim();
          }

          console.log(
            `  Retries - Last: ${lastValues.retries}, Current: ${currentVal}`
          );

          if (
            lastValues.retries !== null &&
            lastValues.retries !== currentVal
          ) {
            evt.retries_from = lastValues.retries;
            evt.retries_to = currentVal;
            evt.retries = `${lastValues.retries}→${currentVal}`;
            console.log(
              `  Change detected: ${lastValues.retries}→${currentVal}`
            );
          } else {
            evt.retries = currentVal;
            console.log(`  No change, using: ${currentVal}`);
          }
          lastValues.retries = currentVal;
        }
        // Handle other fields normally
        else {
          let finalVal = val;
          if (val.includes("→")) {
            const parts = val.split("→");
            finalVal = parts[parts.length - 1].trim();
            finalVal = finalVal.replace(/ms$/, "").replace(/s$/, "");
          }
          evt[k] = finalVal;
        }
      }
    }

    console.log(`Event: ${JSON.stringify(evt, null, 2)}`);
    console.log("---");
    events.push(evt);
  }

  return events;
}

const events = parseAdaptationEventsFromLogs(logText);
console.log("\nFinal events:");
events.forEach((e, i) => {
  console.log(
    `${i + 1}. Threshold: ${e.threshold}, Cooldown: ${e.cooldown}, Retries: ${
      e.retries
    }`
  );
});
