# API audit

Pending. Run the probe with your own credentials and commit the output:

```bash
INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 npm run audit:probe > AUDIT.md
```

By default the probe sends only GET requests. A probe whose SDK or spec form uses POST/PUT/DELETE is skipped unless `INTERVALS_LIVE_WRITE=1` is set; even then, it sends a malformed body where the route takes a body, or uses a sentinel id that cannot correspond to real data (wellness date 1900-01-01, shared-event id 0) for bodyless DELETEs. This is best-effort safety, not a guarantee that no handler runs — a 400 shows the route exists and rejected the input, not that mutation was impossible — so run it against an account whose data you can afford to risk.

Until this file holds verdicts, Phase 2 (fixes) cannot start. See `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`.
