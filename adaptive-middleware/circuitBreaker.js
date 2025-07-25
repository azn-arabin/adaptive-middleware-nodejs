let failureWindow = [];
const windowSize = 10;
let circuitOpen = false;
let lastOpened = null;
const cooldown = 10000; // 10 seconds

function recordResult(success) {
  failureWindow.push(success);
  if (failureWindow.length > windowSize) {
    failureWindow.shift();
  }

  const failureRate =
    failureWindow.filter((r) => !r).length / failureWindow.length;
  if (failureRate >= 0.5 && !circuitOpen) {
    circuitOpen = true;
    lastOpened = Date.now();
    console.log(`[Circuit Breaker] OPENED (failure rate = ${failureRate})`);
  } else if (circuitOpen && Date.now() - lastOpened > cooldown) {
    console.log(`[Circuit Breaker] HALF-OPEN: Trying request...`);
    circuitOpen = false;
  }
}

function shouldAllowRequest() {
  if (circuitOpen && Date.now() - lastOpened < cooldown) {
    return false;
  }
  return true;
}

module.exports = { recordResult, shouldAllowRequest };
