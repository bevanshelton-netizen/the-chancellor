# THE CHANCELLOR — Hybrid Infrastructure Standard

## Decision

THE CHANCELLOR operates on both IZAKHONO-owned infrastructure and a verified external resilience route.

### Primary route

IZAKHONO-owned infrastructure is the authoritative production target:

```
THE CHANCELLOR
→ NODE01
→ APP FABRIC
→ FORTRESS
→ IZAKHONO EDGE / TLS
→ IZAKHONO DNS
```

The owned route hosts the full Node.js application, private API, persistent application data, secure sessions, case workflows, professional network workflows, payments, and administrative functions.

### External resilience route

A verified external route remains available for:

- public continuity;
- failover while NODE01, EDGE, DNS or TLS is unavailable;
- static public access when the external provider cannot support the full Node.js runtime;
- emergency recovery;
- staged migrations and rollback.

The current Vercel route may be used as a static public resilience route. It must not be treated as a full production backend unless `/api/health`, `/api/features` and `/api/go-live` are independently verified there.

A backend-capable external provider may be added as a secondary runtime only after persistent storage, environment secrets, health checks, payment callbacks and data integrity are verified.

## Source of truth

- Authoritative source: `bevanshelton-netizen/the-chancellor`
- Primary runtime: IZAKHONO NODE01
- External fallback: provider-specific verified route
- Public promotion status must be evidence-based.

## Traffic rule

No owned cutover may disable a working external route before the owned route has passed:

1. local application health;
2. `/api/features`;
3. `/api/go-live`;
4. persistent-data restart test;
5. backup and restore test;
6. EDGE/TLS/DNS public verification;
7. payment sandbox verification;
8. rollback/failback verification.

If the owned route fails any gate, traffic remains on or falls back to the last verified external route.

## Status labels

- BUILT / VERIFIED LOCALLY
- EXTERNAL LIVE VERIFIED
- HYBRID LIVE
- OWNED LIVE VERIFIED

`HYBRID LIVE` means the owned runtime is operating while an external route remains available for resilience.

## Payment rule

Hosting changes must not silently change payment configuration, settlement instructions, prices, customer records, or merchant identity.

PayFast must remain in sandbox until end-to-end callback and payment verification pass on the target runtime. Live mode is enabled only after those gates pass.

## Data rule

Persistent customer and case data must have one authoritative write path at a time unless a tested replication design has been introduced.

Static external fallback pages must never be treated as authoritative for transactional data.

## Operating principle

Owned first. Externally reversible. No false live claims. No single-host dependency.
