import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeIssue } from '../src/ai';
const payload = { issue: { title: 'Checkout fails', body: 'Users receive a 500 error.' } };
describe('AI issue summaries', () => {
  it('uses a deterministic fallback without a key', async () => {
    const r = await summarizeIssue(payload, {apiKey: ''});
    assert.equal(r.provider, 'fallback'); assert.match(r.text, /Checkout fails/);
  });
  it('sends bounded input to the provider and extracts the summary', async () => {
    const r = await summarizeIssue({issue: {...payload.issue, body: 'x'.repeat(10000)}}, {
      apiKey: 'test-only', fetcher: (async (url, init) => {
        assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
        const body = JSON.parse(String(init?.body));
        assert.equal(JSON.parse(body.messages[1].content).body.length, 6000);
        assert.ok(init?.signal);
        return new Response(JSON.stringify({choices:[{message:{content:'Checkout returns server errors.'}}]}));
      }) as typeof fetch,
    });
    assert.equal(r.provider, 'groq'); assert.equal(r.text, 'Checkout returns server errors.');
  });
  it('falls back on rate limits', async () => {
    const r = await summarizeIssue(payload, {apiKey:'test-only', fetcher: (async () => new Response('', {status:429})) as typeof fetch});
    assert.equal(r.reason, 'provider_http_429');
  });
  it('falls back on network failure or timeout', async () => {
    const r = await summarizeIssue(payload, {apiKey:'test-only', fetcher: (async () => {throw new Error('timeout');}) as typeof fetch});
    assert.equal(r.reason, 'provider_unavailable');
  });
  it('falls back on malformed model output', async () => {
    const r = await summarizeIssue(payload, {apiKey:'test-only', fetcher: (async () => new Response('{}')) as typeof fetch});
    assert.equal(r.reason, 'invalid_response');
  });
});
