import { describe, it, expect } from 'vitest';
import { verdict } from '../../scripts/lib/audit-verdict.mjs';

describe('verdict', () => {
  it('SDK 2xx -> works-as-written', () => {
    expect(verdict({ status: 200 }, null, false, false)).toBe('works-as-written');
  });

  it('SDK 404 + spec 2xx -> broken: fix to spec', () => {
    expect(verdict({ status: 404 }, { status: 200 }, false, false)).toBe('broken: fix to spec');
  });

  it('SDK 405 -> broken: verb', () => {
    expect(verdict({ status: 405 }, null, false, false)).toBe('broken: verb');
  });

  it('SDK 404 + no spec -> broken: delete', () => {
    expect(verdict({ status: 404 }, null, false, false)).toBe('broken: delete');
  });

  it('SDK 404 + spec 404 -> broken: delete', () => {
    expect(verdict({ status: 404 }, { status: 404 }, false, false)).toBe('broken: delete');
  });

  it('malformed-body 400 on the spec side only counts as spec ok, not SDK ok', () => {
    // SDK side is not marked malformed, so its 400 is a real failure, not a pass;
    // the spec side IS marked malformed, so its 400 means "route exists, rejected
    // the bad input" and counts as ok.
    expect(verdict({ status: 400 }, { status: 400 }, false, true)).toBe('broken: fix to spec');
  });
});
