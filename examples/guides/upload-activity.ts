/**
 * Upload a FIT file as a new activity, then delete it again. This writes to
 * the account: it creates a real activity, and removes it in a finally block
 * when the upload response carries an activity id. If the response carries no
 * id, the activity stays on the account and has to be deleted by hand.
 *
 * If the create call itself fails after the server committed it, nothing is cleaned
 * up: search the account for `Created by the SDK example` (or `Uploaded by the SDK
 * example`) and delete it by hand.
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
// maxRetries: 0 — a create that committed before a 5xx would be repeated by a retry, and only the last response's id would be cleaned up.
const client = new IntervalsClient({ apiKey, maxRetries: 0 });

// A unique marker in the name: if the upload fails after the server committed it, this
// is what to search the account for.
const marker = `Uploaded by the SDK example ${Date.now()}`;

const file = readFileSync(filePath);
const uploaded = await client.activities.uploadActivity(file, basename(filePath), {
  name: marker,
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
    try {
      await client.activities.deleteActivity(id);
      console.log(`Deleted activity ${id}`);
    } catch (err) {
      console.error(`Could not delete activity ${id}; remove it by hand:`, err);
    }
  }
  if (created.length === 0) {
    console.log('The upload response carried no activity id; the uploaded activity remains on the account');
  }
}
// #endregion main
