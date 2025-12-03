/**
 * Gateway Configuration
 * Default configuration for the gateway system
 */

module.exports = {
  // Server configuration
  port: process.env.GATEWAY_PORT || 8080,
  host: process.env.GATEWAY_HOST || '0.0.0.0',
  
  // SSL/TLS configuration
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    cert: process.env.SSL_CERT,
    key: process.env.SSL_KEY,
    ca: process.env.SSL_CA
  },

  // Routing configuration
  routing: {
    caseSensitive: false,
    strictRouting: false,
    mergeParams: true
  },

  // Request handler configuration
  handler: {
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    maxRedirects: parseInt(process.env.MAX_REDIRECTS) || 5,
    keepAlive: true,
    keepAliveMsecs: 1000
  },

  // CORS configuration
  cors: {
    enabled: true,
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400
  },

  // Health check configuration
  health: {
    enabled: true,
    path: '/health',
    interval: 30000
  },

  // Metrics configuration
  metrics: {
    enabled: true,
    path: '/metrics'
  }
};
