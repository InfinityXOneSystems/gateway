/**
 * Advanced Gateway Example
 * Demonstrates advanced features and patterns
 */

const { 
  createGateway, 
  JWTAuth, 
  rateLimit, 
  circuitBreaker,
  logger,
  LoadBalancer,
  ServiceDiscovery
} = require('../src');

// Create gateway with custom configuration
const gateway = createGateway({
  port: process.env.PORT || 8080,
  host: '0.0.0.0',
  ssl: {
    enabled: false // Set to true with cert/key in production
  }
});

// Advanced logging with JSON format
gateway.use(logger({
  format: 'json',
  level: 'info',
  excludePaths: ['/health', '/metrics']
}));

// Global rate limiting
gateway.use(rateLimit({
  max: 1000,
  windowMs: 60000,
  keyGenerator: (req) => {
    // Use API key or user ID if available, otherwise IP
    return req.headers['x-api-key'] || 
           req.user?.id || 
           req.headers['x-forwarded-for'] ||
           req.connection.remoteAddress;
  }
}));

// Global circuit breaker
const globalBreaker = circuitBreaker({
  threshold: 10,
  timeout: 60000,
  monitoringPeriod: 120000
});

globalBreaker.on('open', () => {
  console.error('⚠️  Global circuit breaker opened!');
});

globalBreaker.on('closed', () => {
  console.log('✅ Global circuit breaker closed');
});

gateway.use(globalBreaker);

// Setup JWT authentication
const auth = new JWTAuth({
  secret: process.env.JWT_SECRET || 'change-this-in-production',
  expiresIn: 3600,
  issuer: 'infinity-x-one-gateway'
});

// Setup service discovery with health checks
const discovery = new ServiceDiscovery({
  healthCheck: true,
  healthCheckInterval: 30000,
  healthCheckTimeout: 5000
});

// Listen to service health changes
discovery.on('healthChanged', ({ service, instance, healthy }) => {
  console.log(`[Discovery] ${service}/${instance}: ${healthy ? '✅' : '❌'}`);
});

// Register multiple services
const services = [
  {
    name: 'auth-service',
    instances: [
      { url: 'http://auth-service-1:3000', metadata: { healthPath: '/health', version: 'v1' } },
      { url: 'http://auth-service-2:3000', metadata: { healthPath: '/health', version: 'v1' } }
    ],
    metadata: { description: 'Authentication service' }
  },
  {
    name: 'users-service',
    instances: [
      { url: 'http://users-service-1:3001', metadata: { healthPath: '/health' } },
      { url: 'http://users-service-2:3001', metadata: { healthPath: '/health' } },
      { url: 'http://users-service-3:3001', metadata: { healthPath: '/health' } }
    ],
    metadata: { description: 'User management service' }
  },
  {
    name: 'products-service',
    instances: [
      { url: 'http://products-service-1:4000', metadata: { healthPath: '/health' } }
    ],
    metadata: { description: 'Product catalog service' }
  },
  {
    name: 'orders-service',
    instances: [
      { url: 'http://orders-service-1:5000', metadata: { healthPath: '/health' } },
      { url: 'http://orders-service-2:5000', metadata: { healthPath: '/health' } }
    ],
    metadata: { description: 'Order processing service' }
  }
];

services.forEach(service => {
  discovery.register(service);
});

// Setup load balancer with least-connections algorithm
const loadBalancer = new LoadBalancer({
  algorithm: 'least-connections'
});

// Register services with load balancer
services.forEach(({ name }) => {
  const instances = discovery.getHealthyInstances(name);
  if (instances.length > 0) {
    loadBalancer.register(name, instances.map(i => ({ url: i.url })));
  }
});

// Sync load balancer with service discovery
discovery.on('healthChanged', ({ service }) => {
  const instances = discovery.getHealthyInstances(service);
  if (instances.length > 0) {
    loadBalancer.register(service, instances.map(i => ({ url: i.url })));
  }
});

// Authentication routes (no auth required)
gateway.route('/api/auth/login', {
  target: 'http://auth-service-1:3000/login',
  methods: ['POST'],
  auth: false,
  timeout: 5000
});

gateway.route('/api/auth/register', {
  target: 'http://auth-service-1:3000/register',
  methods: ['POST'],
  auth: false,
  timeout: 5000
});

// User routes (authentication required)
gateway.route('/api/users', {
  target: 'http://users-service-1:3001/users',
  methods: ['GET'],
  auth: true,
  timeout: 5000,
  retry: { attempts: 3, delay: 1000 }
});

gateway.route('/api/users/:id', {
  target: 'http://users-service-1:3001/users',
  methods: ['GET', 'PUT', 'DELETE'],
  auth: true,
  timeout: 5000
});

// Product routes (public read, authenticated write)
gateway.route('/api/products', {
  target: 'http://products-service-1:4000/products',
  methods: ['GET'],
  auth: false,
  timeout: 5000
});

gateway.route('/api/products', {
  target: 'http://products-service-1:4000/products',
  methods: ['POST', 'PUT', 'DELETE'],
  auth: true,
  timeout: 5000
});

