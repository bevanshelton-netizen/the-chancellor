# The Chancellor’s Business Growth Desk

**Build. Position. Fund. Grow.**  
**Powered by Izakhono Africa**

This package includes the public premium black/gold website, conversational Ask The Chancellor adviser, R500 Business Readiness Audit, secure client access, document uploads, PayFast sandbox/live checkout, client portal and private operations dashboard.

## Start locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and replace every placeholder secret.
4. Run `npm start`, then open `http://localhost:3000`.

Client portal: `/portal.html`  
Private admin: `/admin.html`

## Production configuration

- Use a long random `SESSION_SECRET` and strong `ADMIN_PASSWORD`.
- Add an `OPENAI_API_KEY` for genuine open-ended adviser conversation. With no key, the built-in guided adviser remains available.
- Keep `PAYFAST_MODE=sandbox` until payment return, cancel and ITN notification flows pass testing. Then supply live merchant values and set `PAYFAST_MODE=live`.
- Set `APP_URL` to the public HTTPS origin. PayFast uses it for return, cancel and notification URLs.
- Store `.env` outside source control. Serve only behind HTTPS.
- Uploaded files are private and are never exposed by the static server. Back up and encrypt the `data` directory in production.

## Definitive portrait and crest

The definitive Chancellor portrait and avatar from the V3 archive are integrated throughout the hero and adviser experience. The supplied archive did not contain a separate official crest asset, so the restrained gold `TC` brand seal remains in place until the crest file is supplied. No substitute crest has been fabricated.

## Operational notes

- New audit clients receive a single-use-visible access code. It is stored as a salted hash.
- The admin can review leads and update work status.
- PayFast ITN signatures are checked. For high-volume production, also add PayFast source-IP and server validation according to the merchant account’s current integration guide.
- Files are type- and size-limited. Add malware scanning and object storage for a multi-instance deployment.
- The included JSON store is reliable for a single server. Use a managed database and shared object storage when horizontally scaling.
