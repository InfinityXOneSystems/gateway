# Security Guidelines

This document outlines security considerations and best practices for the Omni Gateway service.

## Security Features

### 1. Twilio Signature Verification

**Purpose**: Verify that webhook requests actually come from Twilio.

**Implementation**:
- Uses `twilio` library's `validateRequest` function
- Validates request signature against `INF_TWILIO_AUTH_TOKEN`
- Returns 403 Forbidden for invalid signatures

**Configuration**:
```bash
# Production - REQUIRED
INF_TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Development only - allows bypassing verification
INF_TWILIO_SKIP_SIG_VERIFY=true
```

**⚠️ Never set `INF_TWILIO_SKIP_SIG_VERIFY=true` in production!**

### 2. Input Validation

**Purpose**: Prevent invalid or malicious input from reaching LLM providers.

**Implementation**:
- Uses AJV (Another JSON Schema Validator) for schema validation
- Schemas fetched from Index service registry
- Validates all action inputs before execution
- Returns 400 Bad Request for invalid inputs

**Schema Example**:
```json
{
  "type": "object",
  "properties": {
    "message": { "type": "string", "maxLength": 1000 }
  },
  "required": ["message"]
}
```

### 3. Secrets Management

**Purpose**: Protect sensitive credentials and API keys.

**Best Practices**:
- ✅ Use environment variables for all secrets
- ✅ Use Cloud Secret Manager in production
- ✅ Rotate API keys regularly
- ✅ Grant minimal IAM permissions
- ❌ Never commit secrets to version control
- ❌ Never log secrets or API keys
- ❌ Never expose secrets in error messages

**Cloud Run Secret Configuration**:
```bash
# Create secret
gcloud secrets create api-key --data-file=-

# Grant access
gcloud secrets add-iam-policy-binding api-key \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# Use in Cloud Run
gcloud run deploy omni-gateway \
  --set-secrets "API_KEY=api-key:latest"
```

### 4. Network Security

**Cloud Run Security**:
- Service runs in Google's secure infrastructure
- Automatic TLS/HTTPS termination
- DDoS protection included
- Network egress can be controlled via VPC

**Recommendations**:
- Use `--allow-unauthenticated` only for public webhooks
- Consider Cloud Armor for additional protection
- Use VPC Service Controls for sensitive workloads
- Enable Cloud Run audit logging

### 5. Docker Security

**Image Security**:
- Uses official Node.js Alpine base image (minimal attack surface)
- Multi-stage build (smaller final image)
- Runs as non-root user (nodejs:nodejs)
- No unnecessary packages installed

**Best Practices**:
```dockerfile
# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Minimal dependencies
RUN npm ci --only=production && \
    npm cache clean --force
```

### 6. Dependency Security

**Monitoring**:
- Run `npm audit` regularly
- Use Dependabot for automated updates
- Review security advisories for dependencies

**Commands**:
```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Check for outdated packages
npm outdated
```

**Key Dependencies**:
- `express` - Web framework
- `ajv` - JSON schema validation
- `twilio` - Webhook signature verification
- `axios` - HTTP client

## Security Checklist

### Deployment Security

- [ ] All secrets stored in Cloud Secret Manager
- [ ] Twilio signature verification enabled (`INF_TWILIO_SKIP_SIG_VERIFY=false`)
- [ ] HTTPS/TLS enabled (automatic with Cloud Run)
- [ ] Non-root user in Docker container
- [ ] Minimal IAM permissions granted
- [ ] Audit logging enabled
- [ ] Regular security updates applied

### Configuration Security

- [ ] No secrets in `.env` files committed to git
- [ ] `.gitignore` includes `.env`, `.env.*`
- [ ] Environment-specific configurations separated
- [ ] Production config reviewed by security team
- [ ] API keys rotated regularly (90 days recommended)

### Runtime Security

- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Request/response logging excludes secrets
- [ ] Rate limiting configured (Cloud Run default: 1000 RPS)
- [ ] Timeouts configured (prevents resource exhaustion)

### Code Security

- [ ] TypeScript strict mode enabled
- [ ] ESLint security rules enabled
- [ ] No `eval()` or `Function()` usage
- [ ] No dynamic requires
- [ ] Dependencies pinned to specific versions

## Incident Response

### If Secrets are Compromised

1. **Immediately rotate** all affected credentials
2. **Revoke** compromised API keys
3. **Review** access logs for unauthorized usage
4. **Update** all deployments with new secrets
5. **Document** incident and lessons learned

### If Vulnerabilities are Discovered

1. **Assess** severity and impact
2. **Patch** vulnerable dependencies
3. **Test** thoroughly after patching
4. **Deploy** updates to all environments
5. **Monitor** for exploitation attempts

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. **Email** security@infinityxone.systems with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. **Allow** reasonable time for fix before disclosure

## Compliance Considerations

### Data Privacy

- **No PII storage**: Service processes but doesn't store user data
- **Logging**: Ensure logs don't contain PII
- **LLM providers**: Review their data retention policies
- **GDPR/CCPA**: Ensure compliance for your use case

### Access Control

- **Authentication**: Consider adding auth for production endpoints
- **Authorization**: Implement role-based access if needed
- **API keys**: Use separate keys for different environments
- **Auditing**: Enable Cloud Run audit logs

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Google Cloud Security](https://cloud.google.com/security)
- [Twilio Security Best Practices](https://www.twilio.com/docs/usage/security)

## Regular Security Tasks

**Weekly**:
- Review access logs for anomalies
- Check for failed authentication attempts
- Monitor error rates and unusual patterns

**Monthly**:
- Run `npm audit` and patch vulnerabilities
- Review and update dependencies
- Check for security advisories

**Quarterly**:
- Rotate API keys and secrets
- Review IAM permissions
- Conduct security assessment
- Update security documentation

## Contact

For security questions or concerns:
- Email: security@infinityxone.systems
- Slack: #security (internal)
- On-call: Follow escalation procedures
