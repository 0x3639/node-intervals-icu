// Pure verdict logic shared by scripts/audit-probe.mjs and its tests. No I/O here.

/**
 * Classify a probe result pair.
 *
 * `sdkMalformed` / `specMalformed` say whether that side's request was sent
 * with an intentionally malformed body (BAD), so a 400/415 there means "the
 * route exists and rejected bad input" rather than "the request failed" —
 * each side's malformed-ness is judged only against its own flag, never the
 * other side's.
 */
export function verdict(sdkRes, specRes, sdkMalformed, specMalformed) {
  const ok = (r, malformed) => r && (r.status < 300 || (malformed && (r.status === 400 || r.status === 415)));
  if (ok(sdkRes, sdkMalformed)) return 'works-as-written';
  if (ok(specRes, specMalformed)) return 'broken: fix to spec';
  if (sdkRes?.status === 405) return 'broken: verb';
  if (sdkRes?.status === 404 && (!specRes || specRes.status === 404)) return 'broken: delete';
  return 'ambiguous';
}
