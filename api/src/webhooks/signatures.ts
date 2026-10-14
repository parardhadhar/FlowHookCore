import crypto from 'crypto';
/** Verify Stripe webhook signature (HMAC-SHA256) */
export function verifyStripeSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string
): { valid: boolean; eventId?: string } {
  try {
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => p.split('=') as [string, string])
    );
    const timestamp = parts['t'];
    const v1 = parts['v1'];
    if (!timestamp || !v1) return { valid: false };

    // Reject replayed webhooks older than 5 minutes
    const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (!Number.isFinite(age) || age > 300) return { valid: false };

    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(v1, 'hex'),
      Buffer.from(expected, 'hex')
    );
    return { valid };
  } catch {
    return { valid: false };
  }
}

/** Verify GitHub webhook signature (HMAC-SHA256) */
export function verifyGitHubSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string
): boolean {
  try {
    const expected = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')}`;
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
