# Gateway API Documentation

## Gateway Server API

### Creating a Gateway

```javascript
const { createGateway } = require('@infinityxone/gateway');

const gateway = createGateway({
  port: 8080,
  host: '0.0.0.0',
  ssl: {
    enabled: false
  }
});
```

**Options:**
- `port` (Number): Port to listen on (default: 8080)
- `host` (String): Host to bind to (default: '0.0.0.0')
- `ssl` (Object): SSL configuration
  - `enabled` (Boolean): Enable HTTPS
  - `cert` (String): Path to certificate file
  - `key` (String): Path to key file
- `timeout` (Number): Request timeout in ms (default: 30000)

### Methods

#### `gateway.use(middleware)`

Register middleware function.

```javascript
gateway.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

#### `gateway.route(path, options)`

Register a route.

```javascript
gateway.route('/api/users/*', {
  target: 'http://users-service:3000',
  methods: ['GET', 'POST'],
  auth: true,
  timeout: 5000
});
```

**Parameters:**
- `path` (String): Route path (supports `:params` and `*` wildcards)
- `options` (Object):
  - `target` (String): Backend service URL
  - `methods` (Array): Allowed HTTP methods
  - `auth` (Boolean): Require authentication (default: false)
  - `timeout` (Number): Request timeout
  - `retry` (Object): Retry configuration
    - `attempts` (Number): Number of retries
    - `delay` (Number): Delay between retries in ms

#### `gateway.start(port, host)`

Start the gateway server.

```javascript
await gateway.start(8080, '0.0.0.0');
```

#### `gateway.stop()`

Stop the gateway server.

```javascript
await gateway.stop();
```

#### `gateway.getHealth()`

Get gateway health status.

```javascript
const health = gateway.getHealth();
// {
//   status: 'healthy',
//   uptime: 12345,
//   memory: { ... },
//   routes: 5,
//   middlewares: 3
// }
```

### Events

#### `started`

Emitted when gateway starts successfully.

```javascript
gateway.on('started', ({ port, host }) => {
  console.log(`Gateway started on ${host}:${port}`);
});
```

#### `stopped`

Emitted when gateway stops.

```javascript
gateway.on('stopped', () => {
  console.log('Gateway stopped');
});
```

#### `error`

Emitted when an error occurs.

```javascript
gateway.on('error', (error) => {
  console.error('Gateway error:', error);
});
```

#### `request`

Emitted for each request.

```javascript
gateway.on('request', ({ requestId, method, url, duration }) => {
  console.log(`${requestId}: ${method} ${url} - ${duration}ms`);
});
```

## Authentication API

### JWT Authentication

```javascript
const { JWTAuth } = require('@infinityxone/gateway');

const auth = new JWTAuth({
  secret: 'your-secret-key',
  expiresIn: 3600,
  issuer: 'my-gateway'
});
```

**Options:**
- `secret` (String): Secret key for signing tokens
- `expiresIn` (Number): Token expiration in seconds (default: 3600)
- `algorithm` (String): Algorithm to use (default: 'HS256')
- `issuer` (String): Token issuer (default: 'infinity-x-one-gateway')

### Methods

#### `auth.sign(payload, options)`

Generate a JWT token.

```javascript
const token = auth.sign({
  userId: '12345',
  username: 'john',
  roles: ['user', 'admin']
});
```

**Returns:** JWT token string

#### `auth.verify(token)`

Verify and decode a JWT token.

```javascript
try {
  const payload = auth.verify(token);
  console.log(payload.userId);
} catch (error) {
  console.error('Invalid token:', error.message);
}
```

**Returns:** Decoded payload object

**Throws:** Error if token is invalid or expired

#### `auth.middleware(options)`

Create authentication middleware.

```javascript
gateway.use(auth.middleware({
  required: true,
  roles: ['admin']
}));
```

**Options:**
- `required` (Boolean): Require token (default: true)
- `roles` (Array): Required roles

## Middleware API

### Rate Limiting

```javascript
const { rateLimit } = require('@infinityxone/gateway');

gateway.use(rateLimit({
  max: 100,
  windowMs: 60000,
  message: 'Too many requests'
}));
```

**Options:**
- `max` (Number): Maximum requests per window (default: 100)
- `windowMs` (Number): Time window in milliseconds (default: 60000)
- `message` (String): Error message
- `statusCode` (Number): HTTP status code (default: 429)
- `keyGenerator` (Function): Custom key generator
- `skip` (Function): Skip rate limiting for certain requests

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds until retry allowed

### Circuit Breaker

```javascript
const { circuitBreaker } = require('@infinityxone/gateway');

