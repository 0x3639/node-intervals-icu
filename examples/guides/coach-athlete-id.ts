/**
 * List the athletes an API key's owner follows or coaches, then pull one coached
 * athlete's activity count for the last 7 days by passing their id as the trailing
 * athleteId argument.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/coach-athlete-id.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const me = await client.athletes.getAthlete();
const athletes = await client.athletes.listAthletes();
for (const athlete of athletes) {
  console.log(`${athlete.id}  ${athlete.name ?? ''}`);
}

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(); // one timestamp for both bounds
const weekAgo = new Date(now);
weekAgo.setDate(weekAgo.getDate() - 7);
const newest = localDate(now);
const oldest = localDate(weekAgo);

const coached = athletes.find((athlete) => athlete.id !== me.id);
if (coached) {
  const activities = await client.activities.listActivities({ oldest, newest }, coached.id);
  console.log(`${coached.name ?? coached.id}: ${activities.length} activities in the last 7 days`);
} else {
  console.log('No coached athletes');
}
// #endregion main
