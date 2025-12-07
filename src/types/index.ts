/**
 * Type definitions for Omni Gateway
 */

// Action definition from Index service
export interface Action {
  id: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
  metadata?: {
    llmProvider?: 'openai' | 'groq' | 'anthropic' | 'gemini';
    [key: string]: unknown;
  };
}

// Capability definition from Index service
export interface Capability {
  id: string;
  name: string;
  description: string;
  actions: string[]; // Action IDs
}

// Normalized envelope for Twilio events
export interface Envelope {
  type: 'voice' | 'sms';
  from: string;
  to: string;
  body?: string; // For SMS
  callSid?: string; // For Voice
  messageSid?: string; // For SMS
  timestamp: string;
  raw: Record<string, unknown>;
}

// LLM Provider interface
export interface LLMProvider {
  name: string;
  execute(prompt: string, context?: Record<string, unknown>): Promise<LLMResponse>;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Index service response types
export interface IndexServiceResponse {
  actions: Action[];
  capabilities: Capability[];
}

// Action execution request
export interface ActionRequest {
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
}

// Action execution response
export interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Configuration
export interface Config {
  port: number;
  nodeEnv: string;
  indexServiceUrl: string;
  twilioAuthToken: string;
  twilioSkipSigVerify: boolean;
  llmProvider: 'openai' | 'groq' | 'anthropic' | 'gemini';
  openaiApiKey?: string;
  groqApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
}
