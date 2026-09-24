/**
 * Pull the authenticated athlete's training-load summary over the last 90 days,
 * then list which devices/apps are connected and which UI settings the desktop
 * client stores.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/athletes/summary-and-connections.ts
 */
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
const quarterAgo = new Date(now);
quarterAgo.setDate(quarterAgo.getDate() - 89);
const end = localDate(now);
const start = localDate(quarterAgo);

const summary = await client.athletes.getSummary({ start, end });
const latest = summary.at(-1);
if (latest) {
  console.log(`Latest: fitness=${latest.fitness ?? 'n/a'} fatigue=${latest.fatigue ?? 'n/a'} form=${latest.form ?? 'n/a'}`);
} else {
  console.log('No summary rows in the last 90 days');
}

const connections = await client.athletes.getConnections();
const connected = Object.entries(connections).filter(([key, value]) => key.endsWith('_connected') && value === true);
console.log(connected.length > 0 ? `Connected: ${connected.map(([key]) => key.replace(/_connected$/, '')).join(', ')}` : 'Nothing connected');

const settings = await client.athletes.getSettings('desktop');
console.log(`Desktop settings groups: ${Object.keys(settings).join(', ')}`);
// #endregion main
