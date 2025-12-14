/**
 * Twilio webhook handlers and utilities
 */

import { Request } from 'express';
import { validateRequest } from 'twilio';
import { Envelope } from '../types';

/**
 * Verify Twilio signature
 */
export function verifyTwilioSignature(
  req: Request,
  authToken: string,
  skipVerify = false
): boolean {
  if (skipVerify) {
    console.warn('Skipping Twilio signature verification (dev mode)');
    return true;
  }

  const signature = req.headers['x-twilio-signature'] as string;
  if (!signature) {
    return false;
  }

  const url = `${req.protocol}://${req.get('host') || ''}${req.originalUrl}`;

  return validateRequest(authToken, signature, url, req.body as Record<string, string>);
}

/**
 * Normalize Twilio voice event to Envelope
 */
export function normalizeVoiceEvent(body: Record<string, unknown>): Envelope {
  return {
    type: 'voice',
    from: (body.From as string) || '',
    to: (body.To as string) || '',
    callSid: (body.CallSid as string) || '',
    timestamp: new Date().toISOString(),
    raw: body,
  };
}

/**
 * Normalize Twilio SMS event to Envelope
 */
export function normalizeSmsEvent(body: Record<string, unknown>): Envelope {
  return {
    type: 'sms',
    from: (body.From as string) || '',
    to: (body.To as string) || '',
    body: (body.Body as string) || '',
    messageSid: (body.MessageSid as string) || '',
    timestamp: new Date().toISOString(),
    raw: body,
  };
}

/**
 * Generate TwiML response for voice
 */
export function generateVoiceResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(message)}</Say>
</Response>`;
}

/**
 * Generate TwiML response for SMS
 */
export function generateSmsResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
