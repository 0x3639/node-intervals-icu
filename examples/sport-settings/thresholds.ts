/**
 * List the athlete's sport settings and print each one's activity types and
 * key thresholds (FTP, threshold pace, threshold heart rate). Does not
 * change the account: it only reads.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/sport-settings/thresholds.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const settings = await client.sportSettings.list();
if (settings.length === 0) {
  console.log('No sport settings found');
} else {
  for (const entry of settings) {
    const types = entry.types?.join(', ') ?? 'n/a';
    console.log(`${types}: ftp=${entry.ftp ?? 'n/a'} threshold_pace=${entry.threshold_pace ?? 'n/a'} lthr=${entry.lthr ?? 'n/a'}`);
  }
}
// #endregion main
