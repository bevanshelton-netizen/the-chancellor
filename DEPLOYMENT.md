# Deployment readiness guide

## Recommended first production shape

Deploy this package as one Node.js container with one persistent disk mounted at `/app/data`. This preserves audit records, client sessions and private uploads between releases. Use one running application instance until the JSON store is migrated to a managed database and uploads are moved to private object storage.

The included `render.yaml` can create this exact single-instance deployment on Render, including the health check, persistent disk and secure environment-variable prompts.

## Required production settings

- `NODE_ENV=production`
- `PORT=3000` (or the value supplied by the host)
- `APP_URL=https://your-domain.example`
- `DATA_DIR=/app/data`
- `SESSION_SECRET` — random, at least 32 characters
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` — at least 12 characters
- `PAYFAST_MODE=sandbox` for the first deployment
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE` if enabled in PayFast
- `OPENAI_API_KEY` and `OPENAI_MODEL` when live AI conversation is required

Never place these values in the website files, container image or source repository. Add them using the hosting provider’s encrypted environment-variable controls.

## Release sequence

1. Add the approved portrait, avatar and crest files.
2. Deploy using PayFast sandbox credentials.
3. Confirm `/api/health` reports the service as available.
4. Create a test audit and save its access code.
5. Sign into the client portal, upload approved test files and verify they remain after a restart.
6. Complete a PayFast sandbox payment and confirm the audit becomes “Paid — awaiting review”.
7. Sign into the private admin dashboard and update the audit status.
8. Confirm the public domain uses HTTPS and that HTTP redirects to HTTPS.
9. Back up the persistent data disk.
10. Only then switch `PAYFAST_MODE=live` and replace the sandbox merchant settings with live values.

## Production boundaries

This release is appropriate for a single production server. Before running multiple instances, migrate audit/payment data to PostgreSQL or another managed database, sessions to a shared session store, and documents to private object storage with malware scanning. PayFast’s current merchant-side notification verification requirements should also be checked immediately before live activation.
