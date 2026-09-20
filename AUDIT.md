# API audit

Pending. Run the probe with your own credentials and commit the output:

```bash
INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 npm run audit:probe > AUDIT.md
```

The probe only reads data. Its write-verb probes send a malformed body where the route takes a body, so the server rejects them before any handler runs; bodyless DELETEs use a sentinel id that cannot correspond to real data (wellness date 1900-01-01, shared-event id 0). Nothing is created or modified.

Until this file holds verdicts, Phase 2 (fixes) cannot start. See `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`.
