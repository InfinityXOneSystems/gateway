/**
 * Infinity X One Gateway System
 * Main entry point
 */

const GatewayServer = require('./gateway/server');
const Router = require('./gateway/router');
const RequestHandler = require('./gateway/handler');
const JWTAuth = require('./auth/jwt');
const rateLimit = require('./middleware/ratelimit');
const circuitBreaker = require('./middleware/circuitbreaker');
const logger = require('./middleware/logger');
const LoadBalancer = require('./routing/loadbalancer');
const ServiceDiscovery = require('./routing/discovery');

module.exports = {
  // Core components
  GatewayServer,
  Router,
  RequestHandler,
  
  // Authentication
  JWTAuth,
  
  // Middleware
  rateLimit,
  circuitBreaker,
  logger,
  
  // Service management
  LoadBalancer,
  ServiceDiscovery,
  
  // Convenience function to create a gateway
  createGateway: (config) => new GatewayServer(config)
};
