import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyStripeSignature, verifyGitHubSignature } from '../src/webhooks/signatures';

// ─── Stripe Signature Tests ───────────────────────────────────────────────────

describe('verifyStripeSignature', () => {
  const secret = 'whsec_test_secret';

  function buildStripeHeader(payload: string, ts: number) {
    const signedPayload = `${ts}.${payload}`;
    const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `t=${ts},v1=${sig}`;
  }

  it('accepts a valid signature', () => {
    const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' });
    const ts = Math.floor(Date.now() / 1000);
    const header = buildStripeHeader(payload, ts);
    const result = verifyStripeSignature(Buffer.from(payload), header, secret);
    assert.equal(result.valid, true);
  });

  it('rejects an invalid signature', () => {
    const payload = JSON.stringify({ id: 'evt_123' });
    const ts = Math.floor(Date.now() / 1000);
    const header = `t=${ts},v1=badhex`;
    const result = verifyStripeSignature(Buffer.from(payload), header, secret);
    assert.equal(result.valid, false);
  });

  it('rejects a replayed webhook (>5 min old)', () => {
    const payload = JSON.stringify({ id: 'evt_old' });
    const ts = Math.floor(Date.now() / 1000) - 400; // 6.6 min ago
    const header = buildStripeHeader(payload, ts);
    const result = verifyStripeSignature(Buffer.from(payload), header, secret);
    assert.equal(result.valid, false);
  });

  it('rejects a tampered body', () => {
    const payload = JSON.stringify({ id: 'evt_123' });
    const ts = Math.floor(Date.now() / 1000);
    const header = buildStripeHeader(payload, ts);
    const tamperedPayload = JSON.stringify({ id: 'evt_456' }); // different body
    const result = verifyStripeSignature(Buffer.from(tamperedPayload), header, secret);
    assert.equal(result.valid, false);
  });
});

// ─── GitHub Signature Tests ───────────────────────────────────────────────────

describe('verifyGitHubSignature', () => {
  const secret = 'github_test_secret';

  function buildGitHubHeader(payload: string): string {
    const sig = crypto.createHmac('sha256', secret).update(Buffer.from(payload)).digest('hex');
    return `sha256=${sig}`;
  }

  it('accepts a valid signature', () => {
    const payload = JSON.stringify({ action: 'opened', issue: { title: 'Bug found' } });
    const header = buildGitHubHeader(payload);
    assert.equal(verifyGitHubSignature(Buffer.from(payload), header, secret), true);
  });

  it('rejects an invalid signature', () => {
    const payload = JSON.stringify({ action: 'opened' });
    assert.equal(verifyGitHubSignature(Buffer.from(payload), 'sha256=badbad', secret), false);
  });

  it('rejects missing sha256 prefix', () => {
    const payload = JSON.stringify({ action: 'opened' });
    const rawSig = crypto.createHmac('sha256', secret).update(Buffer.from(payload)).digest('hex');
    assert.equal(verifyGitHubSignature(Buffer.from(payload), rawSig, secret), false);
  });

  it('rejects wrong secret', () => {
    const payload = JSON.stringify({ action: 'opened' });
    const header = buildGitHubHeader(payload); // signed with correct secret
    assert.equal(verifyGitHubSignature(Buffer.from(payload), header, 'wrong_secret'), false);
  });
});
