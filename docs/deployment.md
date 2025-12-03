# Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Production Considerations](#production-considerations)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js >= 16.x
- Memory: Minimum 512MB, Recommended 2GB+
- CPU: 1+ cores (2+ cores recommended for production)
- Disk: 100MB for application, additional for logs

### Network Requirements

- Outbound access to backend services
- Inbound access on configured port (default 8080)
- DNS resolution for service discovery

## Environment Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
GATEWAY_PORT=8080
GATEWAY_HOST=0.0.0.0
NODE_ENV=production

# SSL/TLS
SSL_ENABLED=true
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem

# Authentication
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=3600

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=60000

# Timeouts
REQUEST_TIMEOUT=30000
HEALTH_CHECK_INTERVAL=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Configuration Files

Place service-specific configuration in `config/production.json`:

```json
{
  "gateway": {
    "port": 8080,
    "host": "0.0.0.0",
    "ssl": {
      "enabled": true,
      "cert": "/certs/server.crt",
      "key": "/certs/server.key"
    }
  },
  "services": {
    "users": {
      "instances": [
        "http://users-service-1:3000",
        "http://users-service-2:3000"
      ]
    },
    "products": {
      "instances": [
        "http://products-service-1:4000",
        "http://products-service-2:4000"
      ]
    }
  },
  "loadBalancer": {
    "algorithm": "least-connections"
  },
  "rateLimit": {
    "enabled": true,
    "max": 1000,
    "windowMs": 60000
  }
}
```

## Docker Deployment

### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S gateway && \
    adduser -u 1001 -S gateway -G gateway

# Change ownership
RUN chown -R gateway:gateway /usr/src/app

# Switch to non-root user
USER gateway

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start gateway
CMD ["node", "src/index.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  gateway:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - GATEWAY_PORT=8080
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./config:/usr/src/app/config:ro
      - ./logs:/usr/src/app/logs
    networks:
      - infinity-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

networks:
  infinity-network:
    driver: bridge
```

### Build and Run

```bash
# Build image
docker build -t infinityxone/gateway:latest .

# Run container
docker run -d \
  --name infinity-gateway \
  -p 8080:8080 \
  -e JWT_SECRET=your-secret \
  infinityxone/gateway:latest

# With docker-compose
docker-compose up -d
```

## Kubernetes Deployment

### Deployment Manifest

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: infinity-gateway
  labels:
    app: infinity-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: infinity-gateway
  template:
    metadata:
      labels:
        app: infinity-gateway
    spec:
      containers:
      - name: gateway
        image: infinityxone/gateway:latest
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: GATEWAY_PORT
          value: "8080"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: gateway-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Service Manifest

Create `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: infinity-gateway
spec:
  selector:
    app: infinity-gateway
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  type: LoadBalancer
```

### ConfigMap

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gateway-config
data:
  config.json: |
    {
      "gateway": {
        "port": 8080
      },
      "rateLimit": {
        "max": 1000,
        "windowMs": 60000
      }
    }
```

### Secret

Create `k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gateway-secrets
type: Opaque
stringData:
  jwt-secret: your-super-secret-key-change-this
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace infinity

# Apply configurations
kubectl apply -f k8s/secret.yaml -n infinity
kubectl apply -f k8s/configmap.yaml -n infinity
kubectl apply -f k8s/deployment.yaml -n infinity
kubectl apply -f k8s/service.yaml -n infinity

# Check status
kubectl get pods -n infinity
kubectl get svc -n infinity

# View logs
kubectl logs -f deployment/infinity-gateway -n infinity
```

## Production Considerations

### Security

1. **Use HTTPS**: Always enable SSL/TLS in production
2. **Secret Management**: Use proper secret management (Vault, AWS Secrets Manager)
3. **Network Policies**: Restrict network access between services
4. **Regular Updates**: Keep dependencies updated
5. **Security Scanning**: Use tools like Snyk or npm audit

### High Availability

1. **Multiple Replicas**: Run at least 3 instances
2. **Load Balancing**: Use external load balancer
3. **Health Checks**: Configure proper liveness and readiness probes
4. **Graceful Shutdown**: Ensure proper signal handling
5. **Circuit Breakers**: Protect against cascade failures

### Performance Tuning

1. **Node.js Optimization**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=2048"
   ```

2. **Connection Pooling**: Adjust agent settings
   ```javascript
   maxSockets: 100,
   keepAlive: true,
   keepAliveMsecs: 1000
   ```

3. **Caching**: Implement response caching where appropriate

4. **Compression**: Enable gzip/brotli compression

### Scaling Guidelines

- **Vertical Scaling**: Increase CPU/memory per instance
- **Horizontal Scaling**: Add more instances
- **Auto-scaling**: Configure based on CPU/memory/request rate

## Monitoring and Logging

### Logging

Centralized logging with ELK stack or similar:

```javascript
{
  "format": "json",
  "level": "info",
  "output": "stdout"
}
```

### Metrics

Expose Prometheus metrics:

```javascript
// Example metrics endpoint
gateway.route('/metrics', {
  target: 'internal',
  handler: (req, res) => {
    res.end(prometheusMetrics());
  }
});
```

### Monitoring Tools

- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Log aggregation
- **Jaeger**: Distributed tracing

## Troubleshooting

### Common Issues

1. **Gateway won't start**
   - Check port availability
   - Verify configuration
   - Check environment variables

2. **High latency**
   - Check backend service health
   - Review timeout settings
   - Analyze middleware overhead

3. **Memory leaks**
   - Monitor with `process.memoryUsage()`
   - Use heap snapshots
   - Check for event listener leaks

4. **Connection issues**
   - Verify network connectivity
   - Check DNS resolution
   - Review firewall rules

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

### Health Checks

Check gateway health:

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "memory": { ... }
}
```

## Backup and Recovery

### Configuration Backup

Regularly backup:
- Configuration files
- SSL certificates
- Environment variables

### Disaster Recovery

1. Document deployment process
2. Maintain infrastructure as code
3. Regular disaster recovery drills
4. Multi-region deployment for critical systems

## Updates and Rollbacks

### Rolling Updates

```bash
# Kubernetes rolling update
kubectl set image deployment/infinity-gateway \
  gateway=infinityxone/gateway:v2.0.0 -n infinity

# Monitor rollout
kubectl rollout status deployment/infinity-gateway -n infinity
```

### Rollback

```bash
# Kubernetes rollback
kubectl rollout undo deployment/infinity-gateway -n infinity
```

## Support

For deployment issues:
- Check documentation
- Review logs
- Open GitHub issue
- Contact support team
