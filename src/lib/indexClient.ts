/**
 * Index Service Client
 * Fetches and caches actions/capabilities from the Index service
 */

import axios, { AxiosError } from 'axios';
import { Action, Capability, IndexServiceResponse } from '../types';

export class IndexClient {
  private baseUrl: string;
  private actions: Map<string, Action> = new Map();
  private capabilities: Capability[] = [];
  private initialized = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize the client by fetching actions and capabilities
   * Fails fast in non-dev environments
   */
  async initialize(isDev = false): Promise<void> {
    try {
      console.log(`Fetching actions and capabilities from ${this.baseUrl}`);

      // Fetch from Index service
      const response = await axios.get<IndexServiceResponse>(`${this.baseUrl}/api/registry`, {
        timeout: 10000,
      });

      const { actions, capabilities } = response.data;

      // Cache actions
      actions.forEach((action) => {
        this.actions.set(action.id, action);
      });

      this.capabilities = capabilities;
      this.initialized = true;

      console.log(`Loaded ${actions.length} actions and ${capabilities.length} capabilities`);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? `Failed to fetch from Index service: ${error.message}`
          : 'Unknown error fetching from Index service';

      console.error(message);

      // Fail-fast in non-dev modes
      if (!isDev) {
        throw new Error(message);
      }

      console.warn('Running in dev mode, continuing without Index service');
    }
  }

  /**
   * Get an action by ID
   */
  getAction(id: string): Action | undefined {
    return this.actions.get(id);
  }

  /**
   * Get all actions
   */
  getAllActions(): Action[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get all capabilities
   */
  getCapabilities(): Capability[] {
    return this.capabilities;
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Validate action schema (stub for now)
   */
  validateActionSchema(actionId: string, _input: Record<string, unknown>): boolean {
    const action = this.getAction(actionId);
    if (!action) {
      return false;
    }

    // TODO: Implement actual schema validation using AJV
    // For now, just check if action exists
    return true;
  }
}

// Singleton instance
let indexClientInstance: IndexClient | null = null;

export function getIndexClient(baseUrl?: string): IndexClient {
  if (!indexClientInstance && baseUrl) {
    indexClientInstance = new IndexClient(baseUrl);
  }

  if (!indexClientInstance) {
    throw new Error('IndexClient not initialized. Call getIndexClient with baseUrl first.');
  }

  return indexClientInstance;
}