// Order routes (authentication required, admin only for some)
gateway.route('/api/orders', {
  target: 'http://orders-service-1:5000/orders',
  methods: ['GET', 'POST'],
  auth: true,
  timeout: 10000,
  retry: { attempts: 2, delay: 2000 }
});

gateway.route('/api/orders/:id', {
  target: 'http://orders-service-1:5000/orders',
  methods: ['GET', 'PUT', 'DELETE'],
  auth: true,
  timeout: 10000
});

// Admin routes (authentication + admin role required)
gateway.route('/api/admin/*', {
  target: 'http://admin-service:6000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  auth: true,
  timeout: 5000
});

// Add custom middleware for admin routes
gateway.use((req, res, next) => {
  if (req.url.startsWith('/api/admin')) {
    if (!req.user || !req.user.roles.includes('admin')) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Forbidden',
        message: 'Admin access required'
      }));
      return;
    }
  }
  next();
});

// Health check endpoint
gateway.route('/health', {
  target: 'internal',
  methods: ['GET'],
  auth: false
});

// Metrics endpoint
gateway.route('/metrics', {
  target: 'internal',
  methods: ['GET'],
  auth: false
});

// Service discovery status endpoint
gateway.route('/api/services', {
  target: 'internal',
  methods: ['GET'],
  auth: true
});

// Gateway events
gateway.on('started', ({ port, host }) => {
  console.log('='.repeat(80));
  console.log('🚀 Infinity X One Gateway - Advanced Configuration');
  console.log('='.repeat(80));
  console.log(`📍 Address:     http://${host}:${port}`);
  console.log(`📊 Services:    ${discovery.getAllServices().length} registered`);
  console.log(`🔀 Routes:      ${gateway.router.getRoutes().length} configured`);
  console.log(`⚡ Middlewares: ${gateway.middlewares.length} active`);
  console.log('='.repeat(80));
  
  console.log('\n📋 Service Status:');
  const stats = discovery.getStats();
  stats.services.forEach(service => {
    const status = service.healthyInstances === service.instances ? '✅' : '⚠️';
    console.log(`  ${status} ${service.name}: ${service.healthyInstances}/${service.instances} healthy`);
  });
  
  console.log('\n🌐 Available Endpoints:');
  console.log('  Public:');
  console.log('    POST /api/auth/login          - User login');
  console.log('    POST /api/auth/register       - User registration');
  console.log('    GET  /api/products            - List products');
  console.log('    GET  /health                  - Gateway health');
  console.log('\n  Authenticated:');
  console.log('    GET  /api/users               - List users');
  console.log('    GET  /api/users/:id           - Get user');
  console.log('    GET  /api/orders              - List orders');
  console.log('    POST /api/orders              - Create order');
  console.log('    GET  /api/services            - Service discovery status');
  console.log('\n  Admin Only:');
  console.log('    ALL  /api/admin/*             - Admin endpoints');
  
  console.log('\n🔐 Authentication:');
  console.log('  Header: Authorization: Bearer <token>');
  const testToken = auth.sign({ 
    userId: 'test-123', 
    username: 'testuser',
    roles: ['user']
  });
  console.log(`  Test Token: ${testToken.substring(0, 50)}...`);
  
  const adminToken = auth.sign({ 
    userId: 'admin-123', 
    username: 'admin',
    roles: ['user', 'admin']
  });
  console.log(`  Admin Token: ${adminToken.substring(0, 50)}...`);
  
  console.log('\n📈 Features Enabled:');
  console.log('  ✅ Request logging (JSON format)');
  console.log('  ✅ Rate limiting (1000 req/min)');
  console.log('  ✅ Circuit breaker');
  console.log('  ✅ JWT authentication');
  console.log('  ✅ Service discovery with health checks');
  console.log('  ✅ Load balancing (least-connections)');
  console.log('  ✅ Automatic retry');
  console.log('  ✅ Graceful shutdown');
  console.log('='.repeat(80));
});

gateway.on('error', (error) => {
  console.error('❌ Gateway error:', error);
});

// Periodic statistics
setInterval(() => {
  const health = gateway.getHealth();
  const lbStats = loadBalancer.getAllStats();
  
  console.log('\n📊 Gateway Statistics:');
  console.log(`  Uptime: ${Math.floor(health.uptime)}s`);
  console.log(`  Memory: ${Math.round(health.memory.heapUsed / 1024 / 1024)}MB / ${Math.round(health.memory.heapTotal / 1024 / 1024)}MB`);
  console.log(`  Routes: ${health.routes}`);
  
  console.log('\n⚖️  Load Balancer Status:');
  Object.entries(lbStats).forEach(([service, stats]) => {
    console.log(`  ${service}:`);
    stats.instances.forEach(instance => {
      const status = instance.healthy ? '✅' : '❌';
      console.log(`    ${status} ${instance.url} (${instance.connections} connections)`);
    });
  });
}, 60000); // Every minute

// Start the gateway
gateway.start().catch((error) => {
  console.error('Failed to start gateway:', error);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n⏸️  Shutting down gateway...');
  await gateway.stop();
  discovery.destroy();
  loadBalancer.clear();
  console.log('✅ Gateway stopped gracefully');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