gateway.use(circuitBreaker({
  threshold: 5,
  timeout: 60000
}));
```

**Options:**
- `threshold` (Number): Failures before opening circuit (default: 5)
- `timeout` (Number): Time before attempting reset in ms (default: 60000)
- `resetTimeout` (Number): Time in half-open before closing (default: 10000)
- `monitoringPeriod` (Number): Period to track failures (default: 60000)

**States:**
- `CLOSED`: Normal operation
- `OPEN`: Circuit is open, requests are rejected
- `HALF_OPEN`: Testing if service recovered

### Logger

```javascript
const { logger } = require('@infinityxone/gateway');

gateway.use(logger({
  format: 'combined',
  level: 'info'
}));
```

**Options:**
- `format` (String): Log format ('combined', 'common', 'dev', 'json')
- `level` (String): Log level ('debug', 'info', 'warn', 'error')
- `excludePaths` (Array): Paths to exclude from logging
- `logBody` (Boolean): Log request/response bodies (default: false)
- `maxBodyLength` (Number): Max body length to log (default: 1000)

## Service Management API

### Load Balancer

```javascript
const { LoadBalancer } = require('@infinityxone/gateway');

const lb = new LoadBalancer({
  algorithm: 'round-robin'
});
```

**Algorithms:**
- `round-robin`: Sequential distribution
- `least-connections`: Route to least busy instance
- `random`: Random selection
- `ip-hash`: Sticky sessions
- `weighted`: Distribution based on weights

### Methods

#### `lb.register(serviceName, instances)`

Register service instances.

```javascript
lb.register('users-service', [
  { url: 'http://localhost:3001', weight: 1 },
  { url: 'http://localhost:3002', weight: 2 }
]);
```

#### `lb.getNext(serviceName, context)`

Get next available instance.

```javascript
const instance = lb.getNext('users-service', {
  clientIp: '192.168.1.1'
});
```

#### `lb.release(serviceName, instanceUrl)`

Release instance after request.

```javascript
lb.release('users-service', 'http://localhost:3001');
```

#### `lb.setHealth(serviceName, instanceUrl, healthy)`

Update instance health.

```javascript
lb.setHealth('users-service', 'http://localhost:3001', false);
```

#### `lb.getStats(serviceName)`

Get load balancer statistics.

```javascript
const stats = lb.getStats('users-service');
```

### Service Discovery

```javascript
const { ServiceDiscovery } = require('@infinityxone/gateway');

const discovery = new ServiceDiscovery({
  healthCheck: true,
  healthCheckInterval: 30000
});
```

**Options:**
- `healthCheck` (Boolean): Enable health checks
- `healthCheckInterval` (Number): Health check interval in ms
- `healthCheckTimeout` (Number): Health check timeout in ms

### Methods

#### `discovery.register(service)`

Register a service.

```javascript
discovery.register({
  name: 'users-service',
  instances: [
    { 
      url: 'http://localhost:3001',
      metadata: { healthPath: '/health' }
    }
  ],
  metadata: { version: '1.0.0' }
});
```

#### `discovery.deregister(name)`

Deregister a service.

```javascript
discovery.deregister('users-service');
```

#### `discovery.getService(name)`

Get service by name.

```javascript
const service = discovery.getService('users-service');
```

#### `discovery.getHealthyInstances(name)`

Get healthy instances for a service.

```javascript
const instances = discovery.getHealthyInstances('users-service');
```

#### `discovery.updateHealth(serviceName, instanceId, healthy)`

Update instance health status.

```javascript
discovery.updateHealth('users-service', 'instance-1', true);
```

#### `discovery.getStats()`

Get discovery statistics.

```javascript
const stats = discovery.getStats();
```

### Events

#### `registered`

Emitted when a service is registered.

```javascript
discovery.on('registered', ({ name, instances }) => {
  console.log(`Service ${name} registered with ${instances} instances`);
});
```

#### `deregistered`

Emitted when a service is deregistered.

```javascript
discovery.on('deregistered', ({ name }) => {
  console.log(`Service ${name} deregistered`);
});
```

#### `healthChanged`

Emitted when instance health changes.

```javascript
discovery.on('healthChanged', ({ service, instance, healthy }) => {
  console.log(`${service}/${instance} is now ${healthy ? 'healthy' : 'unhealthy'}`);
});
```

## Error Handling

### Error Responses

All errors return JSON format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Route not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Gateway error
- `502 Bad Gateway`: Backend service error
- `503 Service Unavailable`: Circuit breaker open or service down
- `504 Gateway Timeout`: Backend service timeout

## Best Practices

1. **Always use HTTPS in production**
2. **Store secrets in environment variables**
3. **Implement proper error handling**
4. **Use health checks for all services**
5. **Configure appropriate timeouts**
6. **Monitor rate limits and adjust as needed**
7. **Implement circuit breakers for external services**
8. **Use structured logging**
9. **Set up proper CORS configuration**
10. **Regularly update dependencies**
