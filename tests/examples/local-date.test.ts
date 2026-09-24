import { describe, it, expect } from 'vitest';
import { localDateIn, shiftDays } from '../../examples/_shared/local-date.js';

describe('localDateIn', () => {
  it('reads the calendar day in the named zone, not the machine zone', () => {
    const instant = new Date('2026-09-24T01:00:00Z');
    expect(localDateIn(instant, 'UTC')).toBe('2026-09-24');
    // 18:00 the previous day on the US west coast.
    expect(localDateIn(instant, 'America/Los_Angeles')).toBe('2026-09-23');
  });

  it('rolls forward for a zone that is already past midnight', () => {
    // 11:30 the next morning in New Zealand.
    expect(localDateIn(new Date('2026-09-23T23:30:00Z'), 'Pacific/Auckland')).toBe('2026-09-24');
  });

  it('falls back to the machine zone when no zone is given', () => {
    const instant = new Date('2026-09-24T01:00:00Z');
    const machine = `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`;
    expect(localDateIn(instant)).toBe(machine);
  });
});

describe('shiftDays', () => {
  it('steps a calendar day without crossing a DST boundary', () => {
    // 2026-03-08 is the US spring-forward day; the day before 03-09 is still 03-08.
    expect(shiftDays('2026-03-09', -1)).toBe('2026-03-08');
    // 2026-11-01 is the US fall-back day.
    expect(shiftDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('crosses month and year boundaries', () => {
    expect(shiftDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('round-trips a 30-day window', () => {
    for (const d of ['2026-03-09', '2026-11-01', '2026-01-01', '2026-12-31']) {
      expect(shiftDays(shiftDays(d, -30), 30)).toBe(d);
    }
  });
});
