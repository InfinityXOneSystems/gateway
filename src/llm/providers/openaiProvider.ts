/**
 * OpenAI LLM Provider (stub implementation)
 */

import { LLMProvider, LLMResponse } from '../../types';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private _apiKey: string;

  constructor(apiKey: string) {
    this._apiKey = apiKey;
  }

  async execute(prompt: string, context?: Record<string, unknown>): Promise<LLMResponse> {
    // TODO: Implement actual OpenAI API call using this._apiKey
    console.log('OpenAI provider executing prompt:', prompt.substring(0, 100));
    console.log('Context:', context);

    // Stub response (wrapped in Promise to satisfy async)
    return Promise.resolve({
      content: `OpenAI stub response for: ${prompt.substring(0, 50)}...`,
      model: 'gpt-4',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    });
  }
}
