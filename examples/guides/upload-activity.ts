/**
 * Upload a FIT file as a new activity. This writes to the account: it creates
 * an activity every time it is run.
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

console.log(`Uploaded, id=${uploaded.id}`);
// #endregion main
