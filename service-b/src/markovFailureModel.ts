/**
 * Markov Chain Failure Model for Service B
 * Academic Implementation for BUET MSc Project
 *
 * This model represents service states and transitions using a Markov Chain
 * providing realistic failure patterns for testing adaptive middleware
 */

export enum ServiceState {
  HEALTHY = "HEALTHY",
  DEGRADED = "DEGRADED",
  FAILING = "FAILING",
  CRITICAL = "CRITICAL",
  RECOVERING = "RECOVERING",
}

interface StateTransition {
  from: ServiceState;
  to: ServiceState;
  probability: number;
}

interface StateMetrics {
  failureRate: number;
  responseDelay: number; // in milliseconds
  errorTypes: Array<{ status: number; message: string; weight: number }>;
}

interface MarkovStatistics {
  currentState: ServiceState;
  stateHistory: Array<{
    state: ServiceState;
    timestamp: number;
    duration: number;
  }>;
  transitionCount: Map<string, number>;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Recovery
  stateDistribution: Map<ServiceState, number>;
}

export class MarkovFailureModel {
  private currentState: ServiceState = ServiceState.HEALTHY;
  private stateStartTime: number = Date.now();
  private statistics: MarkovStatistics;
  private transitionMatrix: Map<ServiceState, StateTransition[]>;
  private stateMetrics: Map<ServiceState, StateMetrics>;
  private lastTransitionTime: number = Date.now();
  private loadFactor: number = 1.0; // External load influence

