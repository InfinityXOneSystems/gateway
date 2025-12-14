/**
 * Tests for Actions Handler
 */

import { ActionsHandler } from '../src/actions/handler';
import { Action } from '../src/types';
import * as indexClient from '../src/lib/indexClient';
import * as llmRouter from '../src/llm/router';

// Mock dependencies
jest.mock('../src/lib/indexClient');
jest.mock('../src/llm/router');

describe('ActionsHandler', () => {
  let handler: ActionsHandler;
  let mockGetAction: jest.Mock;
  let mockGetProvider: jest.Mock;
  let mockExecute: jest.Mock;

  beforeEach(() => {
    handler = new ActionsHandler();

    // Mock Index client
    mockGetAction = jest.fn();
    (indexClient.getIndexClient as jest.Mock).mockReturnValue({
      getAction: mockGetAction,
    });

    // Mock LLM router
    mockExecute = jest.fn();
    mockGetProvider = jest.fn().mockReturnValue({
      name: 'openai',
      execute: mockExecute,
    });
    (llmRouter.getLLMRouter as jest.Mock).mockReturnValue({
      getProvider: mockGetProvider,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeAction', () => {
    it('should execute action successfully', async () => {
      const action: Action = {
        id: 'test-action',
        name: 'Test Action',
        description: 'A test action',
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
      };

      mockGetAction.mockReturnValue(action);
      mockExecute.mockResolvedValue({
        content: 'Test response',
        model: 'gpt-4',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      });

      const result = await handler.executeAction('test-action', {
        input: { message: 'Hello' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockGetAction).toHaveBeenCalledWith('test-action');
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should return error for non-existent action', async () => {
      mockGetAction.mockReturnValue(undefined);

      const result = await handler.executeAction('non-existent', {
        input: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate input against schema', async () => {
      const action: Action = {
        id: 'test-action',
        name: 'Test Action',
        description: 'A test action',
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
      };

      mockGetAction.mockReturnValue(action);

      const result = await handler.executeAction('test-action', {
        input: {}, // Missing required field
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('should use action metadata for provider selection', async () => {
      const action: Action = {
        id: 'test-action',
        name: 'Test Action',
        description: 'A test action',
        schema: {
          type: 'object',
          properties: {},
        },
        metadata: {
          llmProvider: 'anthropic',
        },
      };

      mockGetAction.mockReturnValue(action);
      mockExecute.mockResolvedValue({
        content: 'Test response',
        model: 'claude-3-opus',
      });

      await handler.executeAction('test-action', {
        input: {},
      });

      expect(mockGetProvider).toHaveBeenCalledWith('anthropic');
    });

    it('should handle LLM provider errors', async () => {
      const action: Action = {
        id: 'test-action',
        name: 'Test Action',
        description: 'A test action',
        schema: {
          type: 'object',
          properties: {},
        },
      };

      mockGetAction.mockReturnValue(action);
      mockExecute.mockRejectedValue(new Error('LLM error'));

      const result = await handler.executeAction('test-action', {
        input: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('LLM error');
    });
  });
});
