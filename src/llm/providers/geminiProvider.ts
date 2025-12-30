/**
 * Google Gemini LLM Provider (stub implementation)
 */

import { LLMProvider, LLMResponse } from '../../types';

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private _apiKey: string;

  constructor(apiKey: string) {
    this._apiKey = apiKey;
  }

  async execute(prompt: string, context?: Record<string, unknown>): Promise<LLMResponse> {
    // TODO: Implement actual Gemini API call using this._apiKey
    console.log('Gemini provider executing prompt:', prompt.substring(0, 100));
    console.log('Context:', context);

    // Stub response (wrapped in Promise to satisfy async)
    return Promise.resolve({
      content: `Gemini stub response for: ${prompt.substring(0, 50)}...`,
      model: 'gemini-2.5-flash',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    });
  }
}
