# Configuration Guide

This document describes all environment variables used by the Omni Gateway service.

## Required Environment Variables

### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Port for HTTP server | `8080` | No |
| `NODE_ENV` | Environment mode (development/production) | `development` | No |
| `INDEX_SERVICE_URL` | URL of the Index service for action registry | `http://localhost:3000` | Yes |

### Twilio Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `INF_TWILIO_AUTH_TOKEN` | Twilio auth token for signature verification | - | Yes (production) |
| `INF_TWILIO_SKIP_SIG_VERIFY` | Skip signature verification (dev only) | `false` | No |

### LLM Provider Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `INF_LLM_PROVIDER` | Default LLM provider (openai/groq/anthropic/gemini) | `openai` | No |
| `OPENAI_API_KEY` | OpenAI API key | - | If using OpenAI |
| `GROQ_API_KEY` | Groq API key | - | If using Groq |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | If using Anthropic |
| `GEMINI_API_KEY` | Google Gemini API key | - | If using Gemini |

## Configuration by Environment

### Development

For local development, create a `.env` file in the project root:

```bash
NODE_ENV=development
PORT=8080
INDEX_SERVICE_URL=http://localhost:3000
INF_TWILIO_SKIP_SIG_VERIFY=true
INF_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...your-key-here
```

### Production (Cloud Run)

Set environment variables in Cloud Run deployment:

```bash
gcloud run deploy omni-gateway \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "INDEX_SERVICE_URL=https://your-index-service.com" \
  --set-env-vars "INF_LLM_PROVIDER=openai" \
  --set-secrets "INF_TWILIO_AUTH_TOKEN=twilio-auth-token:latest" \
  --set-secrets "OPENAI_API_KEY=openai-api-key:latest"
```

## Configuration Notes

### Index Service Integration

- The service fetches actions and capabilities from `INDEX_SERVICE_URL` on startup
- In development mode (`NODE_ENV=development`), failures to fetch are logged as warnings
- In production mode, startup failures cause the service to exit with code 1
- The `/readyz` endpoint returns 503 until Index service data is loaded

### Twilio Signature Verification

- Required in production to validate webhook authenticity
- Can be disabled in development with `INF_TWILIO_SKIP_SIG_VERIFY=true`
- Never disable in production environments

### LLM Provider Selection

- Default provider set via `INF_LLM_PROVIDER`
- Can be overridden per-action via action metadata
- At least one provider API key must be configured
- Multiple providers can be configured simultaneously

### Cloud Run Specifics

- `PORT` is automatically set by Cloud Run (typically 8080)
- Use Cloud Run secrets for sensitive values (API keys, tokens)
- Configure memory/CPU based on expected load:
  - Minimum: 512Mi memory, 1 CPU
  - Recommended: 1Gi memory, 2 CPU for production

## Example Configurations

### Full Production Setup

```bash
# Core
NODE_ENV=production
PORT=8080
INDEX_SERVICE_URL=https://index.example.com

# Twilio
INF_TWILIO_AUTH_TOKEN=<secret-from-twilio>
INF_TWILIO_SKIP_SIG_VERIFY=false

# LLM Providers
INF_LLM_PROVIDER=openai
OPENAI_API_KEY=<secret-from-openai>
ANTHROPIC_API_KEY=<secret-from-anthropic>
```

### Minimal Development Setup

```bash
NODE_ENV=development
INDEX_SERVICE_URL=http://localhost:3000
INF_TWILIO_SKIP_SIG_VERIFY=true
INF_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-test-key
```

## Secrets Management

### Using Google Cloud Secret Manager

Create secrets:
```bash
echo -n "your-twilio-token" | gcloud secrets create twilio-auth-token --data-file=-
echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
```

Grant access to Cloud Run service account:
```bash
gcloud secrets add-iam-policy-binding twilio-auth-token \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

Reference in Cloud Run:
```bash
gcloud run deploy omni-gateway \
  --set-secrets "INF_TWILIO_AUTH_TOKEN=twilio-auth-token:latest"
```

## Validation

The service validates configuration on startup:
- Logs all non-sensitive configuration values
- Attempts to initialize Index client
- Initializes LLM router with available providers
- Exits with error if critical configuration is missing

Check startup logs for configuration issues:
```bash
gcloud run logs read omni-gateway --limit=50
```
