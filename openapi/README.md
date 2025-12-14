# OpenAPI Documentation

This directory contains OpenAPI specifications for the Omni Gateway service.

## Files

- `chatgpt-actions.omni-gateway.json` - ChatGPT Actions manifest with OpenAPI 3.1 spec
- `gateway.openapi.json` - (Generated) Full OpenAPI specification for all endpoints

## ChatGPT Actions Manifest

The `chatgpt-actions.omni-gateway.json` file contains the OpenAPI specification formatted for use with ChatGPT Actions. It includes:

- Health and readiness check endpoints
- Action execution endpoint
- Twilio webhook endpoints (voice and SMS)

### Placeholders

The manifest uses `${GATEWAY_BASE_URL}` as a placeholder for the base URL. When deploying, replace this with your actual Cloud Run service URL.

Example:
```bash
export GATEWAY_BASE_URL="https://omni-gateway-xxxx.a.run.app"
sed "s|\${GATEWAY_BASE_URL}|${GATEWAY_BASE_URL}|g" openapi/chatgpt-actions.omni-gateway.json > openapi/chatgpt-actions.deployed.json
```

## Generating OpenAPI Spec (Future)

To generate the full OpenAPI specification from code annotations:

```bash
# Add OpenAPI generator to package.json
npm install --save-dev swagger-jsdoc

# Generate spec (to be added to build script)
npm run generate:openapi
```

The generated `gateway.openapi.json` file is excluded from version control via `.gitignore`.

## CI Integration

The OpenAPI generation should be integrated into the CI/CD pipeline:

1. Generate spec during build
2. Validate spec against OpenAPI 3.1 schema
3. Optionally publish to API documentation service

## Usage with ChatGPT

1. Deploy the service to Cloud Run
2. Replace `${GATEWAY_BASE_URL}` with your service URL
3. Import the manifest into ChatGPT Actions
4. Configure authentication if needed
5. Test endpoints via ChatGPT interface

## Security Notes

- Twilio webhooks require signature verification (configure `INF_TWILIO_AUTH_TOKEN`)
- Action endpoints validate input against schemas from Index service
- See SECURITY.md for complete security guidelines
