const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const base = process.env.DEMO_API_URL || 'http://localhost:3000';
const secret = process.env.GITHUB_WEBHOOK_SECRET || 'github_local_demo';
async function request(path, options) {
  const response = await fetch(base + path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(result)}`);
  return result;
}
async function main() {
  const workflows = await request('/api/workflows');
  let workflow = workflows.find(w => w.name === 'Demo: GitHub issue to email' && w.is_active);
  if (!workflow) workflow = await request('/api/workflows', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name: 'Demo: GitHub issue to email', trigger_type: 'github.issue_opened',
      action_type: 'email.send', action_config: {to: 'team@example.com', subject: 'New issue: {{title}}',
        template: 'Issue #{{number}}: {{title}}\nBy {{author}} in {{repo}}\n{{url}}'}})
  });
  const before = await request(`/api/workflows/${workflow.id}/runs`);
  const delivery = crypto.randomUUID();
  const body = JSON.stringify({action: 'opened', repository: {full_name: 'demo/flowhook'},
    issue: {number: 42, title: 'Improve checkout reliability', body: 'Example issue for the local demo.',
      html_url: 'https://github.com/demo/flowhook/issues/42', user: {login: 'demo-developer'}}});
  const headers = {'Content-Type': 'application/json', 'X-GitHub-Event': 'issues',
    'X-GitHub-Delivery': delivery,
    'X-Hub-Signature-256': 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')};
  await request('/webhooks/github', {method: 'POST', headers, body});
  await request('/webhooks/github', {method: 'POST', headers, body});
  for (let i = 0; i < 60; i++) {
    const runs = await request(`/api/workflows/${workflow.id}/runs`);
    const fresh = runs.filter(r => !before.some(b => b.id === r.id));
    assert.equal(fresh.length, 1, 'Duplicate delivery must create exactly one run');
    if (fresh[0].status === 'succeeded') {
      const logs = await request(`/api/workflows/runs/${fresh[0].id}/logs`);
      assert.ok(logs.some(l => l.step === 'action_succeeded'));
      console.log('PASS: signed webhook, one run for two deliveries, worker success, execution trace.');
      console.log('Dashboard: http://localhost:3001 | Captured email: http://localhost:8025');
      return;
    }
    if (fresh[0].status === 'dead_letter') throw new Error(fresh[0].error);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Timed out waiting for worker completion');
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
