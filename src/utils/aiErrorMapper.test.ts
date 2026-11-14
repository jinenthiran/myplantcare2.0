import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFriendlyAiError } from './aiErrorMapper.ts';

test('formatFriendlyAiError maps raw 429 RESOURCE_EXHAUSTED JSON to clean HTTP 429 guidance', () => {
  const raw429 = new Error(
    '{"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details.","status":"RESOURCE_EXHAUSTED"}}'
  );
  const mapped = formatFriendlyAiError(raw429);
  assert.equal(mapped.statusCode, 429);
  assert.equal(mapped.retryable, true);
  assert.ok(!mapped.message.includes('RESOURCE_EXHAUSTED'));
  assert.ok(!mapped.message.startsWith('{'));
});

test('formatFriendlyAiError maps 503 high demand and timeouts to retryable 503', () => {
  const timeoutErr: any = new Error('AI model gemini-4-hydrogen timed out after 16s');
  timeoutErr.status = 504;
  const mapped = formatFriendlyAiError(timeoutErr, 'Custom fallback');
  assert.equal(mapped.statusCode, 503);
  assert.equal(mapped.retryable, true);
  assert.equal(mapped.message, 'Custom fallback');
});
