# Adaptive Fault Tolerant Middleware with Markov Chain Failure Model


A sophisticated fault-tolerant middleware system implementing adaptive resilience patterns with a Markov Chain-based failure model for realistic testing scenarios.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Markov Chain Failure Model](#markov-chain-failure-model)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Academic Analysis](#academic-analysis)
- [Performance Metrics](#performance-metrics)
- [Presentation Data](#presentation-data)
- [Technical Implementation](#technical-implementation)
- [Contributing](#contributing)

## 🔍 Overview

This project demonstrates an **adaptive middleware system** that automatically adjusts its fault-tolerance parameters based on real-time service behavior. Instead of using random failures, it employs a **5-state Markov Chain model** to simulate realistic service degradation patterns.

### Key Innovation
- **Markov Chain Failure Model**: Replaces naive random failures with academically rigorous, state-based failure patterns
- **Adaptive Configuration**: Dynamically adjusts retry counts, circuit breaker thresholds, and cooldown periods
- **Load Factor Integration**: Correlates system load with failure probabilities
- **Academic Rigor**: Provides MTBF/MTTR calculations and statistical analysis

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Service A     │────│ Adaptive        │────│   Service B     │
│  (Client App)   │    │ Middleware      │    │ (Target Service)│
│                 │    │                 │    │                 │
│ - HTTP Server   │    │ - Retry Logic   │    │ - Markov Model  │
│ - Metrics UI    │    │ - Circuit Breaker│   │ - State Machine │
│ - Log Collector │    │ - Fallback      │    │ - Load Simulation│
│ - Demo Runner   │    │ - Adaptive Tuner│    │ - MTBF/MTTR     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✨ Features

### Adaptive Middleware Components
- **🔄 Retry Mechanism**: Configurable retry logic with exponential backoff
- **⚡ Circuit Breaker**: Prevents cascading failures with adaptive thresholds
- **🛡️ Fallback Strategy**: Graceful degradation with contextual responses
- **🎯 Adaptive Tuner**: Real-time parameter adjustment based on failure rates

### Markov Chain Failure Model
- **🎭 5-State System**: HEALTHY → DEGRADED → FAILING → CRITICAL → RECOVERING
- **📊 Load Factor Integration**: System load influences transition probabilities
- **🔬 Statistical Analysis**: MTBF, MTTR, state distribution calculations
- **📈 Academic Metrics**: Transition matrices and reliability engineering data

### Monitoring & Analytics
- **📋 Real-time Logs**: Comprehensive logging with categorization
- **📊 Performance Metrics**: Response times, success rates, fallback usage
- **🎓 Academic Dashboard**: State transitions, adaptation timeline
- **📈 Excel Export**: Presentation-ready data tables

## 🎭 Markov Chain Failure Model

### State Definitions

| State | Symbol | Failure Rate | Response Delay | Description |
|-------|--------|-------------|---------------|-------------|
| 🟢 HEALTHY | H | 5% | 50ms | Normal operation, minimal failures |
| 🟡 DEGRADED | D | 25% | 200ms | Performance degradation, moderate failures |
| 🟠 FAILING | F | 60% | 800ms | System stress, majority failures |
| 🔴 CRITICAL | C | 90% | 2000ms | Near-complete failure, emergency state |
| 🔄 RECOVERING | R | 35% | 400ms | Self-healing process, improving condition |

### Transition Probability Matrix

```
P = | P_HH  P_HD  P_HF  P_HC  P_HR |
    | P_DH  P_DD  P_DF  P_DC  P_DR |
    | P_FH  P_FD  P_FF  P_FC  P_FR |
    | P_CH  P_CD  P_CF  P_CC  P_CR |
    | P_RH  P_RD  P_RF  P_RC  P_RR |
```

Where P_XY represents the probability of transitioning from state X to state Y.

### Load Factor Integration

- **Normal Load (1.0)**: Baseline failure rates
- **High Load (2.0)**: Increased failure probability, accelerated degradation
- **Low Load (0.5)**: Improved recovery probability, system stabilization

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **TypeScript** knowledge for development

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adaptive-middleware-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Service A (Client): http://localhost:3000
   - Service B (Target): http://localhost:5000

### Development Setup

```bash
# Start in development mode with hot reload
docker-compose up --build

# View logs
docker-compose logs -f service-a
docker-compose logs -f service-b
```

## 📖 Usage

### Basic Demonstration

1. **Access the demo interface**
   ```
   GET http://localhost:3000/demo
   ```

2. **Run academic demonstration**
   ```
   GET http://localhost:3000/demo/academic
   ```

3. **View metrics dashboard**
   ```
   GET http://localhost:3000/metrics
   ```

### Manual Testing

```bash
# Test Service A endpoint
curl http://localhost:3000/call-service-b

# View current statistics
curl http://localhost:3000/metrics

# Force specific Markov state (for testing)
curl -X POST http://localhost:5000/markov/force-state \
  -H "Content-Type: application/json" \
  -d '{"state": "FAILING", "duration": 30000}'
```

## 🔌 API Endpoints

### Service A (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/call-service-b` | GET | Test middleware with Service B call |
| `/demo` | GET | Interactive demonstration interface |
| `/demo/academic` | GET | Academic demonstration with all states |
| `/metrics` | GET | Real-time metrics and logs |
| `/adaptive/force` | POST | Force adaptive configuration changes |
| `/adaptive/reset` | POST | Reset adaptive parameters |

### Service B (Port 5000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/data` | GET | Main data endpoint (subject to Markov failures) |
| `/health` | GET | Service health check |
| `/markov/stats` | GET | Markov chain statistics |
| `/markov/force-state` | POST | Force specific state (testing) |
| `/markov/set-load` | POST | Set load factor |
| `/markov/natural` | GET | Switch to natural state transitions |

## 🎓 Academic Analysis

### Research Questions Addressed

1. **How do adaptive systems respond to realistic failure patterns?**
   - Measured through MTBF/MTTR analysis
   - State transition frequency correlation with adaptation speed

2. **What is the effectiveness of different resilience patterns?**
   - Retry vs Circuit Breaker vs Fallback success rates
   - Adaptive parameter optimization performance

3. **How does system load affect failure propagation?**
   - Load factor correlation with state transitions
   - Recovery probability under different load conditions

### Statistical Rigor

- **Transition Matrix Analysis**: Mathematical modeling of state changes
- **MTBF/MTTR Calculations**: Reliability engineering metrics
- **Load Correlation Studies**: System performance under varying conditions
- **Adaptive Effectiveness Metrics**: Configuration optimization tracking

## 📊 Performance Metrics

### Key Performance Indicators

- **Success Rate**: Percentage of successful requests
- **Fallback Rate**: Percentage of requests using fallback responses
- **Average Response Time**: Mean request duration across all states
- **Circuit Breaker Activations**: Frequency of circuit opening events
- **Retry Attempts**: Total number of retry operations
- **State Distribution**: Time spent in each Markov state

### Reliability Metrics

- **MTBF (Mean Time Between Failures)**: Average time between failure events
- **MTTR (Mean Time To Recovery)**: Average recovery duration
- **Availability**: System uptime percentage
- **Failure Rate**: Requests failing per unit time

## 📈 Presentation Data

### Excel Export Features

The system generates presentation-ready tables for academic analysis:

1. **Request Timeline Table**
   - Timestamp, State, Duration, Success, Load Factor
   - Suitable for time-series analysis and state transition graphs

2. **Adaptation Timeline Table**
   - Timestamp, Threshold Changes, Cooldown Adjustments, Retry Updates
   - Shows middleware evolution over time

3. **State Distribution Summary**
   - State frequencies, average durations, success rates per state
   - Perfect for pie charts and bar graphs

Generate Excel reports:
```bash
node generate-excel-report.js
```

## 🔧 Technical Implementation

### Project Structure

```
adaptive-middleware-project/
├── adaptive-middleware/          # Core middleware library
│   ├── src/
│   │   ├── circuitBreaker.ts    # Circuit breaker implementation
│   │   ├── retry.ts             # Retry logic
│   │   ├── fallback.ts          # Fallback strategies
│   │   ├── tuner.ts             # Adaptive parameter tuning
│   │   └── index.ts             # Main middleware export
├── service-a/                   # Client service
│   └── src/
│       └── index.ts             # Express server with demo endpoints
├── service-b/                   # Target service
│   └── src/
│       ├── index.ts             # Express server
│       └── markovFailureModel.ts # Markov Chain implementation
├── docker-compose.yml           # Container orchestration
└── README.md                    # This file
```

### Key Technologies

- **TypeScript**: Type-safe development
- **Express.js**: HTTP server framework
- **Docker**: Containerized deployment
- **Axios**: HTTP client with timeout support
- **ExcelJS**: Spreadsheet generation

### Configuration

The middleware adapts these parameters dynamically:

```typescript
interface AdaptiveConfig {
  threshold: number;    // Circuit breaker failure threshold (0-1)
  cooldown: number;     // Circuit breaker cooldown period (ms)
  retries: number;      // Maximum retry attempts (0-5)
}
```

## 🤝 Contributing

### Development Guidelines

1. **Follow TypeScript best practices**
2. **Add comprehensive logging for academic analysis**
3. **Include statistical calculations for new metrics**
4. **Document state transitions and their academic significance**

### Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Academic demonstration
npm run demo:academic
```

## 📚 Academic References

1. **Markov Chain Theory**: Ross, S. M. (2014). Introduction to Probability Models
2. **Reliability Engineering**: Billinton, R., & Allan, R. N. (1992). Reliability Evaluation of Engineering Systems
3. **Fault Tolerance Patterns**: Nygard, M. T. (2018). Release It!: Design and Deploy Production-Ready Software
4. **Circuit Breaker Pattern**: Martin Fowler's Circuit Breaker Pattern
5. **Adaptive Systems**: Astrom, K. J., & Wittenmark, B. (2013). Adaptive Control

## 📄 License

This project is developed for academic purposes as part of BUET MSc coursework.

---

## 👨‍🎓 About This Project

This adaptive middleware system represents a comprehensive study in fault-tolerant system design, combining theoretical computer science concepts with practical software engineering solutions. The Markov Chain failure model provides academically rigorous testing scenarios, while the adaptive middleware demonstrates real-world resilience patterns.

**Developed for**: BUET MSc Academic Project  
**Focus Area**: Distributed Systems, Fault Tolerance, Adaptive Computing  
**Keywords**: Markov Chains, Circuit Breaker, Adaptive Systems, Reliability Engineering
