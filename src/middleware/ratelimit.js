/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for rate limiting
 */

class RateLimiter {
  constructor(config = {}) {
    this.max = config.max || 100; // Max requests per window
    this.windowMs = config.windowMs || 60000; // Time window in ms (1 minute default)
    this.message = config.message || 'Too many requests, please try again later';
    this.statusCode = config.statusCode || 429;
    this.keyGenerator = config.keyGenerator || this._defaultKeyGenerator;
    this.skip = config.skip || (() => false);
    
    // Store for tracking requests
    this.store = new Map();
    
    // Cleanup old entries periodically
    this._startCleanup();
  }

  /**
   * Create middleware function
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      // Skip if configured to skip
      if (this.skip(req)) {
        return next();
      }

      // Generate key for this client
      const key = this.keyGenerator(req);
      
      // Get or create bucket for this key
      const bucket = this._getBucket(key);
      
      // Check if request is allowed
      if (this._isAllowed(bucket)) {
        // Add headers
        res.setHeader('X-RateLimit-Limit', this.max);
        res.setHeader('X-RateLimit-Remaining', bucket.remaining);
        res.setHeader('X-RateLimit-Reset', bucket.resetTime);
        
        next();
      } else {
        // Rate limit exceeded
        res.statusCode = this.statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-RateLimit-Limit', this.max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', bucket.resetTime);
        res.setHeader('Retry-After', Math.ceil((bucket.resetTime - Date.now()) / 1000));
        
        res.end(JSON.stringify({
          error: 'Too Many Requests',
          message: this.message,
          retryAfter: Math.ceil((bucket.resetTime - Date.now()) / 1000)
        }));
      }
    };
  }

  /**
   * Get or create bucket for key
   * @private
   */
  _getBucket(key) {
    const now = Date.now();
    let bucket = this.store.get(key);
    
    if (!bucket || now >= bucket.resetTime) {
      // Create new bucket
      bucket = {
        count: 0,
        remaining: this.max,
        resetTime: now + this.windowMs
      };
      this.store.set(key, bucket);
    }
    
    return bucket;
  }

  /**
   * Check if request is allowed
   * @private
   */
  _isAllowed(bucket) {
    if (bucket.count < this.max) {
      bucket.count++;
      bucket.remaining = this.max - bucket.count;
      return true;
    }
    return false;
  }

  /**
   * Default key generator using IP address
   * @private
   */
  _defaultKeyGenerator(req) {
    return req.headers['x-forwarded-for'] || 
           req.socket?.remoteAddress ||
           'unknown';
  }

  /**
   * Start cleanup interval
   * @private
   */
  _startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.store.entries()) {
        if (now >= bucket.resetTime) {
          this.store.delete(key);
        }
      }
    }, this.windowMs);
    
    // Don't keep process alive for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Reset rate limit for a specific key
   * @param {String} key - Key to reset
   */
  reset(key) {
    this.store.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll() {
    this.store.clear();
  }

  /**
   * Get current stats for a key
   * @param {String} key - Key to get stats for
   */
  getStats(key) {
    const bucket = this.store.get(key);
    if (!bucket) {
      return {
        count: 0,
        remaining: this.max,
        resetTime: null
      };
    }
    return { ...bucket };
  }

  /**
   * Cleanup and stop
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Factory function to create rate limiter middleware
 * @param {Object} config - Rate limiter configuration
 * @returns {Function} Middleware function
 */
function rateLimit(config) {
  const limiter = new RateLimiter(config);
  return limiter.middleware();
}

module.exports = rateLimit;
module.exports.RateLimiter = RateLimiter;
