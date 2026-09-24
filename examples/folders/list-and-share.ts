/**
 * List the athlete's folders and plans, then get who the first folder is
 * shared with. Does not change the account: it only reads.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/folders/list-and-share.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const folders = await client.folders.list();
console.log(`${folders.length} folders`);
for (const folder of folders) {
  const count = folder.num_workouts !== undefined ? `, ${folder.num_workouts} workouts` : '';
  console.log(`- ${folder.name ?? folder.id} (${folder.type ?? 'unknown type'}${count})`);
}

const first = folders[0];
if (!first || first.id === undefined) {
  console.log('No folders found');
} else {
  const sharedWith = await client.folders.getSharedWith(first.id);
  console.log(
    sharedWith.length > 0 ? `Shared with: ${sharedWith.map((s) => s.name ?? s.athlete_id).join(', ')}` : 'Not shared with anyone',
  );
}
// #endregion main
