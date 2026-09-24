/**
 * Upload a FIT file as a new activity, then delete it again. This writes to
 * the account: it creates a real activity, and removes it in a finally block
 * when the upload response carries an activity id. If the response carries no
 * id, the activity stays on the account and has to be deleted by hand.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account (briefly).
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/upload-activity.ts /path/to/ride.fit
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npx tsx examples/guides/upload-activity.ts /path/to/ride.fit');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const file = readFileSync(filePath);
const uploaded = await client.activities.uploadActivity(file, basename(filePath), {
  name: 'Uploaded from the SDK',
});

// UploadResponse reports the created activities in `activities`, and a single-activity
// upload also echoes an `id`. Collect whichever is present so the example can clean up
// after itself.
const created = (uploaded.activities ?? []).flatMap((a) => (typeof a.id === 'string' ? [a.id] : []));
if (created.length === 0 && typeof uploaded.id === 'string') created.push(uploaded.id);

try {
  console.log(`Uploaded, id=${created.join(', ') || 'not reported in the response'}`);
} finally {
  for (const id of created) {
    await client.activities.deleteActivity(id);
    console.log(`Deleted activity ${id}`);
  }
  if (created.length === 0) {
    console.log('The upload response carried no activity id; the uploaded activity remains on the account');
  }
}
// #endregion main
