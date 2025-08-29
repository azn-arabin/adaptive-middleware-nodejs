/**
 * Markov Chain Failure Model for Service B
 * Academic Implementation for BUET MSc Project
 *
 * This model represents service states and transitions using a Markov Chain
 * providing realistic failure patterns for testing adaptive middleware
 */

import { EventEmitter } from "events";

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

  // New: seeded RNG and configurable transition interval
  private random: () => number;
  private minTransitionIntervalMs: number;
  private maxTransitionIntervalMs: number;

  // Event emitter for external hooks
  private emitter: EventEmitter = new EventEmitter();

  constructor(options?: {
    seed?: number;
    minTransitionIntervalMs?: number;
    maxTransitionIntervalMs?: number;
  }) {
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

    // Initialize RNG - if seed provided use deterministic PRNG, otherwise use Math.random
    const seed = options?.seed;
    if (typeof seed === "number") {
      this.random = this.createSeededRandom(seed);
    } else {
      this.random = Math.random;
    }

    // Configure transition interval bounds (defaults: 5000-15000 ms)
    this.minTransitionIntervalMs = options?.minTransitionIntervalMs ?? 5000;
    this.maxTransitionIntervalMs = options?.maxTransitionIntervalMs ?? 15000;

    this.initializeTransitionMatrix();
    this.initializeStateMetrics();
    this.initializeStatistics();
    this.startStateTransitionTimer();
  }

  // Mulberry32 PRNG for deterministic behavior when seeded
  private createSeededRandom(seed: number): () => number {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
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
          failureRate: 0.05,
          responseDelay: 50,
          errorTypes: [
            { status: 500, message: "Minor Internal Error", weight: 0.6 },
            { status: 503, message: "Temporary Unavailable", weight: 0.4 },
          ],
        },
      ],
      [
        ServiceState.DEGRADED,
        {
          failureRate: 0.25,
          responseDelay: 200,
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
          failureRate: 0.6,
          responseDelay: 800,
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
          failureRate: 0.9,
          responseDelay: 2000,
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
          failureRate: 0.35,
          responseDelay: 400,
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
    const interval =
      this.minTransitionIntervalMs +
      Math.floor(
        this.random() *
          (this.maxTransitionIntervalMs - this.minTransitionIntervalMs),
      );

    setTimeout(() => {
      this.checkStateTransition();
      this.startStateTransitionTimer();
    }, interval);
  }

  private checkStateTransition() {
    const transitions = this.transitionMatrix.get(this.currentState);
    if (!transitions) return;

    const adjustedTransitions = this.adjustTransitionsForLoad(transitions);

    const random = this.random();
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
    const adjusted = transitions.map((transition) => {
      let adjustedProbability = transition.probability;

      if (this.loadFactor > 1.5) {
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
        if (
          transition.to === ServiceState.HEALTHY ||
          transition.to === ServiceState.RECOVERING
        ) {
          adjustedProbability *= 1.2;
        }
      }

      return { ...transition, probability: adjustedProbability };
    });

    // robust normalization
    let sum = adjusted.reduce(
      (s, t) => s + (Number.isFinite(t.probability) ? t.probability : 0),
      0,
    );
    if (!Number.isFinite(sum) || sum <= 0) {
      const origSum = transitions.reduce(
        (s, t) => s + (Number.isFinite(t.probability) ? t.probability : 0),
        0,
      );
      if (Number.isFinite(origSum) && origSum > 0) {
        return transitions.map((t) => ({
          ...t,
          probability: t.probability / origSum,
        }));
      }
      const uniform = 1 / transitions.length;
      return transitions.map((t) => ({ ...t, probability: uniform }));
    }

    const normalized = adjusted.map((t) => ({
      ...t,
      probability: t.probability / sum,
    }));
    const total = normalized.reduce((s, t) => s + t.probability, 0);
    const diff = 1 - total;
    if (Math.abs(diff) > 1e-12) {
      let maxIdx = 0;
      for (let i = 1; i < normalized.length; i++) {
        if (normalized[i].probability > normalized[maxIdx].probability)
          maxIdx = i;
      }
      normalized[maxIdx] = {
        ...normalized[maxIdx],
        probability: normalized[maxIdx].probability + diff,
      };
    }

    return normalized;
  }

  // Allow external code to listen for transitions
  public onTransition(
    callback: (from: ServiceState, to: ServiceState) => void,
  ) {
    this.emitter.on(
      "transition",
      ({ from, to }: { from: ServiceState; to: ServiceState }) =>
        callback(from, to),
    );
  }

  private transitionToState(newState: ServiceState) {
    const now = Date.now();
    const stateDuration = now - this.stateStartTime;

    const transitionKey = `${this.currentState}->${newState}`;
    const currentCount =
      this.statistics.transitionCount.get(transitionKey) || 0;
    this.statistics.transitionCount.set(transitionKey, currentCount + 1);

    this.statistics.stateHistory.push({
      state: newState,
      timestamp: now,
      duration: stateDuration,
    });
    if (this.statistics.stateHistory.length > 100)
      this.statistics.stateHistory.shift();

    // Emit transition event for external listeners
    try {
      this.emitter.emit("transition", {
        from: this.currentState,
        to: newState,
      });
    } catch (e) {
      // ignore emitter errors
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
    if (!stateMetric)
      throw new Error(`No metrics defined for state: ${this.currentState}`);

    const adjustedFailureRate = Math.min(
      0.95,
      stateMetric.failureRate * this.loadFactor,
    );
    const shouldFail = this.random() < adjustedFailureRate;

    const delayVariation = 0.5;
    const responseDelay = Math.round(
      stateMetric.responseDelay * (1 + (this.random() - 0.5) * delayVariation),
    );

    if (shouldFail) {
      this.statistics.failedRequests++;

      const errorTypes = stateMetric.errorTypes;
      const totalWeight = errorTypes.reduce((sum, e) => sum + e.weight, 0);
      let r = this.random() * totalWeight;
      for (const errorType of errorTypes) {
        r -= errorType.weight;
        if (r <= 0) {
          return {
            shouldFail: true,
            responseDelay,
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

    return { shouldFail: false, responseDelay };
  }

  public setLoadFactor(load: number) {
    this.loadFactor = Math.max(0.1, Math.min(3.0, load));
    console.log(
      `📊 [Markov Model] Load factor set to: ${this.loadFactor.toFixed(2)}`,
    );
  }

  public getStatistics(): MarkovStatistics {
    this.updateCalculatedStatistics();
    return { ...this.statistics };
  }

  private updateCalculatedStatistics() {
    const failureStates = [ServiceState.FAILING, ServiceState.CRITICAL];
    const healthyStates = [ServiceState.HEALTHY, ServiceState.RECOVERING];

    let totalFailureTime = 0;
    let totalHealthyTime = 0;
    let failureCount = 0;
    let recoveryCount = 0;

    for (const entry of this.statistics.stateHistory) {
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

    this.statistics.stateDistribution.clear();
    for (const entry of this.statistics.stateHistory) {
      this.statistics.stateDistribution.set(
        entry.state,
        (this.statistics.stateDistribution.get(entry.state) || 0) + 1,
      );
    }

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
