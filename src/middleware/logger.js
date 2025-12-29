/**
 * Logger Middleware
 * Comprehensive request/response logging
 */

class Logger {
  constructor(config = {}) {
    this.format = config.format || 'combined'; // 'combined', 'common', 'dev', 'json'
    this.level = config.level || 'info'; // 'debug', 'info', 'warn', 'error'
    this.excludePaths = config.excludePaths || ['/health', '/metrics'];
    this.logBody = config.logBody !== false;
    this.maxBodyLength = config.maxBodyLength || 1000;
  }

  /**
   * Create middleware function
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      // Skip excluded paths
      if (this._shouldExclude(req.url)) {
        return next();
      }

      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] || this._generateId();

      // Log request
      this._logRequest(req, requestId);

      // Intercept response
      const originalEnd = res.end;
      const self = this;
      
      res.end = function(...args) {
        const duration = Date.now() - startTime;
        self._logResponse(req, res, duration, requestId);
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Log request
   * @private
   */
  _logRequest(req, requestId) {
    const logData = {
      timestamp: new Date().toISOString(),
      requestId,
      type: 'request',
      method: req.method,
      url: req.url,
      headers: this._sanitizeHeaders(req.headers),
      ip: this._getClientIp(req),
      userAgent: req.headers['user-agent']
    };

    this._log('info', logData);
  }

  /**
   * Log response
   * @private
   */
  _logResponse(req, res, duration, requestId) {
    const logData = {
      timestamp: new Date().toISOString(),
      requestId,
      type: 'response',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length') || 0
    };

    const level = this._getLogLevel(res.statusCode);
    this._log(level, logData);
  }

  /**
   * Write log
   * @private
   */
  _log(level, data) {
    if (!this._shouldLog(level)) {
      return;
    }

    const message = this._formatLog(data);
    
    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      default:
        console.log(message);
    }
  }

  /**
   * Format log message
   * @private
   */
  _formatLog(data) {
    switch (this.format) {
      case 'json':
        return JSON.stringify(data);
      
      case 'dev':
        if (data.type === 'response') {
          const color = this._getStatusColor(data.statusCode);
          return `${data.method} ${data.url} ${color}${data.statusCode}\x1b[0m ${data.duration}`;
        }
        return `${data.method} ${data.url}`;
      
      case 'common':
        if (data.type === 'response') {
          return `${data.ip} - - [${data.timestamp}] "${data.method} ${data.url}" ${data.statusCode} ${data.contentLength}`;
        }
        return '';
      
      case 'combined':
      default:
        if (data.type === 'response') {
          return `${data.ip} - - [${data.timestamp}] "${data.method} ${data.url}" ${data.statusCode} ${data.contentLength} "${data.headers?.referer || '-'}" "${data.headers?.['user-agent'] || '-'}"`;
        }
        return '';
    }
  }

  /**
   * Get log level based on status code
   * @private
   */
  _getLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  /**
   * Get status color for terminal
   * @private
   */
  _getStatusColor(statusCode) {
    if (statusCode >= 500) return '\x1b[31m'; // Red
    if (statusCode >= 400) return '\x1b[33m'; // Yellow
    if (statusCode >= 300) return '\x1b[36m'; // Cyan
    if (statusCode >= 200) return '\x1b[32m'; // Green
    return '\x1b[0m'; // Reset
  }

  /**
   * Check if should log at level
   * @private
   */
  _shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Check if path should be excluded
   * @private
   */
  _shouldExclude(url) {
    return this.excludePaths.some(path => url.startsWith(path));
  }

  /**
   * Sanitize headers (remove sensitive data)
   * @private
   */
  _sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '***';
      }
    }
    
    return sanitized;
  }

  /**
   * Get client IP address
   * @private
   */
  _getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.socket?.remoteAddress ||
           'unknown';
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Factory function to create logger middleware
 * @param {Object} config - Logger configuration
 * @returns {Function} Middleware function
 */
function logger(config) {
  const loggerInstance = new Logger(config);
  return loggerInstance.middleware();
}

module.exports = logger;
module.exports.Logger = Logger;
