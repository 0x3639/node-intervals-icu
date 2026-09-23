/**
 * Create a NOTE event on today's calendar, mark it done, then delete it. This
 * writes to the account: it creates and removes a real calendar event.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account (briefly).
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/events/create-and-mark-done.ts
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
const today = localDate(new Date());

const event = await client.events.createEvent({
  category: 'NOTE',
  start_date_local: today,
  name: 'Created by the SDK example',
});
console.log(`Created event id=${event.id}`);

await client.events.markEventAsDone(event.id!);
console.log(`Marked event ${event.id} as done`);

await client.events.deleteEvent(event.id!);
console.log(`Deleted event ${event.id}`);
// #endregion main
