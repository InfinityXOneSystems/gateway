/**
 * LLM Provider Router
 * Selects provider based on environment or action metadata
 */

import { LLMProvider } from '../types';
import { OpenAIProvider } from './providers/openaiProvider';
import { GroqProvider } from './providers/groqProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { GeminiProvider } from './providers/geminiProvider';

export class LLMRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string;

  constructor(config: {
    defaultProvider: string;
    openaiApiKey?: string;
    groqApiKey?: string;
    anthropicApiKey?: string;
    geminiApiKey?: string;
  }) {
    this.defaultProvider = config.defaultProvider;

    // Initialize providers with API keys
    if (config.openaiApiKey) {
      this.providers.set('openai', new OpenAIProvider(config.openaiApiKey));
    }
    if (config.groqApiKey) {
      this.providers.set('groq', new GroqProvider(config.groqApiKey));
    }
    if (config.anthropicApiKey) {
      this.providers.set('anthropic', new AnthropicProvider(config.anthropicApiKey));
    }
    if (config.geminiApiKey) {
      this.providers.set('gemini', new GeminiProvider(config.geminiApiKey));
    }
  }

  /**
   * Get provider by name or use default
   */
  getProvider(name?: string): LLMProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`LLM provider '${providerName}' not configured`);
    }

    return provider;
  }

  /**
   * List available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
let llmRouterInstance: LLMRouter | null = null;

export function getLLMRouter(config?: {
  defaultProvider: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
}): LLMRouter {
  if (!llmRouterInstance && config) {
    llmRouterInstance = new LLMRouter(config);
  }

  if (!llmRouterInstance) {
    throw new Error('LLMRouter not initialized. Call getLLMRouter with config first.');
  }

  return llmRouterInstance;
}
