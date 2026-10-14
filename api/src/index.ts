import 'dotenv/config';
import express from 'express';
import { initDb } from './db';
import workflowRoutes from './routes/workflows';
import { handleStripe, handleGitHub } from './webhooks/receiver';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Raw body capture (MUST be before json parser) ───────────────────────────
app.use('/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));
app.use('/webhooks', (req, _res, next) => {
  (req as any).rawBody = req.body;
  next();
});

// ─── JSON parser for non-webhook routes ──────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ ok: true });
});
app.get('/api/info', (req, res) => {
  res.json({
    name: 'FlowHook',
    purpose: 'Receive events and automate actions',
    version: '1.0.0',
  });
});

// ─── Webhook endpoints ────────────────────────────────────────────────────────
app.post('/webhooks/stripe', handleStripe);
app.post('/webhooks/github', handleGitHub);

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/workflows', workflowRoutes);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function main() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[api] FlowHook API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[api] Fatal startup error:', err);
  process.exit(1);
});
