import nodemailer from 'nodemailer';

interface EmailConfig {
  to: string;
  subject: string;
  template: string;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function sendSlackMessage(
  config: { webhook_url: string; template: string },
  eventPayload: Record<string, any>
): Promise<void> {
  const vars = extractVars(eventPayload);
  const text = interpolate(config.template, vars);

  const resp = await fetch(config.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    throw new Error(`Slack responded with ${resp.status}: ${await resp.text()}`);
  }
}

export async function sendEmail(
  config: EmailConfig,
  eventPayload: Record<string, any>
): Promise<void> {
  const vars = extractVars(eventPayload);
  const subject = interpolate(config.subject, vars);
  const body = interpolate(config.template, vars);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    } : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'FlowHook <noreply@flowhook.dev>',
    to: config.to,
    subject,
    text: body,
  });
}

/** Extract common template variables from event payloads */
function extractVars(payload: Record<string, any>): Record<string, string> {
  // Stripe payment_intent.succeeded
  if (payload?.type === 'payment_intent.succeeded') {
    const pi = payload.data?.object ?? {};
    return {
      amount: `$${((pi.amount ?? 0) / 100).toFixed(2)}`,
      currency: (pi.currency ?? '').toUpperCase(),
      customer: pi.customer ?? 'unknown',
      event_id: payload.id ?? '',
    };
  }

  // GitHub issues.opened
  if (payload?.action === 'opened' && payload?.issue) {
    const issue = payload.issue;
    return {
      title: issue.title ?? '',
      url: issue.html_url ?? '',
      body: (issue.body ?? '').substring(0, 500),
      author: issue.user?.login ?? '',
      repo: payload.repository?.full_name ?? '',
      number: String(issue.number ?? ''),
      ai_summary: String(payload.ai_summary ?? ''),
    };
  }

  // Generic fallback
  return { raw: JSON.stringify(payload).substring(0, 500) };
}
