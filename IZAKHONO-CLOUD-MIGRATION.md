# The Chancellor → IZAKHONO CLOUD

This migration is intentionally additive. The existing production host must remain untouched until IZAKHONO CLOUD has built the image, started the container and passed the health check.

## Current compatibility

- Runtime: Node.js 22
- Entrypoint: `node revenue-server.js`
- Container port: `3000`
- Existing `Dockerfile`: compatible with IZAKHONO CLOUD
- Health path: `/api/health`

## Required secrets

Configure these only inside IZAKHONO CLOUD; do not commit their values:

- `APP_URL`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `PAYFAST_MODE`
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`

## Safe cutover sequence

1. Register this repository as an internal IZAKHONO CLOUD project.
2. Build from the existing Dockerfile.
3. Start a preview deployment on an IZAKHONO CLOUD hostname.
4. Require `/api/health` to pass.
5. Run `npm run deploy:check` inside the image with production environment values.
6. Smoke-test homepage, concierge, quotations, CRM and PayFast configuration gates.
7. Only then move the production domain.
8. Keep the prior host available for rollback until the new deployment is stable.

No existing production service is disabled by this migration branch.
