# Quick Start Guide

Get the Infinity X One Gateway up and running in minutes!

## Prerequisites

- Node.js >= 16.x
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/InfinityXOneSystems/gateway.git
cd gateway
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Gateway

```bash
npm start
```

The gateway will start on `http://localhost:8080`

## Quick Test

### Health Check

```bash
curl http://localhost:8080/health
```

### Generate a Test Token

The basic example automatically generates a JWT token on startup. Look for this in the console output:

```
🔑 Example JWT Token for testing:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Test Authenticated Endpoint

```bash
# Replace <token> with the token from console output
curl -H "Authorization: Bearer <token>" \
     http://localhost:8080/api/users/123
```

## Docker Quick Start

### Using Docker

```bash
# Build the image
docker build -t infinityxone/gateway .

# Run the container
docker run -p 8080:8080 \
  -e JWT_SECRET=your-secret-key \
  infinityxone/gateway
```

### Using Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f gateway

# Stop services
docker-compose down
```

## Kubernetes Quick Start

### Deploy to Kubernetes

```bash
# Deploy using provided script
./scripts/k8s-deploy.sh

# Check status
kubectl get pods -n infinity-gateway

# Get service URL
kubectl get svc infinity-gateway -n infinity-gateway
```

### Access the Gateway

```bash
# Port forward for local access
kubectl port-forward svc/infinity-gateway 8080:80 -n infinity-gateway

# Test
curl http://localhost:8080/health
```

## Basic Configuration

### Environment Variables

Create a `.env` file:

```bash
GATEWAY_PORT=8080
JWT_SECRET=your-super-secret-key
LOG_LEVEL=info
RATE_LIMIT_MAX=1000
```

### Add Your First Route

Edit `examples/basic.js`:

```javascript
gateway.route('/api/myservice/*', {
  target: 'http://my-backend:3000',
  methods: ['GET', 'POST'],
  auth: true,
  timeout: 5000
});
```

## Common Use Cases

### Public API Endpoint

```javascript
gateway.route('/api/public/data', {
  target: 'http://data-service:4000/data',
  methods: ['GET'],
  auth: false  // No authentication required
});
```

### Protected API with Roles

```javascript
// In your application
gateway.use(auth.middleware({
  required: true,
  roles: ['admin']
}));

gateway.route('/api/admin/*', {
  target: 'http://admin-service:5000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  auth: true
});
```

### Rate Limited Endpoint

```javascript
const { rateLimit } = require('./src');

gateway.use(rateLimit({
  max: 100,        // 100 requests
  windowMs: 60000  // per minute
}));
```

## Next Steps

1. **Read the Documentation**
   - [Architecture Guide](docs/architecture.md)
   - [API Documentation](docs/api.md)
   - [Deployment Guide](docs/deployment.md)

2. **Explore Examples**
   - Basic: `examples/basic.js`
   - Advanced: `examples/advanced.js`

3. **Configure Services**
   - Set up service discovery
   - Configure load balancing
   - Add circuit breakers

4. **Deploy to Production**
   - Use Docker or Kubernetes
   - Configure SSL/TLS
   - Set up monitoring

## Getting Help

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/InfinityXOneSystems/gateway/issues)
- 💬 [Discussions](https://github.com/InfinityXOneSystems/gateway/discussions)

## Quick Reference

### Common Commands

```bash
# Development
npm start              # Start gateway
npm run dev           # Start with hot reload

# Docker
docker-compose up     # Start with Docker
docker-compose logs   # View logs
docker-compose down   # Stop services

# Kubernetes
kubectl get pods -n infinity-gateway
kubectl logs -f deployment/infinity-gateway -n infinity-gateway
kubectl describe pod <pod-name> -n infinity-gateway
```

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `GATEWAY_PORT` | Gateway port | 8080 |
| `GATEWAY_HOST` | Gateway host | 0.0.0.0 |
| `JWT_SECRET` | JWT signing secret | (required) |
| `LOG_LEVEL` | Log level | info |
| `RATE_LIMIT_MAX` | Max requests | 100 |
| `REQUEST_TIMEOUT` | Request timeout (ms) | 30000 |

### Health Check Endpoints

- `GET /health` - Gateway health status
- `GET /metrics` - Prometheus metrics (if configured)

### Default Ports

- Gateway: 8080
- Health check: Same as gateway port

## Troubleshooting

### Gateway Won't Start

```bash
# Check if port is in use
lsof -i :8080

# Check logs
npm start 2>&1 | tee gateway.log
```

### Connection Refused

- Verify backend services are running
- Check service URLs in configuration
- Review firewall rules

### Authentication Failing

- Verify JWT_SECRET is set correctly
- Check token expiration
- Ensure Authorization header format: `Bearer <token>`

---

**🎉 Congratulations!** You now have a running gateway. Start building your microservices architecture!
