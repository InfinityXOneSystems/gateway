/**
 * Omni Gateway Server
 * Express server with health checks, webhooks, and action endpoints
 */

import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { getIndexClient } from '../lib/indexClient';
import { getLLMRouter } from '../llm/router';
import { getActionsHandler } from '../actions/handler';
import {
  verifyTwilioSignature,
  normalizeVoiceEvent,
  normalizeSmsEvent,
  generateVoiceResponse,
  generateSmsResponse,
} from '../webhooks/twilio';
import { Config, ActionRequest } from '../types';

// Load environment variables
dotenv.config();

// Configuration
const config: Config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  indexServiceUrl: process.env.INDEX_SERVICE_URL || 'http://localhost:3000',
  twilioAuthToken: process.env.INF_TWILIO_AUTH_TOKEN || '',
  twilioSkipSigVerify: process.env.INF_TWILIO_SKIP_SIG_VERIFY === 'true',
  llmProvider: (process.env.INF_LLM_PROVIDER as Config['llmProvider']) || 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
};

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoints
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/readyz', (_req: Request, res: Response) => {
  const indexClient = getIndexClient();
  const isReady = indexClient.isInitialized();

  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

// Twilio webhook endpoints
app.post('/webhooks/twilio/voice', (req: Request, res: Response): void => {
  try {
    // Verify signature
    const isValid = verifyTwilioSignature(req, config.twilioAuthToken, config.twilioSkipSigVerify);

    if (!isValid) {
      console.error('Invalid Twilio signature');
      res.status(403).send('Forbidden');
      return;
    }

    // Normalize event
    const envelope = normalizeVoiceEvent(req.body as Record<string, unknown>);
    console.log('Voice webhook received:', envelope);

    // Generate TwiML response
    const twiml = generateVoiceResponse('Hello! This is Omni Gateway.');
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error processing voice webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/webhooks/twilio/sms', (req: Request, res: Response): void => {
  try {
    // Verify signature
    const isValid = verifyTwilioSignature(req, config.twilioAuthToken, config.twilioSkipSigVerify);

    if (!isValid) {
      console.error('Invalid Twilio signature');
      res.status(403).send('Forbidden');
      return;
    }

    // Normalize event
    const envelope = normalizeSmsEvent(req.body as Record<string, unknown>);
    console.log('SMS webhook received:', envelope);

    // Generate TwiML response
    const twiml = generateSmsResponse(`You said: ${envelope.body || ''}`);
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Generic actions endpoint
app.post('/actions/:id', (req: Request, res: Response) => {
  const actionId = req.params.id;
  const requestBody = req.body as {
    input?: Record<string, unknown>;
    context?: Record<string, unknown>;
  };
  const request: ActionRequest = {
    input: requestBody.input || (req.body as Record<string, unknown>),
    context: requestBody.context,
  };

  const handler = getActionsHandler();
  handler
    .executeAction(actionId, request)
    .then((response) => {
      if (response.success) {
        res.status(200).json(response);
      } else {
        res.status(400).json(response);
      }
    })
    .catch((error) => {
      console.error('Error executing action:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

/**
 * Initialize and start server
 */
async function startServer() {
  try {
    console.log('Initializing Omni Gateway...');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Index Service URL: ${config.indexServiceUrl}`);
    console.log(`LLM Provider: ${config.llmProvider}`);

    // Initialize Index client
    const isDev = config.nodeEnv === 'development';
    const indexClient = getIndexClient(config.indexServiceUrl);
    await indexClient.initialize(isDev);

    // Initialize LLM router
    getLLMRouter({
      defaultProvider: config.llmProvider,
      openaiApiKey: config.openaiApiKey,
      groqApiKey: config.groqApiKey,
      anthropicApiKey: config.anthropicApiKey,
      geminiApiKey: config.geminiApiKey,
    });

    // Start server
    app.listen(config.port, () => {
      console.log(`âœ“ Omni Gateway listening on port ${config.port}`);
      console.log(`âœ“ Health check: http://localhost:${config.port}/healthz`);
      console.log(`âœ“ Ready check: http://localhost:${config.port}/readyz`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if not in test mode
if (require.main === module) {
  void startServer();
}

export { app, config };
