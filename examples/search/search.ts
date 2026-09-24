/**
 * Search the athlete's activities for the free-text query "tempo".
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/search/search.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const results = await client.search.searchActivities('tempo');
console.log(`${results.length} result(s)`);
for (const result of results) {
  console.log(`- ${result.start_date_local ?? ''} ${result.name ?? result.id}`);
}
// #endregion main
