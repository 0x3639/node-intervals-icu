/**
 * Download a few file formats for the most recent activity and write the FIT
 * file to a freshly created private temp directory.
 *
 * The example does not delete the file it writes: producing a file you can open
 * is the point, so the FIT file is left behind for inspection and its path is
 * printed. Remove the directory yourself when you are done with it.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/download-files.ts
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(); // one timestamp for both bounds
const yearAgo = new Date(now);
yearAgo.setFullYear(yearAgo.getFullYear() - 1);
const newest = localDate(now);
const oldest = localDate(yearAgo);

const activities = await client.activities.listActivities({ oldest, newest });
const activity = activities.find((a) => a.type);

if (!activity) {
  console.log('No activities with a type in the last year');
} else {
  const id = activity.id!;

  const fit = await client.activities.downloadFitFile(id);
  // A fresh directory with a random name, rather than a predictable path in the shared
  // temp directory: nothing else can pre-create or read the file. `wx` refuses to write
  // to an existing path and 0o600 keeps the file readable only by the current user.
  const outDir = mkdtempSync(join(tmpdir(), 'intervals-icu-'));
  const fitPath = join(outDir, `${id}.fit`);
  writeFileSync(fitPath, fit, { mode: 0o600, flag: 'wx' });
  console.log(`FIT file: ${fit.length} bytes, written to ${fitPath} (left in place for inspection)`);

  const gpx = await client.activities.downloadGPX(id);
  console.log(`GPX file: ${gpx.length} bytes`);
}

const csv = await client.activities.downloadActivitiesCSV();
console.log(`Activities CSV: ${csv.length} bytes`);
// #endregion main
