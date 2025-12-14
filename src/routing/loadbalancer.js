/**
 * Load Balancer
 * Implements various load balancing algorithms
 */

class LoadBalancer {
  constructor(config = {}) {
    this.algorithm = config.algorithm || 'round-robin';
    this.services = new Map();
  }

  /**
   * Register a service with multiple instances
   * @param {String} serviceName - Name of the service
   * @param {Array} instances - Array of service instances
   */
  register(serviceName, instances) {
    this.services.set(serviceName, {
      instances: instances.map(instance => ({
        ...instance,
        healthy: true,
        connections: 0,
        lastUsed: 0
      })),
      currentIndex: 0
    });
  }

  /**
   * Get next available instance for a service
   * @param {String} serviceName - Name of the service
   * @param {Object} context - Request context
   * @returns {Object|null} Service instance or null
   */
  getNext(serviceName, context = {}) {
    const service = this.services.get(serviceName);
    if (!service || !service.instances.length) {
      return null;
    }

    // Filter healthy instances
    const healthyInstances = service.instances.filter(i => i.healthy);
    if (!healthyInstances.length) {
      return null;
    }

    let instance;
    switch (this.algorithm) {
      case 'round-robin':
        instance = this._roundRobin(service, healthyInstances);
        break;
      case 'least-connections':
        instance = this._leastConnections(healthyInstances);
        break;
      case 'random':
        instance = this._random(healthyInstances);
        break;
      case 'ip-hash':
        instance = this._ipHash(healthyInstances, context.clientIp);
        break;
      case 'weighted':
        instance = this._weighted(healthyInstances);
        break;
      default:
        instance = this._roundRobin(service, healthyInstances);
    }

    if (instance) {
      instance.connections++;
      instance.lastUsed = Date.now();
    }

    return instance;
  }

  /**
   * Release instance after request completion
   * @param {String} serviceName - Name of the service
   * @param {String} instanceUrl - URL of the instance
   */
  release(serviceName, instanceUrl) {
    const service = this.services.get(serviceName);
    if (service) {
      const instance = service.instances.find(i => i.url === instanceUrl);
      if (instance && instance.connections > 0) {
        instance.connections--;
      }
    }
  }

  /**
   * Mark instance as healthy or unhealthy
   * @param {String} serviceName - Name of the service
   * @param {String} instanceUrl - URL of the instance
   * @param {Boolean} healthy - Health status
   */
  setHealth(serviceName, instanceUrl, healthy) {
    const service = this.services.get(serviceName);
    if (service) {
      const instance = service.instances.find(i => i.url === instanceUrl);
      if (instance) {
        instance.healthy = healthy;
        console.log(`Service ${serviceName} instance ${instanceUrl} marked as ${healthy ? 'healthy' : 'unhealthy'}`);
      }
    }
  }

  /**
   * Round-robin algorithm
   * @private
   */
  _roundRobin(service, instances) {
    const instance = instances[service.currentIndex % instances.length];
    service.currentIndex = (service.currentIndex + 1) % instances.length;
    return instance;
  }

  /**
   * Least connections algorithm
   * @private
   */
  _leastConnections(instances) {
    return instances.reduce((min, instance) => 
      instance.connections < min.connections ? instance : min
    );
  }

  /**
   * Random algorithm
   * @private
   */
  _random(instances) {
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  /**
   * IP hash algorithm
   * @private
   */
  _ipHash(instances, clientIp) {
    if (!clientIp) {
      return this._random(instances);
    }
    
    // Simple hash of IP address
    const hash = clientIp.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    const index = hash % instances.length;
    return instances[index];
  }

  /**
   * Weighted algorithm
   * @private
   */
  _weighted(instances) {
    const totalWeight = instances.reduce((sum, i) => sum + (i.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const instance of instances) {
      random -= (instance.weight || 1);
      if (random <= 0) {
        return instance;
      }
    }
    
    return instances[0];
  }

  /**
   * Get service statistics
   * @param {String} serviceName - Name of the service
   */
  getStats(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      return null;
    }

    return {
      name: serviceName,
      algorithm: this.algorithm,
      instances: service.instances.map(i => ({
        url: i.url,
        healthy: i.healthy,
        connections: i.connections,
        weight: i.weight,
        lastUsed: i.lastUsed
      }))
    };
  }

  /**
   * Get all services
   */
  getAllStats() {
    const stats = {};
    for (const [name] of this.services) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  /**
   * Remove a service
   * @param {String} serviceName - Name of the service to remove
   */
  unregister(serviceName) {
    this.services.delete(serviceName);
  }

  /**
   * Clear all services
   */
  clear() {
    this.services.clear();
  }
}

module.exports = LoadBalancer;
