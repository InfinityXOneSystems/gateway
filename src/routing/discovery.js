/**
 * Service Discovery
 * Dynamic service registration and discovery
 */

const { EventEmitter } = require('events');

class ServiceDiscovery extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.services = new Map();
    this.healthCheckInterval = config.healthCheckInterval || 30000;
    this.healthCheckTimeout = config.healthCheckTimeout || 5000;
    this.healthChecks = new Map();
  }

  /**
   * Register a service
   * @param {Object} service - Service definition
   */
  register(service) {
    const { name, instances, metadata = {} } = service;
    
    if (!name || !instances || !instances.length) {
      throw new Error('Service name and instances are required');
    }

    const serviceData = {
      name,
      instances: instances.map(instance => ({
        id: instance.id || this._generateId(),
        url: instance.url,
        metadata: instance.metadata || {},
        healthy: true,
        lastCheck: null,
        registeredAt: Date.now()
      })),
      metadata,
      registeredAt: Date.now()
    };

    this.services.set(name, serviceData);
    
    // Start health checks if enabled
    if (this.config.healthCheck) {
      this._startHealthChecks(name);
    }

    this.emit('registered', { name, instances: serviceData.instances.length });
    console.log(`Service registered: ${name} with ${instances.length} instance(s)`);
    
    return serviceData;
  }

  /**
   * Deregister a service
   * @param {String} name - Service name
   */
  deregister(name) {
    if (this.services.has(name)) {
      this._stopHealthChecks(name);
      this.services.delete(name);
      this.emit('deregistered', { name });
      console.log(`Service deregistered: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Get service by name
   * @param {String} name - Service name
   * @returns {Object|null} Service definition or null
   */
  getService(name) {
    return this.services.get(name) || null;
  }

  /**
   * Get all services
   * @returns {Array} Array of services
   */
  getAllServices() {
    return Array.from(this.services.values());
  }

  /**
   * Get healthy instances for a service
   * @param {String} name - Service name
   * @returns {Array} Array of healthy instances
   */
  getHealthyInstances(name) {
    const service = this.services.get(name);
    if (!service) {
      return [];
    }
    return service.instances.filter(i => i.healthy);
  }

  /**
   * Update instance health status
   * @param {String} serviceName - Service name
   * @param {String} instanceId - Instance ID
   * @param {Boolean} healthy - Health status
   */
  updateHealth(serviceName, instanceId, healthy) {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    const instance = service.instances.find(i => i.id === instanceId);
    if (instance) {
      const wasHealthy = instance.healthy;
      instance.healthy = healthy;
      instance.lastCheck = Date.now();

      if (wasHealthy !== healthy) {
        this.emit('healthChanged', {
          service: serviceName,
          instance: instanceId,
          healthy
        });
        console.log(`Instance ${instanceId} of ${serviceName} is now ${healthy ? 'healthy' : 'unhealthy'}`);
      }
      return true;
    }
    return false;
  }

  /**
   * Start health checks for a service
   * @private
   */
  _startHealthChecks(serviceName) {
    if (this.healthChecks.has(serviceName)) {
      return;
    }

    const interval = setInterval(() => {
      this._performHealthChecks(serviceName);
    }, this.healthCheckInterval);

    this.healthChecks.set(serviceName, interval);
    
    // Perform initial check
    this._performHealthChecks(serviceName);
  }

  /**
   * Stop health checks for a service
   * @private
   */
  _stopHealthChecks(serviceName) {
    const interval = this.healthChecks.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.healthChecks.delete(serviceName);
    }
  }

  /**
   * Perform health checks for all instances of a service
   * @private
   */
  async _performHealthChecks(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      return;
    }

    const checks = service.instances.map(instance => 
      this._checkInstance(serviceName, instance)
    );

    await Promise.allSettled(checks);
  }

  /**
   * Check health of a single instance
   * @private
   */
  async _checkInstance(serviceName, instance) {
    try {
      const healthUrl = instance.metadata.healthPath 
        ? `${instance.url}${instance.metadata.healthPath}`
        : `${instance.url}/health`;

      const response = await this._fetch(healthUrl, {
        timeout: this.healthCheckTimeout
      });

      const healthy = response.statusCode >= 200 && response.statusCode < 300;
      this.updateHealth(serviceName, instance.id, healthy);
    } catch (error) {
      this.updateHealth(serviceName, instance.id, false);
    }
  }

  /**
   * Simple HTTP fetch with timeout
   * @private
   */
  _fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      const http = url.startsWith('https') ? require('https') : require('http');
      
      const req = http.get(url, { timeout: options.timeout }, (res) => {
        resolve({ statusCode: res.statusCode });
        res.resume(); // Consume response data
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get discovery statistics
   */
  getStats() {
    const stats = {
      totalServices: this.services.size,
      services: []
    };

    for (const [name, service] of this.services) {
      const healthyInstances = service.instances.filter(i => i.healthy).length;
      stats.services.push({
        name,
        instances: service.instances.length,
        healthyInstances,
        registeredAt: service.registeredAt
      });
    }

    return stats;
  }

  /**
   * Cleanup and stop all health checks
   */
  destroy() {
    for (const [name] of this.healthChecks) {
      this._stopHealthChecks(name);
    }
    this.services.clear();
  }
}

module.exports = ServiceDiscovery;
