# THE CHANCELLOR — IZAKHONO Sovereign Handoff

This branch prepares THE CHANCELLOR for the IZAKHONO Core + IZAKHONO Cloud path and removes Vercel from the deployment design.

## Source of truth

- Application runtime: existing Node.js/Express production application
- Container build: repository root `Dockerfile`
- IZAKHONO manifest: repository root `.izakhono.json`
- Container port: `3000`
- Health gate: `/api/health`
- Paid-traffic readiness gate: `/api/go-live` with `readyForPaidTraffic=true`
- Persistent application data: `/app/data`

## First sovereign deployment

1. Provision a Docker-capable Ubuntu 24.04 host through the proven IZAKHONO Core/Cloud first-server process.
2. Place this repository/package on the host without embedding secrets in source.
3. Copy `deploy/the-chancellor.env.example` to `deploy/the-chancellor.env` and fill secrets on the host only.
4. Keep `PAYFAST_MODE=sandbox` for first deployment.
5. From `deploy/`, run the IZAKHONO deployment controller against `izakhono-compose.yml` (or use Docker Compose directly during first-host proof).
6. Require `/api/health` to pass before exposing the service.
7. Require `/api/go-live` to report `readyForPaidTraffic=true` before enabling paid traffic.
8. Verify persistent data survives container restart and complete a backup/restore drill.
9. Add public DNS/TLS only after the host is proven and the service passes end-to-end checks.
10. Switch PayFast to live only after sandbox ITN/payment verification passes.

## Safety boundary

This handoff makes THE CHANCELLOR deployable on the IZAKHONO sovereign path, but it does not by itself prove that the underlying public VM is production-ready. Do not claim commercial readiness until the first real host has passed the IZAKHONO production-proof/READY gate and this application has passed its own health, persistence, backup/restore and payment checks.
