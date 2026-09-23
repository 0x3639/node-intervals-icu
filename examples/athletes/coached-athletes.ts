/**
 * List the athletes an API key's owner follows or coaches as a table of id,
 * name and tags, then fetch one other athlete's public profile.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/athletes/coached-athletes.ts
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
  console.log(`${athlete.id}  ${athlete.name ?? ''}  [${(athlete.icu_tags ?? []).join(', ')}]`);
}

const other = athletes.find((athlete) => athlete.id !== me.id);
if (other) {
  const profile = await client.athletes.getProfile(other.id);
  console.log(`Profile for ${other.name ?? other.id}: ${JSON.stringify(profile).slice(0, 80)}`);
} else {
  console.log('No other coached/followed athletes');
}
// #endregion main
