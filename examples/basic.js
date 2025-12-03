/**
 * Basic Gateway Example
 * Demonstrates how to set up and use the Infinity X One Gateway
 */

const { 
  createGateway, 
  JWTAuth, 
  rateLimit, 
  logger,
  LoadBalancer,
  ServiceDiscovery
} = require('../src');

// Create gateway instance
const gateway = createGateway({
  port: 8080,
  host: '0.0.0.0'
});

// Setup logging
gateway.use(logger({
  format: 'dev'
}));

// Setup rate limiting
gateway.use(rateLimit({
  max: 100,
  windowMs: 60000
}));

// Setup JWT authentication
const auth = new JWTAuth({
  secret: 'your-secret-key-change-in-production',
  expiresIn: 3600
});

// Setup service discovery
const discovery = new ServiceDiscovery({
  healthCheck: true,
  healthCheckInterval: 30000
});

// Register services
discovery.register({
  name: 'users-service',
  instances: [
    { url: 'http://localhost:3001', metadata: { healthPath: '/health' } },
    { url: 'http://localhost:3002', metadata: { healthPath: '/health' } }
  ]
});

discovery.register({
  name: 'products-service',
  instances: [
    { url: 'http://localhost:4001', metadata: { healthPath: '/health' } }
  ]
});

// Setup load balancer
const loadBalancer = new LoadBalancer({
  algorithm: 'round-robin'
});

// Register services with load balancer
const usersInstances = discovery.getHealthyInstances('users-service');
loadBalancer.register('users-service', usersInstances.map(i => ({ url: i.url })));

// Define routes
gateway.route('/api/users/*', {
  target: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  auth: true,
  timeout: 5000
});

gateway.route('/api/products/*', {
  target: 'http://localhost:4001',
  methods: ['GET'],
  auth: false,
  timeout: 5000
});

// Public route - no authentication required
gateway.route('/api/public/status', {
  target: 'http://localhost:5001/status',
  methods: ['GET'],
  auth: false
});

// Health check endpoint
gateway.route('/health', {
  target: 'internal',
  methods: ['GET'],
  auth: false
});

// Listen for gateway events
gateway.on('started', ({ port, host }) => {
  console.log('='.repeat(60));
  console.log('🚀 Infinity X One Gateway Started');
  console.log('='.repeat(60));
  console.log(`📍 Address: http://${host}:${port}`);
  console.log(`📊 Services: ${discovery.getAllServices().length}`);
  console.log(`🔀 Routes: ${gateway.router.getRoutes().length}`);
  console.log('='.repeat(60));
  console.log('\nAvailable endpoints:');
  console.log('  GET  /health              - Gateway health check');
  console.log('  GET  /api/users/*         - Users service (authenticated)');
  console.log('  POST /api/users/*         - Users service (authenticated)');
  console.log('  GET  /api/products/*      - Products service (public)');
  console.log('  GET  /api/public/status   - Status endpoint (public)');
  console.log('\n💡 Tip: Use JWT authentication for protected routes');
  console.log('   Example: Authorization: Bearer <token>\n');
});

gateway.on('error', (error) => {
  console.error('Gateway error:', error);
});

gateway.on('request', ({ requestId, method, url, duration }) => {
  // Request logging is handled by logger middleware
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nShutting down gateway...');
  await gateway.stop();
  discovery.destroy();
  process.exit(0);
});

// Start the gateway
gateway.start().catch((error) => {
  console.error('Failed to start gateway:', error);
  process.exit(1);
});

// Example: Generate a JWT token for testing
console.log('\n🔑 Example JWT Token for testing:');
const exampleToken = auth.sign({
  userId: '12345',
  username: 'testuser',
  roles: ['user']
});
console.log(exampleToken);
console.log('\nUse this token in requests: Authorization: Bearer <token>\n');
