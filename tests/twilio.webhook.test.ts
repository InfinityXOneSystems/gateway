/**
 * Tests for Twilio webhook handlers
 */

import {
  normalizeVoiceEvent,
  normalizeSmsEvent,
  generateVoiceResponse,
  generateSmsResponse,
} from '../src/webhooks/twilio';

describe('Twilio Webhook Handlers', () => {
  describe('normalizeVoiceEvent', () => {
    it('should normalize voice event to Envelope', () => {
      const body = {
        From: '+1234567890',
        To: '+0987654321',
        CallSid: 'CA1234567890abcdef',
        CallStatus: 'ringing',
      };

      const envelope = normalizeVoiceEvent(body);

      expect(envelope.type).toBe('voice');
      expect(envelope.from).toBe('+1234567890');
      expect(envelope.to).toBe('+0987654321');
      expect(envelope.callSid).toBe('CA1234567890abcdef');
      expect(envelope.timestamp).toBeDefined();
      expect(envelope.raw).toEqual(body);
    });

    it('should handle missing fields', () => {
      const body = {};
      const envelope = normalizeVoiceEvent(body);

      expect(envelope.type).toBe('voice');
      expect(envelope.from).toBe('');
      expect(envelope.to).toBe('');
      expect(envelope.callSid).toBe('');
    });
  });

  describe('normalizeSmsEvent', () => {
    it('should normalize SMS event to Envelope', () => {
      const body = {
        From: '+1234567890',
        To: '+0987654321',
        Body: 'Hello, world!',
        MessageSid: 'SM1234567890abcdef',
      };

      const envelope = normalizeSmsEvent(body);

      expect(envelope.type).toBe('sms');
      expect(envelope.from).toBe('+1234567890');
      expect(envelope.to).toBe('+0987654321');
      expect(envelope.body).toBe('Hello, world!');
      expect(envelope.messageSid).toBe('SM1234567890abcdef');
      expect(envelope.timestamp).toBeDefined();
      expect(envelope.raw).toEqual(body);
    });

    it('should handle missing fields', () => {
      const body = {};
      const envelope = normalizeSmsEvent(body);

      expect(envelope.type).toBe('sms');
      expect(envelope.from).toBe('');
      expect(envelope.to).toBe('');
      expect(envelope.body).toBe('');
      expect(envelope.messageSid).toBe('');
    });
  });

  describe('generateVoiceResponse', () => {
    it('should generate valid TwiML for voice', () => {
      const response = generateVoiceResponse('Hello');

      expect(response).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response).toContain('<Response>');
      expect(response).toContain('<Say>Hello</Say>');
      expect(response).toContain('</Response>');
    });

    it('should escape XML special characters', () => {
      const response = generateVoiceResponse('Hello <world> & "friends"');

      expect(response).toContain('&lt;');
      expect(response).toContain('&gt;');
      expect(response).toContain('&amp;');
      expect(response).toContain('&quot;');
    });
  });

  describe('generateSmsResponse', () => {
    it('should generate valid TwiML for SMS', () => {
      const response = generateSmsResponse('Hello');

      expect(response).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response).toContain('<Response>');
      expect(response).toContain('<Message>Hello</Message>');
      expect(response).toContain('</Response>');
    });

    it('should escape XML special characters', () => {
      const response = generateSmsResponse('Hello <world> & "friends"');

      expect(response).toContain('&lt;');
      expect(response).toContain('&gt;');
      expect(response).toContain('&amp;');
      expect(response).toContain('&quot;');
    });
  });
});
