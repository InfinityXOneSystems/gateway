/**
 * Anthropic LLM Provider (stub implementation)
 */

import { LLMProvider, LLMResponse } from '../../types';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private _apiKey: string;

  constructor(apiKey: string) {
    this._apiKey = apiKey;
  }

  async execute(prompt: string, context?: Record<string, unknown>): Promise<LLMResponse> {
    // TODO: Implement actual Anthropic API call using this._apiKey
    console.log('Anthropic provider executing prompt:', prompt.substring(0, 100));
    console.log('Context:', context);

    // Stub response (wrapped in Promise to satisfy async)
    return Promise.resolve({
      content: `Anthropic stub response for: ${prompt.substring(0, 50)}...`,
      model: 'claude-3-opus',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    });
  }
}
