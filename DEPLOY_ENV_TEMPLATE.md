# The Chancellor — Render Deployment Environment Template

Use this as the exact checklist when configuring the production Render service.

## Required before paid launch

```env
NODE_ENV=production
DATA_DIR=/app/data
APP_URL=https://the-chancellor.onrender.com

ADMIN_EMAIL=YOUR_ADMIN_EMAIL
ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD_MIN_12_CHARS

PAYFAST_MODE=sandbox
PAYFAST_MERCHANT_ID=YOUR_PAYFAST_MERCHANT_ID
PAYFAST_MERCHANT_KEY=YOUR_PAYFAST_MERCHANT_KEY
PAYFAST_PASSPHRASE=YOUR_PAYFAST_SECURITY_PASSPHRASE

CASE_PLATFORM_FEE_RATE=0.10
MAX_UPLOAD_MB=10
MAX_DELIVERABLE_MB=20
COMMS_SCAN_INTERVAL_MINUTES=30
```

`SESSION_SECRET` is generated automatically by Render from `render.yaml`; do not invent or commit one unless the Render service is being configured manually without the Blueprint.

## Recommended for full AI adviser experience

```env
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_VOICE=cedar
```

The site has fallback/manual behaviour without an OpenAI key, but live adviser/voice features require it.

## Optional outbound email

```env
RESEND_API_KEY=YOUR_RESEND_API_KEY
COMMS_FROM_EMAIL=YOUR_VERIFIED_SENDER_EMAIL
ADMIN_ALERT_EMAIL=YOUR_ALERT_EMAIL
```

## Optional SMS / WhatsApp

```env
COMMS_MOBILE_CHANNEL=sms
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER=YOUR_TWILIO_SMS_NUMBER
TWILIO_WHATSAPP_FROM=YOUR_TWILIO_WHATSAPP_SENDER
ADMIN_ALERT_PHONE=YOUR_ALERT_PHONE
```

Use either SMS or WhatsApp configuration as required. Missing communications credentials do not prevent the core service from starting.

## Upload allowlist already defined in render.yaml

```env
ALLOWED_UPLOAD_TYPES=application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

## PayFast launch sequence

1. Start with `PAYFAST_MODE=sandbox`.
2. Use sandbox Merchant ID, Merchant Key and passphrase.
3. Test the R500 Growth Desk checkout.
4. Test recurring Professional Network membership.
5. Test Rescue Case deposit and full-balance payments.
6. Confirm duplicate ITNs do not duplicate payment records.
7. Confirm bad signature / merchant / amount requests are rejected.
8. Only after all tests pass, replace sandbox credentials with verified live PayFast credentials and set `PAYFAST_MODE=live`.

PayFast recurring memberships require recurring billing to be enabled and a security passphrase configured on the PayFast account.

## Render service requirements

The repository already contains `render.yaml`, which specifies:

- Docker runtime
- Starter plan
- one application instance
- persistent disk mounted at `/app/data`
- `/api/health` health check
- automatic deployment from commits

Keep `numInstances: 1` while the application uses the current JSON datastore.

## Final production verification

After deployment, open:

- `https://the-chancellor.onrender.com/api/health`
- `https://the-chancellor.onrender.com/api/features`
- `https://the-chancellor.onrender.com/api/go-live`

Launch paid traffic only when `/api/go-live` returns:

```json
"readyForPaidTraffic": true
```

Then visually test:

- `/`
- `/rescue.html`
- `/proof.html`
- `/portal.html`
- `/rescue-portal.html`
- `/professional-portal.html`
- `/partner-portal.html`
- `/institutional-portal.html`
- `/admin.html`
