# API audit

Pending. Run the probe with your own credentials and commit the output:

```bash
INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 npm run audit:probe > AUDIT.md
```

The probe only reads data. Its write-verb probes send a malformed body so the server rejects them before any handler runs.

Until this file holds verdicts, Phase 2 (fixes) cannot start. See `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`.
