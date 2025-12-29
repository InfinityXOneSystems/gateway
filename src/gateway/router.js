/**
 * Router Module
 * Handles request routing and URL matching
 */

class Router {
  constructor(config = {}) {
    this.config = config;
    this.routes = new Map();
    this.dynamicRoutes = [];
  }

  /**
   * Initialize the router
   */
  async initialize() {
    console.log('Router initialized');
  }

  /**
   * Add a route to the router
   * @param {String} path - Route path (supports wildcards and parameters)
   * @param {Object} options - Route configuration
   */
  addRoute(path, options) {
    const route = {
      path,
      pattern: this._pathToPattern(path),
      methods: options.methods || ['GET'],
      target: options.target,
      auth: options.auth !== undefined ? options.auth : false,
      rateLimit: options.rateLimit,
      timeout: options.timeout || 30000,
      retry: options.retry || { attempts: 0, delay: 1000 },
      transform: options.transform,
      metadata: options.metadata || {}
    };

    if (this._isDynamicPath(path)) {
      this.dynamicRoutes.push(route);
    } else {
      this.routes.set(path, route);
    }

    console.log(`Route registered: ${options.methods.join(',')} ${path} -> ${options.target}`);
    return route;
  }

  /**
   * Remove a route
   * @param {String} path - Route path to remove
   */
  removeRoute(path) {
    this.routes.delete(path);
    this.dynamicRoutes = this.dynamicRoutes.filter(r => r.path !== path);
  }

  /**
   * Match a URL to a route
   * @param {String} url - Request URL
   * @param {String} method - HTTP method
   * @returns {Object|null} Matched route or null
   */
  match(url, method) {
    // Parse URL
    const parsedUrl = new URL(url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    // Try exact match first
    const exactRoute = this.routes.get(pathname);
    if (exactRoute && this._methodMatches(exactRoute, method)) {
      return {
        ...exactRoute,
        params: {},
        query: Object.fromEntries(parsedUrl.searchParams)
      };
    }

    // Try dynamic routes
    for (const route of this.dynamicRoutes) {
      const match = pathname.match(route.pattern);
      if (match && this._methodMatches(route, method)) {
        const params = this._extractParams(route.path, pathname);
        return {
          ...route,
          params,
          query: Object.fromEntries(parsedUrl.searchParams)
        };
      }
    }

    return null;
  }

  /**
   * Get all registered routes
   * @returns {Array} Array of routes
   */
  getRoutes() {
    return [
      ...Array.from(this.routes.values()),
      ...this.dynamicRoutes
    ];
  }

  /**
   * Check if path is dynamic (contains parameters)
   * @private
   */
  _isDynamicPath(path) {
    return path.includes(':') || path.includes('*');
  }

  /**
   * Convert path to regex pattern
   * @private
   */
  _pathToPattern(path) {
    // Replace :param with named capture group
    let pattern = path.replace(/:([a-zA-Z0-9_]+)/g, '(?<$1>[^/]+)');
    
    // Replace * with wildcard
    pattern = pattern.replace(/\*/g, '.*');
    
    // Anchor pattern
    pattern = `^${pattern}$`;
    
    return new RegExp(pattern);
  }

  /**
   * Extract parameters from URL
   * @private
   */
  _extractParams(routePath, urlPath) {
    const params = {};
    const routeParts = routePath.split('/');
    const urlParts = urlPath.split('/');

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        params[paramName] = urlParts[i];
      }
    }

    return params;
  }

  /**
   * Check if method matches route
   * @private
   */
  _methodMatches(route, method) {
    return route.methods.includes(method.toUpperCase());
  }

  /**
   * Clear all routes
   */
  clear() {
    this.routes.clear();
    this.dynamicRoutes = [];
  }
}

module.exports = Router;
