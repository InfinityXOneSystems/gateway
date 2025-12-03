FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY src/ ./src/
COPY examples/ ./examples/
COPY config/ ./config/ 2>/dev/null || true

# Create non-root user
RUN addgroup -g 1001 -S gateway && \
    adduser -u 1001 -S gateway -G gateway && \
    chown -R gateway:gateway /usr/src/app

# Switch to non-root user
USER gateway

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start gateway
CMD ["node", "examples/basic.js"]
