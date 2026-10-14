import crypto from 'crypto';

const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_stripe_secret_here';

const payload = {
  id: "evt_test_123",
  type: "payment_intent.succeeded",
  data: {
    object: {
      amount: 15000,
      currency: "usd",
      customer: "cus_mock_987"
    }
  }
};

const rawBody = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${rawBody}`;
const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
const header = `t=${timestamp},v1=${signature}`;

fetch('http://localhost:3000/webhooks/stripe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': header
  },
  body: rawBody
}).then(async r => {
  console.log(r.status, await r.text());
}).catch(console.error);
