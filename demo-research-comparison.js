#!/usr/bin/env node
// demo-research-comparison.js
// Quick demonstration of the MSc research comparison framework

console.log("🎓 MSc Research Comparison Framework Demo");
console.log("=".repeat(50));

console.log(`
📊 RESEARCH OBJECTIVE: Compare Adaptive Middleware vs OPPSUM

This framework allows you to:

1. 🧪 Run Controlled Experiments:
   - Adaptive Middleware (dynamic threshold adjustment)
   - OPPSUM Static Configuration (fixed thresholds)

2. 📈 Generate Research Data:
   - Request timelines for both approaches
   - Performance metrics (success rate, response time, throughput)
   - Adaptation events (only for adaptive middleware)

3. 📋 Produce Research Reports:
   - Side-by-side comparison Excel reports
   - Statistical analysis and improvements
   - Research insights for your thesis

🚀 USAGE EXAMPLES:

# Quick 5-minute test comparison:
node run-comparison-study.js --quick

# Full 6-hour research study:
node run-comparison-study.js

# Run only adaptive experiments:
node run-comparison-study.js --adaptive

# Run only OPPSUM baselines:
node run-comparison-study.js --oppsum

# Generate comparison report:
node generate-compare-report.js --auto

📝 RESEARCH DATA GENERATED:

For OPPSUM (Static):
✓ request-timeline.json - All requests with response times
✓ compose-logs.txt - Static configuration logs (no adaptations)
✓ service-*-statistics.json - Performance metrics
✓ Excel report with static performance data

For Adaptive Middleware:
✓ request-timeline.json - All requests with response times  
✓ compose-logs.txt - Dynamic adaptation events
✓ Adaptation_Timeline sheet - All threshold adjustments
✓ service-*-statistics.json - Performance metrics
✓ Excel report with adaptation timeline

📊 COMPARISON ANALYSIS:
✓ Success rate improvements
✓ Response time reductions
✓ Throughput increases
✓ Adaptation effectiveness
✓ Statistical significance testing

🎯 RESEARCH QUESTIONS ANSWERED:
1. Does adaptive middleware improve system resilience?
2. How much performance improvement does adaptation provide?
3. How frequently does the system adapt to changing conditions?
4. What is the trade-off between adaptation overhead and benefits?

Ready to start your research comparison? Run:
node run-comparison-study.js --quick
`);

console.log("🎉 Framework ready for BUET MSc research!");
