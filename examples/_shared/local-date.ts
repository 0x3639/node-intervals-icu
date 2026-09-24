/**
 * Date helpers shared by the examples. This file is a helper module, not a runnable
 * example: it reads no environment variables, constructs no client and has no top-level
 * `await`, so importing it does nothing.
 */

/**
 * Format `date` as `YYYY-MM-DD` in `timeZone`.
 *
 * The API reads every date parameter (`oldest`, `newest`, `start`, `end`, a wellness
 * record's key…) as a date in the athlete's own time zone, not the machine's, so a
 * machine in another zone — or a CI runner on UTC — would otherwise read or write the
 * wrong day. `Athlete.timezone` supplies the zone; an undefined `timeZone` means the
 * machine's own zone, which is the right fallback when the athlete has not set one.
 *
 * The calendar fields are assembled in a fixed order rather than taking the formatter's
 * whole string, because a Node build with limited ICU data can format `en-CA` differently.
 */
export function localDateIn(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const field = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${field('year')}-${field('month')}-${field('day')}`;
}

/**
 * Shift a `YYYY-MM-DD` date by whole calendar days.
 *
 * The arithmetic runs on the Y-M-D triple in UTC (`Date.UTC`, read back with the `getUTC*`
 * accessors), so it never crosses a daylight-saving boundary: shifting a local `Date` by
 * 24 hours lands on the same calendar day twice, or skips one, in the weeks either side of
 * a DST change. Use it to widen a window whose ends were formatted by {@link localDateIn}.
 */
export function shiftDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}
