/**
 * Actions Handler
 * Generic action handler with schema validation and LLM delegation
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import { ActionRequest, ActionResponse } from '../types';
import { getIndexClient } from '../lib/indexClient';
import { getLLMRouter } from '../llm/router';

const ajv = new Ajv();

export class ActionsHandler {
  private validators: Map<string, ValidateFunction> = new Map();

  /**
   * Execute an action by ID
   */
  async executeAction(actionId: string, request: ActionRequest): Promise<ActionResponse> {
    try {
      // Get action from Index registry
      const indexClient = getIndexClient();
      const action = indexClient.getAction(actionId);

      if (!action) {
        return {
          success: false,
          error: `Action '${actionId}' not found`,
        };
      }

      // Validate input against schema
      const isValid = this.validateInput(actionId, action.schema, request.input);
      if (!isValid) {
        return {
          success: false,
          error: 'Input validation failed',
        };
      }

      // Get LLM provider (use action metadata or default)
      const llmRouter = getLLMRouter();
      const providerName = action.metadata?.llmProvider;
      const provider = llmRouter.getProvider(providerName);

      // Build prompt from action and input
      const prompt = this.buildPrompt(action.name, action.description, request.input);

      // Execute via LLM provider
      const response = await provider.execute(prompt, request.context);

      return {
        success: true,
        data: {
          actionId,
          actionName: action.name,
          result: response.content,
          model: response.model,
          usage: response.usage,
        },
      };
    } catch (error) {
      console.error('Error executing action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate input against action schema
   */
  private validateInput(
    actionId: string,
    schema: Record<string, unknown>,
    input: Record<string, unknown>
  ): boolean {
    // Get or create validator
    let validator = this.validators.get(actionId);

    if (!validator) {
      validator = ajv.compile(schema as JSONSchemaType<unknown>);
      this.validators.set(actionId, validator);
    }

    const isValid = validator(input);

    if (!isValid) {
      console.error('Validation errors:', validator.errors);
    }

    return isValid;
  }

  /**
   * Build prompt from action and input
   */
  private buildPrompt(
    actionName: string,
    description: string,
    input: Record<string, unknown>
  ): string {
    return `Action: ${actionName}
Description: ${description}
Input: ${JSON.stringify(input, null, 2)}

Please process this action and provide a response.`;
  }
}

// Singleton instance
let actionsHandlerInstance: ActionsHandler | null = null;

export function getActionsHandler(): ActionsHandler {
  if (!actionsHandlerInstance) {
    actionsHandlerInstance = new ActionsHandler();
  }

  return actionsHandlerInstance;
}
