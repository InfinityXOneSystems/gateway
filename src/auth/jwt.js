/**
 * JWT Authentication Module
 * Handles JWT token generation and validation
 */

const crypto = require('crypto');

class JWTAuth {
  constructor(config = {}) {
    this.secret = config.secret || this._generateSecret();
    this.algorithm = config.algorithm || 'HS256';
    this.expiresIn = config.expiresIn || 3600; // 1 hour default
    this.issuer = config.issuer || 'infinity-x-one-gateway';
  }

  /**
   * Generate a JWT token
   * @param {Object} payload - Token payload
   * @param {Object} options - Token options
   * @returns {String} JWT token
   */
  sign(payload, options = {}) {
    const header = {
      alg: this.algorithm,
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + (options.expiresIn || this.expiresIn),
      iss: this.issuer
    };

    const encodedHeader = this._base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this._base64UrlEncode(JSON.stringify(tokenPayload));
    const signature = this._sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify and decode a JWT token
   * @param {String} token - JWT token
   * @returns {Object} Decoded payload
   */
  verify(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const [encodedHeader, encodedPayload, signature] = parts;
      
      // Verify signature
      const expectedSignature = this._sign(`${encodedHeader}.${encodedPayload}`);
      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      // Decode payload
      const payload = JSON.parse(this._base64UrlDecode(encodedPayload));

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired');
      }

      return payload;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Express/Connect middleware for JWT authentication
   * @param {Object} options - Middleware options
   * @returns {Function} Middleware function
   */
  middleware(options = {}) {
    return (req, res, next) => {
      try {
        // Extract token from header
        const token = this._extractToken(req);
        
        if (!token) {
          if (options.required !== false) {
            return this._sendUnauthorized(res, 'No token provided');
          }
          return next();
        }

        // Verify token
        const payload = this.verify(token);

        // Check roles if specified
        if (options.roles && options.roles.length > 0) {
          if (!payload.roles || !this._hasRole(payload.roles, options.roles)) {
            return this._sendForbidden(res, 'Insufficient permissions');
          }
        }

        // Attach user to request
        req.user = payload;
        next();
      } catch (error) {
        this._sendUnauthorized(res, error.message);
      }
    };
  }

  /**
   * Extract token from request
   * @private
   */
  _extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Check query parameter
    if (req.query && req.query.token) {
      return req.query.token;
    }

    // Check cookie
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    return null;
  }

  /**
   * Check if user has required role
   * @private
   */
  _hasRole(userRoles, requiredRoles) {
    return requiredRoles.some(role => userRoles.includes(role));
  }

  /**
   * Sign data with HMAC
   * @private
   */
  _sign(data) {
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
  }

  /**
   * Base64 URL encode
   * @private
   */
  _base64UrlEncode(str) {
    return Buffer.from(str)
      .toString('base64url');
  }

  /**
   * Base64 URL decode
   * @private
   */
  _base64UrlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf8');
  }

  /**
   * Generate random secret
   * @private
   */
  _generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send unauthorized response
   * @private
   */
  _sendUnauthorized(res, message) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message
    }));
  }

  /**
   * Send forbidden response
   * @private
   */
  _sendForbidden(res, message) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Forbidden',
      message
    }));
  }
}

module.exports = JWTAuth;