  constructor() {
    this.transitionMatrix = new Map();
    this.stateMetrics = new Map();
    this.statistics = {
      currentState: this.currentState,
      stateHistory: [],
      transitionCount: new Map(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      mtbf: 0,
      mttr: 0,
      stateDistribution: new Map(),
    };

    this.initializeTransitionMatrix();
    this.initializeStateMetrics();
    this.initializeStatistics();
    this.startStateTransitionTimer();
  }

  private initializeTransitionMatrix() {
    this.transitionMatrix = new Map([
      [
        ServiceState.HEALTHY,
        [
          {
            from: ServiceState.HEALTHY,
            to: ServiceState.HEALTHY,
            probability: 0.85,
          },
          {
            from: ServiceState.HEALTHY,
            to: ServiceState.DEGRADED,
            probability: 0.12,
          },
          {
            from: ServiceState.HEALTHY,
            to: ServiceState.FAILING,
            probability: 0.03,
          },
        ],
      ],
      [
        ServiceState.DEGRADED,
        [
          {
            from: ServiceState.DEGRADED,
            to: ServiceState.HEALTHY,
            probability: 0.3,
          },
          {
            from: ServiceState.DEGRADED,
            to: ServiceState.DEGRADED,
            probability: 0.5,
          },
          {
            from: ServiceState.DEGRADED,
            to: ServiceState.FAILING,
            probability: 0.18,
          },
          {
            from: ServiceState.DEGRADED,
            to: ServiceState.CRITICAL,
            probability: 0.02,
          },
        ],
      ],
      [
        ServiceState.FAILING,
        [
          {
            from: ServiceState.FAILING,
            to: ServiceState.DEGRADED,
            probability: 0.25,
          },
          {
            from: ServiceState.FAILING,
            to: ServiceState.FAILING,
            probability: 0.45,
          },
          {
            from: ServiceState.FAILING,
            to: ServiceState.CRITICAL,
            probability: 0.25,
          },
          {
            from: ServiceState.FAILING,
            to: ServiceState.RECOVERING,
            probability: 0.05,
          },
        ],
      ],
      [
        ServiceState.CRITICAL,
        [
          {
            from: ServiceState.CRITICAL,
            to: ServiceState.CRITICAL,
            probability: 0.7,
          },
          {
            from: ServiceState.CRITICAL,
            to: ServiceState.RECOVERING,
            probability: 0.25,
          },
          {
            from: ServiceState.CRITICAL,
            to: ServiceState.FAILING,
            probability: 0.05,
          },
        ],
      ],
      [
        ServiceState.RECOVERING,
        [
          {
            from: ServiceState.RECOVERING,
            to: ServiceState.HEALTHY,
            probability: 0.4,
          },
          {
            from: ServiceState.RECOVERING,
            to: ServiceState.DEGRADED,
            probability: 0.35,
          },
          {
            from: ServiceState.RECOVERING,
            to: ServiceState.RECOVERING,
            probability: 0.2,
          },
          {
            from: ServiceState.RECOVERING,
            to: ServiceState.FAILING,
            probability: 0.05,
          },
        ],
      ],
    ]);
  }

  private initializeStateMetrics() {
    this.stateMetrics = new Map([
      [
        ServiceState.HEALTHY,
        {
          failureRate: 0.05, // 5% failure rate
          responseDelay: 50, // 50ms average delay
          errorTypes: [
            { status: 500, message: "Minor Internal Error", weight: 0.6 },
            { status: 503, message: "Temporary Unavailable", weight: 0.4 },
          ],
        },
      ],
      [
        ServiceState.DEGRADED,
        {
          failureRate: 0.25, // 25% failure rate
          responseDelay: 200, // 200ms average delay
          errorTypes: [
            { status: 500, message: "Internal Server Error", weight: 0.4 },
            { status: 503, message: "Service Degraded", weight: 0.3 },
            { status: 408, message: "Request Timeout", weight: 0.3 },
          ],
        },
      ],
      [
        ServiceState.FAILING,
        {
          failureRate: 0.6, // 60% failure rate
          responseDelay: 800, // 800ms average delay
          errorTypes: [
            { status: 500, message: "System Overloaded", weight: 0.3 },
            { status: 503, message: "Service Failing", weight: 0.4 },
            { status: 502, message: "Bad Gateway", weight: 0.2 },
            { status: 408, message: "Timeout", weight: 0.1 },
          ],
        },
      ],
      [
        ServiceState.CRITICAL,
        {
          failureRate: 0.9, // 90% failure rate
          responseDelay: 2000, // 2000ms average delay
          errorTypes: [
            { status: 503, message: "Service Critical", weight: 0.5 },
            { status: 500, message: "Critical System Error", weight: 0.3 },
            { status: 502, message: "Gateway Failure", weight: 0.2 },
          ],
        },
      ],
      [
        ServiceState.RECOVERING,
        {
          failureRate: 0.35, // 35% failure rate (better than failing)
          responseDelay: 400, // 400ms average delay
          errorTypes: [
            { status: 503, message: "Service Recovering", weight: 0.6 },
            { status: 500, message: "Recovery Error", weight: 0.4 },
          ],
        },
      ],
    ]);
  }

  private initializeStatistics() {
    this.statistics = {
      currentState: this.currentState,
      stateHistory: [
        { state: this.currentState, timestamp: Date.now(), duration: 0 },
      ],
      transitionCount: new Map(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      mtbf: 0,
      mttr: 0,
      stateDistribution: new Map(),
    };
  }

  private startStateTransitionTimer() {
    // Check for state transitions every 5-15 seconds (random)
    const checkInterval = 5000 + Math.random() * 10000;

    setTimeout(() => {
      this.checkStateTransition();
      this.startStateTransitionTimer();
    }, checkInterval);
  }

  private checkStateTransition() {
    const transitions = this.transitionMatrix.get(this.currentState);
    if (!transitions) return;

    // Apply load factor influence on transition probabilities
    const adjustedTransitions = this.adjustTransitionsForLoad(transitions);

    const random = Math.random();
    let cumulativeProbability = 0;

    for (const transition of adjustedTransitions) {
      cumulativeProbability += transition.probability;
      if (random <= cumulativeProbability) {
        if (transition.to !== this.currentState) {
          this.transitionToState(transition.to);
        }
        break;
      }
    }
  }

  private adjustTransitionsForLoad(
    transitions: StateTransition[],
  ): StateTransition[] {
    // Higher load increases probability of moving to worse states
    return transitions.map((transition) => {
      let adjustedProbability = transition.probability;

      if (this.loadFactor > 1.5) {
        // High load: increase probability of degradation
        if (
          transition.to === ServiceState.DEGRADED ||
          transition.to === ServiceState.FAILING ||
          transition.to === ServiceState.CRITICAL
        ) {
          adjustedProbability *= 1.3;
        } else if (transition.to === ServiceState.HEALTHY) {
          adjustedProbability *= 0.7;
        }
      } else if (this.loadFactor < 0.5) {
        // Low load: increase probability of recovery
        if (
          transition.to === ServiceState.HEALTHY ||
          transition.to === ServiceState.RECOVERING
        ) {
          adjustedProbability *= 1.2;
        }
      }

      return { ...transition, probability: adjustedProbability };
    });
  }

  private transitionToState(newState: ServiceState) {
    const now = Date.now();
    const stateDuration = now - this.stateStartTime;

    // Record transition statistics
    const transitionKey = `${this.currentState}->${newState}`;
    const currentCount =
      this.statistics.transitionCount.get(transitionKey) || 0;
    this.statistics.transitionCount.set(transitionKey, currentCount + 1);

    // Update state history
    this.statistics.stateHistory.push({
      state: newState,
      timestamp: now,
      duration: stateDuration,
    });

    // Keep only last 100 state changes
    if (this.statistics.stateHistory.length > 100) {
      this.statistics.stateHistory.shift();
    }

    console.log(
      `🔄 [Markov Model] State transition: ${this.currentState} -> ${newState} (${stateDuration}ms in previous state)`,
    );

    this.currentState = newState;
    this.statistics.currentState = newState;
    this.stateStartTime = now;
    this.lastTransitionTime = now;
  }

  public processRequest(): {
    shouldFail: boolean;
    responseDelay: number;
    errorDetails?: any;
  } {
    this.statistics.totalRequests++;

    const stateMetric = this.stateMetrics.get(this.currentState);
    if (!stateMetric) {
      throw new Error(`No metrics defined for state: ${this.currentState}`);
    }

    // Adjust failure rate based on load
    const adjustedFailureRate = Math.min(
      0.95,
      stateMetric.failureRate * this.loadFactor,
    );
    const shouldFail = Math.random() < adjustedFailureRate;

    // Add some randomness to response delay (±50%)
    const delayVariation = 0.5;
    const responseDelay =
      stateMetric.responseDelay * (1 + (Math.random() - 0.5) * delayVariation);

    if (shouldFail) {
      this.statistics.failedRequests++;

      // Select error type based on weights
      const errorTypes = stateMetric.errorTypes;
      const totalWeight = errorTypes.reduce(
        (sum, error) => sum + error.weight,
        0,
      );
      let random = Math.random() * totalWeight;

      for (const errorType of errorTypes) {
        random -= errorType.weight;
        if (random <= 0) {
          return {
            shouldFail: true,
            responseDelay: Math.round(responseDelay),
            errorDetails: {
              status: errorType.status,
              message: errorType.message,
              state: this.currentState,
              loadFactor: this.loadFactor.toFixed(2),
            },
          };
        }
      }
    } else {
      this.statistics.successfulRequests++;
    }

    return {
      shouldFail: false,
      responseDelay: Math.round(responseDelay),
    };
  }

  public setLoadFactor(load: number) {
    this.loadFactor = Math.max(0.1, Math.min(3.0, load)); // Clamp between 0.1 and 3.0
    console.log(
      `📊 [Markov Model] Load factor set to: ${this.loadFactor.toFixed(2)}`,
    );
  }

  public getStatistics(): MarkovStatistics {
    this.updateCalculatedStatistics();
    return { ...this.statistics };
  }

  private updateCalculatedStatistics() {
    // Calculate MTBF and MTTR
    const failureStates = [ServiceState.FAILING, ServiceState.CRITICAL];
    const healthyStates = [ServiceState.HEALTHY, ServiceState.RECOVERING];

    let totalFailureTime = 0;
    let totalHealthyTime = 0;
    let failureCount = 0;
    let recoveryCount = 0;

    for (let i = 0; i < this.statistics.stateHistory.length; i++) {
      const entry = this.statistics.stateHistory[i];

      if (failureStates.includes(entry.state)) {
        totalFailureTime += entry.duration;
        failureCount++;
      } else if (healthyStates.includes(entry.state)) {
        totalHealthyTime += entry.duration;
        recoveryCount++;
      }
    }

    this.statistics.mtbf =
      failureCount > 0 ? totalHealthyTime / failureCount : 0;
    this.statistics.mttr =
      recoveryCount > 0 ? totalFailureTime / recoveryCount : 0;

    // Calculate state distribution
    this.statistics.stateDistribution.clear();
    for (const entry of this.statistics.stateHistory) {
      const currentCount =
        this.statistics.stateDistribution.get(entry.state) || 0;
      this.statistics.stateDistribution.set(entry.state, currentCount + 1);
    }

    // Calculate average response time (approximation)
    this.statistics.averageResponseTime =
      this.statistics.totalRequests > 0
        ? (this.statistics.successfulRequests * 200 +
            this.statistics.failedRequests * 800) /
          this.statistics.totalRequests
        : 0;
  }

  public getCurrentState(): ServiceState {
    return this.currentState;
  }

  public forceStateTransition(targetState: ServiceState) {
    console.log(`🎯 [Markov Model] Forced transition to: ${targetState}`);
    this.transitionToState(targetState);
  }

  public getTransitionMatrix(): Map<ServiceState, StateTransition[]> {
    return new Map(this.transitionMatrix);
  }
}
