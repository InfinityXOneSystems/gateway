/**
 * Groq LLM Provider (stub implementation)
 */

import { LLMProvider, LLMResponse } from '../../types';

export class GroqProvider implements LLMProvider {
  name = 'groq';
  private _apiKey: string;

  constructor(apiKey: string) {
    this._apiKey = apiKey;
  }

  async execute(prompt: string, context?: Record<string, unknown>): Promise<LLMResponse> {
    // TODO: Implement actual Groq API call using this._apiKey
    console.log('Groq provider executing prompt:', prompt.substring(0, 100));
    console.log('Context:', context);

    // Stub response (wrapped in Promise to satisfy async)
    return Promise.resolve({
      content: `Groq stub response for: ${prompt.substring(0, 50)}...`,
      model: 'mixtral-8x7b',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    });
  }
}
