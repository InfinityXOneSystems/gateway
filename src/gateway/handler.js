/**
 * Request Handler
 * Handles proxying requests to backend services
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class RequestHandler {
  constructor(config = {}) {
    this.config = config;
    this.agents = {
      http: new http.Agent({ keepAlive: true, maxSockets: 50 }),
      https: new https.Agent({ keepAlive: true, maxSockets: 50 })
    };
  }

  /**
   * Initialize the handler
   */
  async initialize() {
    console.log('Request handler initialized');
  }

  /**
   * Handle incoming request and proxy to backend service
   * @param {Object} context - Request context
   */
  async handle(context) {
    const { request, response, route } = context;
    
    try {
      // Build target URL
      const targetUrl = this._buildTargetUrl(route, request.url);
      
      // Prepare proxy request
      const proxyOptions = this._buildProxyOptions(targetUrl, request, route);
      
      // Execute request with retry logic
      const result = await this._executeWithRetry(
        () => this._proxyRequest(proxyOptions, request, response),
        route.retry
      );
      
      return result;
    } catch (error) {
      console.error('Handler error:', error);
      throw error;
    }
  }

  /**
   * Build target URL
   * @private
   */
  _buildTargetUrl(route, requestUrl) {
    const url = new URL(requestUrl, 'http://localhost');
    const targetBase = new URL(route.target);
    
    // Combine paths
    let targetPath = url.pathname;
    if (route.path !== '/' && targetPath.startsWith(route.path)) {
      targetPath = targetPath.slice(route.path.length) || '/';
    }
    
    // Build final URL
    targetBase.pathname = targetPath;
    targetBase.search = url.search;
    
    return targetBase.toString();
  }

  /**
   * Build proxy request options
   * @private
   */
  _buildProxyOptions(targetUrl, request, route) {
    const target = new URL(targetUrl);
    const isHttps = target.protocol === 'https:';
    
    return {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname + target.search,
      method: request.method,
      headers: this._buildHeaders(request.headers, target),
      timeout: route.timeout,
      agent: isHttps ? this.agents.https : this.agents.http
    };
  }

  /**
   * Build proxy headers
   * @private
   */
  _buildHeaders(requestHeaders, target) {
    const headers = { ...requestHeaders };
    
    // Update host header
    headers.host = target.host;
    
    // Add X-Forwarded headers
    headers['x-forwarded-proto'] = target.protocol.replace(':', '');
    headers['x-forwarded-host'] = requestHeaders.host;
    
    // Remove connection headers
    delete headers.connection;
    delete headers['keep-alive'];
    delete headers['proxy-connection'];
    delete headers['transfer-encoding'];
    
    return headers;
  }

  /**
   * Proxy request to backend
   * @private
   */
  _proxyRequest(options, clientRequest, clientResponse) {
    return new Promise((resolve, reject) => {
      const protocol = options.protocol === 'https:' ? https : http;
      
      const proxyRequest = protocol.request(options, (proxyResponse) => {
        // Set response headers
        clientResponse.writeHead(
          proxyResponse.statusCode,
          proxyResponse.headers
        );
        
        // Pipe response
        proxyResponse.pipe(clientResponse);
        
        proxyResponse.on('end', () => {
          resolve({
            statusCode: proxyResponse.statusCode,
            headers: proxyResponse.headers
          });
        });
      });

      // Handle errors
      proxyRequest.on('error', (error) => {
        console.error('Proxy request error:', error);
        reject(error);
      });

      // Handle timeout
      proxyRequest.on('timeout', () => {
        proxyRequest.destroy();
        reject(new Error('Request timeout'));
      });

      // Pipe client request to proxy request
      clientRequest.pipe(proxyRequest);
    });
  }

  /**
   * Execute request with retry logic
   * @private
   */
  async _executeWithRetry(fn, retryConfig = {}) {
    const { attempts = 0, delay = 1000 } = retryConfig;
    let lastError;

    for (let i = 0; i <= attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i < attempts) {
          console.log(`Retry attempt ${i + 1}/${attempts} after ${delay}ms`);
          await this._sleep(delay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.agents.http.destroy();
    this.agents.https.destroy();
  }
}

module.exports = RequestHandler;
