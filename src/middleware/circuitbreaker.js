/**
 * Circuit Breaker Middleware
 * Implements circuit breaker pattern for fault tolerance
 */

const { EventEmitter } = require('events');

const States = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

class CircuitBreaker extends EventEmitter {
  constructor(config = {}) {
    super();
    this.threshold = config.threshold || 5; // Failures before opening
    this.timeout = config.timeout || 60000; // Time before attempting reset (1 minute)
    this.resetTimeout = config.resetTimeout || 10000; // Time in half-open before closing
    this.monitoringPeriod = config.monitoringPeriod || 60000; // Period to track failures
    
    this.state = States.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Execute function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @returns {Promise} Result of function execution
   */
  async execute(fn) {
    // Check circuit state
    if (!this._canExecute()) {
      const error = new Error('Circuit breaker is OPEN');
      error.code = 'CIRCUIT_OPEN';
      throw error;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  /**
   * Create middleware function
   * @returns {Function} Express middleware
   */
  middleware() {
    return async (req, res, next) => {
      if (!this._canExecute()) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Circuit breaker is OPEN - service temporarily unavailable',
          retryAfter: Math.ceil((this.nextAttemptTime - Date.now()) / 1000)
        }));
        return;
      }

      // Intercept response to track success/failure
      const originalEnd = res.end;
      const self = this;
      
      res.end = function(...args) {
        if (res.statusCode >= 500) {
          self._onFailure(new Error(`HTTP ${res.statusCode}`));
        } else {
          self._onSuccess();
        }
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Check if execution is allowed
   * @private
   */
  _canExecute() {
    const now = Date.now();

    switch (this.state) {
      case States.CLOSED:
        return true;

      case States.OPEN:
        // Check if timeout has passed
        if (now >= this.nextAttemptTime) {
          this._transitionTo(States.HALF_OPEN);
          return true;
        }
        return false;

      case States.HALF_OPEN:
        return true;

      default:
        return true;
    }
  }

  /**
   * Handle successful execution
   * @private
   */
  _onSuccess() {
    if (this.state === States.HALF_OPEN) {
      this.successes++;
      if (this.successes >= Math.ceil(this.threshold / 2)) {
        this._transitionTo(States.CLOSED);
      }
    } else if (this.state === States.CLOSED) {
      // Clean old failures
      this._cleanOldFailures();
    }
  }

  /**
   * Handle failed execution
   * @private
   */
  _onFailure(error) {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failures.push(now);

    // Clean old failures
    this._cleanOldFailures();

    if (this.state === States.HALF_OPEN) {
      // Failure during half-open, reopen circuit
      this._transitionTo(States.OPEN);
    } else if (this.state === States.CLOSED) {
      // Check if threshold is exceeded
      if (this.failures.length >= this.threshold) {
        this._transitionTo(States.OPEN);
      }
    }

    this.emit('failure', { error, state: this.state, failures: this.failures.length });
  }

  /**
   * Transition to a new state
   * @private
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    const now = Date.now();

    switch (newState) {
      case States.OPEN:
        this.nextAttemptTime = now + this.timeout;
        this.emit('open', { from: oldState, nextAttempt: this.nextAttemptTime });
        break;

      case States.HALF_OPEN:
        this.successes = 0;
        this.emit('halfOpen', { from: oldState });
        break;

      case States.CLOSED:
        this.failures = [];
        this.successes = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        this.emit('closed', { from: oldState });
        break;
    }

    console.log(`Circuit breaker: ${oldState} -> ${newState}`);
  }

  /**
   * Clean old failures outside monitoring period
   * @private
   */
  _cleanOldFailures() {
    const now = Date.now();
    const cutoff = now - this.monitoringPeriod;
    this.failures = this.failures.filter(time => time > cutoff);
  }

  /**
   * Get current state and stats
   */
  getStats() {
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Manually open the circuit
   */
  open() {
    this._transitionTo(States.OPEN);
  }

  /**
   * Manually close the circuit
   */
  close() {
    this._transitionTo(States.CLOSED);
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.state = States.CLOSED;
    this.emit('reset');
  }
}

/**
 * Factory function to create circuit breaker middleware
 * @param {Object} config - Circuit breaker configuration
 * @returns {Function} Middleware function
 */
function circuitBreaker(config) {
  const breaker = new CircuitBreaker(config);
  return breaker.middleware();
}

module.exports = circuitBreaker;
module.exports.CircuitBreaker = CircuitBreaker;
module.exports.States = States;
