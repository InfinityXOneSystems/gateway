# Infinity X One Gateway Architecture

## Overview

The Infinity X One Gateway System is designed as a comprehensive, modular API gateway that serves as the single entry point for all microservices in the Infinity X One platform. It follows industry best practices and implements proven patterns for building scalable, reliable distributed systems.

## Core Components

### 1. Gateway Server (`src/gateway/server.js`)

The main server component that orchestrates all gateway functionality:

- **HTTP/HTTPS Server**: Handles incoming connections using Node.js native http/https modules
- **Middleware Pipeline**: Executes middleware in order for request/response processing
- **Event System**: Uses EventEmitter for loose coupling and extensibility
- **Lifecycle Management**: Handles startup, shutdown, and graceful termination

**Key Features:**
- SSL/TLS termination
- Graceful shutdown with SIGTERM/SIGINT handling
- Request ID generation for tracing
- Error handling and recovery
- Health monitoring

### 2. Router (`src/gateway/router.js`)

Advanced routing engine with pattern matching:

- **Static Routes**: Direct path matching for performance
- **Dynamic Routes**: Parameter extraction (`:id`, `:name`)
- **Wildcard Routes**: Pattern matching with `*`
- **Method Matching**: HTTP method validation
- **Route Metadata**: Attach configuration to routes

**Routing Algorithm:**
1. Parse incoming URL
2. Try exact match first (O(1) lookup)
3. Fall back to dynamic route matching with regex
4. Extract parameters and query strings
5. Return matched route with context

### 3. Request Handler (`src/gateway/handler.js`)

Proxies requests to backend services:

- **Connection Pooling**: Reuses HTTP agents for performance
- **Retry Logic**: Exponential backoff for failed requests
- **Timeout Management**: Configurable request timeouts
- **Header Management**: Proper forwarding of headers
- **Stream Processing**: Pipes requests/responses efficiently

**Proxy Flow:**
```
Client Request → Parse Target → Build Options → Proxy → Backend Service
                                                  ↓
                        Response ← Stream ← Backend Response
```

## Middleware System

### Rate Limiting (`src/middleware/ratelimit.js`)

Implements token bucket algorithm:

- **Per-Client Tracking**: Uses IP or custom key generator
- **Sliding Window**: Accurate rate limiting
- **Configurable Limits**: Max requests and time window
- **Cleanup**: Automatic removal of expired entries

**Algorithm:**
```
For each request:
1. Get or create bucket for client
2. Check if bucket has capacity
3. If yes: Increment counter, allow request
4. If no: Return 429 Too Many Requests
5. Reset bucket when window expires
```

### Circuit Breaker (`src/middleware/circuitbreaker.js`)

Prevents cascading failures:

- **States**: CLOSED → OPEN → HALF_OPEN → CLOSED
- **Failure Tracking**: Monitors error rates
- **Automatic Recovery**: Attempts to close after timeout
- **Event Emission**: Notifies state changes

**State Machine:**
```
CLOSED (Normal operation)
  ↓ (threshold failures exceeded)
OPEN (Reject all requests)
  ↓ (timeout expired)
HALF_OPEN (Test with limited requests)
  ↓ (success) or ↑ (failure)
CLOSED or OPEN
```

### Logger (`src/middleware/logger.js`)

Comprehensive request/response logging:

- **Multiple Formats**: JSON, combined, common, dev
- **Log Levels**: debug, info, warn, error
- **Header Sanitization**: Removes sensitive data
- **Performance Tracking**: Request duration measurement

## Authentication

### JWT Authentication (`src/auth/jwt.js`)

Stateless authentication using JSON Web Tokens:

- **Token Generation**: HS256 algorithm with configurable expiration
- **Token Verification**: Signature and expiration validation
- **Role-Based Access**: Support for role checking
- **Middleware Integration**: Easy route protection

**Token Structure:**
```
Header.Payload.Signature
```

**Validation Steps:**
1. Split token into parts
2. Verify signature using secret
3. Check expiration time
4. Validate issuer
5. Return decoded payload

## Service Management

### Load Balancer (`src/routing/loadbalancer.js`)

Distributes requests across service instances:

