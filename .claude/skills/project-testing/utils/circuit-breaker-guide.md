# Circuit Breaker Pattern Guide

## Overview

Prevents testing from hammering production during outages or incidents.

## States

**CLOSED** (Normal operation)

- All tests run normally
- Failures are counted
- Transition to OPEN after 5 consecutive failures

**OPEN** (Circuit tripped)

- Block all test execution immediately
- Wait 60 seconds before attempting recovery
- Transition to HALF_OPEN after timeout

**HALF_OPEN** (Testing recovery)

- Allow single test agent to run
- If succeeds 2 times: transition to CLOSED
- If fails: transition back to OPEN

## Implementation

### Circuit Breaker State Tracking

```typescript
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

const circuitState: CircuitBreakerState = {
  state: CircuitState.CLOSED,
  failureCount: 0,
  successCount: 0,
  lastFailureTime: 0,
  nextAttemptTime: 0,
};

const CONFIG = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes in half-open
  timeout: 60000, // 60 seconds
};
```

### State Transitions

```typescript
function onSuccess(): void {
  circuitState.failureCount = 0;

  if (circuitState.state === CircuitState.HALF_OPEN) {
    circuitState.successCount++;
    console.log(
      `Circuit HALF_OPEN: ${circuitState.successCount}/${CONFIG.successThreshold} successes`
    );

    if (circuitState.successCount >= CONFIG.successThreshold) {
      circuitState.state = CircuitState.CLOSED;
      circuitState.successCount = 0;
      console.log('Circuit CLOSED: Production recovered, resuming normal testing');
    }
  }
}

function onFailure(): void {
  circuitState.failureCount++;
  circuitState.successCount = 0;
  circuitState.lastFailureTime = Date.now();

  console.log(`Circuit: ${circuitState.failureCount}/${CONFIG.failureThreshold} failures`);

  if (circuitState.failureCount >= CONFIG.failureThreshold) {
    circuitState.state = CircuitState.OPEN;
    circuitState.nextAttemptTime = Date.now() + CONFIG.timeout;
    console.error(`Circuit OPEN: Production appears down, blocking tests for 60s`);
  }
}

function canExecute(): boolean {
  if (circuitState.state === CircuitState.CLOSED) {
    return true;
  }

  if (circuitState.state === CircuitState.OPEN) {
    if (Date.now() >= circuitState.nextAttemptTime) {
      // Transition to half-open
      circuitState.state = CircuitState.HALF_OPEN;
      circuitState.successCount = 0;
      console.log('Circuit HALF_OPEN: Testing production recovery');
      return true;
    }
    return false;
  }

  // HALF_OPEN: allow execution
  return true;
}
```

## Agent Instructions

**Before launching agent swarm:**

```markdown
1. Check circuit breaker state
2. If OPEN:
   - Wait until nextAttemptTime
   - Log: "Circuit OPEN - Production appears down, waiting {seconds}s"
   - After timeout, transition to HALF_OPEN
3. If HALF_OPEN:
   - Launch ONLY Agent 1 (Authentication) as test
   - If succeeds: Launch Agent 2, continue testing recovery
   - If fails: Circuit reopens, wait another 60s
4. If CLOSED:
   - Launch full agent swarm (normal operation)
```

**During test execution:**

```markdown
1. Track success/failure for each agent
2. On agent failure:
   - Increment failure count
   - Check if threshold exceeded (5 failures)
   - If yes: Open circuit, block remaining agents
3. On agent success:
   - Reset failure count
   - If in HALF_OPEN: Increment success count
   - If 2 successes in HALF_OPEN: Close circuit
```

## Workflow Integration

### Step 1: Initial Check

```markdown
Before: "Launch Agent Swarm"

Add:
**Circuit Breaker Check:**

1. Check current circuit state
2. If OPEN and timeout not expired:
   - Log: "Circuit breaker OPEN - Production unavailable"
   - Log: "Retry in {remainingSeconds} seconds"
   - ABORT test run
3. If OPEN and timeout expired:
   - Log: "Circuit transitioning to HALF_OPEN - Testing recovery"
   - Launch Agent 1 only (Authentication test)
4. If HALF_OPEN:
   - Log: "Circuit in recovery mode - Limited testing"
   - Launch agents sequentially with success tracking
5. If CLOSED:
   - Log: "Circuit breaker CLOSED - Normal operation"
   - Launch full agent swarm
```

### Step 2: Failure Handling

```markdown
After any agent fails:

1. Classify error severity:
   - Production down (5xx, timeout): Increment circuit failure count
   - Transient error (retry succeeded): Don't count toward circuit
   - Test error (4xx, validation): Don't count toward circuit

2. Check circuit state:
   - If failureCount >= 5:
     - Open circuit
     - Cancel remaining agents
     - Log: "Circuit OPEN - Too many production failures"
     - Schedule retry in 60s

3. Report status:
   - "Circuit breaker tripped after 5 production failures"
   - "Production testing suspended for 60 seconds"
   - "Next test attempt: {timestamp}"
```

## Example Scenarios

### Scenario 1: Production Outage

```
Test Run 1:
- Agent 1 fails (timeout)
- Agent 2 fails (503 error)
- Agent 3 fails (network error)
- Agent 4 fails (timeout)
- Agent 5 fails (502 error)
→ Circuit OPEN (5 consecutive failures)
→ Block all tests for 60s

Wait 60s...

Test Run 2:
- Circuit transitions to HALF_OPEN
- Agent 1 runs (test recovery)
- Agent 1 succeeds
- Agent 2 runs
- Agent 2 succeeds
→ Circuit CLOSED (2 successes in half-open)
→ Resume normal testing
```

### Scenario 2: Transient Failures

```
Test Run:
- Agent 1 fails, retries, succeeds
- Agent 2 succeeds
- Agent 3 succeeds
→ Circuit remains CLOSED (retry fixed issue)
→ Continue normal operation
```

### Scenario 3: Partial Outage

```
Test Run:
- Agent 1 succeeds (auth working)
- Agent 2 fails (assets endpoint down)
- Agent 3 fails (timeline endpoint down)
- Agent 4 fails (playback endpoint down)
- Circuit failureCount: 3 (not enough to open)
→ Circuit remains CLOSED
→ Report partial outage in results
```

## Benefits

1. **Protects Production:**
   - Stops hammering during incidents
   - Reduces load on failing systems
   - Prevents looking like DDoS attack

2. **Automatic Recovery:**
   - Tests recovery after timeout
   - Resumes testing when healthy
   - No manual intervention needed

3. **Clear Status:**
   - Developers know why tests are blocked
   - Expected recovery time visible
   - Production health indicator

## Monitoring

Log circuit state changes:

```
[Circuit] State: CLOSED → OPEN (5 failures)
[Circuit] Next attempt: 2025-10-25T13:45:00Z
[Circuit] State: OPEN → HALF_OPEN (timeout expired)
[Circuit] Testing recovery (1/2 successes)
[Circuit] State: HALF_OPEN → CLOSED (recovery confirmed)
```
