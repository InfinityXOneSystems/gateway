/**
 * Infinity X One Gateway Server
 * Main entry point for the gateway system
 */

const http = require('http');
const https = require('https');
const { EventEmitter } = require('events');
const Router = require('./router');
const RequestHandler = require('./handler');
const config = require('../config/gateway');

class GatewayServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = { ...config, ...options };
    this.router = new Router(this.config.routing);
    this.handler = new RequestHandler(this.config.handler);
    this.server = null;
    this.middlewares = [];
  }

  /**
   * Register middleware
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Register a route
   * @param {String} path - Route path
   * @param {Object} options - Route configuration
   */
  route(path, options) {
    this.router.addRoute(path, options);
    return this;
  }

  /**
   * Start the gateway server
   * @param {Number} port - Port to listen on
   * @param {String} host - Host to bind to
   */
  async start(port = this.config.port, host = this.config.host) {
    try {
      await this._initialize();
      
      const requestListener = this._createRequestListener();
      
      if (this.config.ssl && this.config.ssl.enabled) {
        this.server = https.createServer(this.config.ssl, requestListener);
      } else {
        this.server = http.createServer(requestListener);
      }

      this.server.listen(port, host, () => {
        this.emit('started', { port, host });
        console.log(`🚀 Infinity X One Gateway started on ${host}:${port}`);
      });

      this._setupErrorHandlers();
      
      return this;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the gateway server
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }

      this.server.close((err) => {
        if (err) {
          this.emit('error', err);
          return reject(err);
        }
        this.emit('stopped');
        console.log('Gateway server stopped');
        resolve();
      });
    });
  }

  /**
   * Initialize gateway components
   * @private
   */
  async _initialize() {
    console.log('Initializing gateway components...');
    await this.router.initialize();
    await this.handler.initialize();
    this.emit('initialized');
  }

  /**
   * Create request listener
   * @private
   */
  _createRequestListener() {
    return async (req, res) => {
      const context = {
        request: req,
        response: res,
        startTime: Date.now(),
        requestId: this._generateRequestId()
      };

      try {
        // Execute middleware chain
        await this._executeMiddlewares(context);
        
        // Route the request
        const route = this.router.match(req.url, req.method);
        
        if (!route) {
          return this._sendError(res, 404, 'Route not found');
        }

        context.route = route;

        // Handle the request
        await this.handler.handle(context);

      } catch (error) {
        console.error('Request handling error:', error);
        this.emit('error', error);
        this._sendError(res, 500, 'Internal server error');
      } finally {
        const duration = Date.now() - context.startTime;
        this.emit('request', { 
          requestId: context.requestId,
          method: req.method,
          url: req.url,
          duration
        });
      }
    };
  }

  /**
   * Execute middleware chain
   * @private
   */
  async _executeMiddlewares(context) {
    for (const middleware of this.middlewares) {
      await new Promise((resolve, reject) => {
        const next = (err) => {
          if (err) return reject(err);
          resolve();
        };
        
        try {
          middleware(context.request, context.response, next);
        } catch (error) {
          reject(error);
        }
      });
    }
  }

  /**
   * Setup error handlers
   * @private
   */
  _setupErrorHandlers() {
    this.server.on('error', (error) => {
      console.error('Server error:', error);
      this.emit('error', error);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Send error response
   * @private
   */
  _sendError(res, statusCode, message) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: true,
      statusCode,
      message,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Generate unique request ID
   * @private
   */
  _generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server health status
   */
  getHealth() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      routes: this.router.getRoutes().length,
      middlewares: this.middlewares.length
    };
  }
}

module.exports = GatewayServer;