**Algorithms:**
- **Round Robin**: Sequential distribution
- **Least Connections**: Route to least busy instance
- **Random**: Random selection
- **IP Hash**: Sticky sessions based on client IP
- **Weighted**: Distribution based on instance weights

**Health Tracking:**
- Monitors instance health status
- Automatically removes unhealthy instances
- Tracks connection count per instance

### Service Discovery (`src/routing/discovery.js`)

Dynamic service registration and discovery:

- **Registration**: Services can register/deregister
- **Health Checks**: Automatic health monitoring
- **Instance Management**: Track multiple instances per service
- **Event System**: Notifications for service changes

**Health Check Flow:**
```
Timer → Check All Instances → HTTP GET /health
         ↓                          ↓
    Update Status            200-299: Healthy
         ↓                   Others: Unhealthy
    Emit Events
```

## Request Flow

### Complete Request Lifecycle

```
1. Client Request
   ↓
2. Gateway Server receives request
   ↓
3. Generate Request ID
   ↓
4. Execute Middleware Chain
   - Logger (log request)
   - Rate Limiter (check limits)
   - Circuit Breaker (check health)
   - Auth (validate token)
   - CORS (handle preflight)
   ↓
5. Router matches URL to route
   ↓
6. Load Balancer selects instance
   ↓
7. Request Handler proxies to backend
   ↓
8. Backend processes request
   ↓
9. Response streams back to client
   ↓
10. Execute response middleware
    - Logger (log response)
    - Metrics (record stats)
    ↓
11. Client receives response
```

## Scalability Considerations

### Horizontal Scaling

The gateway is stateless and can be scaled horizontally:

- Deploy multiple gateway instances
- Use load balancer in front (e.g., nginx, HAProxy)
- Share rate limit state via Redis (future enhancement)
- Synchronize service discovery via etcd/Consul (future enhancement)

### Performance Optimizations

1. **Connection Pooling**: Reuses TCP connections
2. **Keep-Alive**: Maintains persistent connections
3. **Stream Processing**: Avoids buffering large payloads
4. **Caching**: Response caching (future enhancement)
5. **Compression**: Gzip/Brotli support (future enhancement)

## Security

### Defense in Depth

Multiple security layers:

1. **SSL/TLS Termination**: Encrypted communication
2. **Authentication**: JWT token validation
3. **Authorization**: Role-based access control
4. **Rate Limiting**: DDoS protection
5. **Input Validation**: Prevent injection attacks
6. **Header Sanitization**: Remove sensitive data from logs

### Security Best Practices

- Store JWT secrets in environment variables
- Use HTTPS in production
- Implement API key rotation
- Monitor for suspicious patterns
- Regular security audits

## Monitoring and Observability

### Metrics

Track key performance indicators:
- Request rate
- Response time
- Error rate
- Circuit breaker state
- Service health

### Logging

Structured logging for:
- All requests/responses
- Errors and exceptions
- State changes
- Health check results

### Tracing

Distributed tracing support (future):
- OpenTelemetry integration
- Request ID propagation
- Span creation

## Configuration

### Environment-Based Config

```javascript
{
  gateway: {
    port: process.env.GATEWAY_PORT || 8080,
    host: process.env.GATEWAY_HOST || '0.0.0.0'
  },
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || 3600
    }
  }
}
```

### Hot Reloading

Configuration changes require restart (by design):
- Predictable behavior
- No mid-flight request issues
- Clear deployment boundaries

## Error Handling

### Error Categories

1. **Client Errors (4xx)**: Invalid requests, authentication failures
2. **Server Errors (5xx)**: Backend failures, timeouts
3. **Gateway Errors**: Configuration issues, network problems

### Recovery Strategies

- **Retry**: Exponential backoff for transient failures
- **Fallback**: Return cached response or default value
- **Circuit Break**: Stop calling failing services
- **Graceful Degradation**: Partial functionality when services down

## Future Enhancements

1. **GraphQL Support**: GraphQL gateway functionality
2. **WebSocket Support**: Real-time bidirectional communication
3. **Service Mesh Integration**: Istio/Linkerd compatibility
4. **Advanced Analytics**: Request patterns and insights
5. **API Versioning**: Multiple API versions support
6. **Response Transformation**: Modify responses before sending to client
7. **Request Aggregation**: Combine multiple backend requests
8. **Distributed Cache**: Redis integration for shared state
