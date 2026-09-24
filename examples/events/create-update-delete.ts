/**
 * Create a NOTE event on today's calendar, update its description, then
 * delete it. This writes to the account: it creates and removes a real
 * calendar event. The event is deleted in a finally block so a failed step
 * does not leave it behind.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account (briefly).
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/events/create-update-delete.ts
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
const now = new Date();
const today = localDate(now);

const event = await client.events.createEvent({
  category: 'NOTE',
  start_date_local: today,
  name: 'Created by the SDK example',
});
if (typeof event.id !== 'number') {
  console.error('The API did not return an id for the created event; it may need deleting by hand.');
  process.exit(1);
}
const eventId = event.id;
console.log(`Created event id=${eventId}`);

try {
  const updated = await client.events.updateEvent(eventId, { description: 'Edited by the SDK example' });
  console.log(`Updated description: ${updated.description}`);
} finally {
  await client.events.deleteEvent(eventId);
  console.log(`Deleted event ${eventId}`);
}
// #endregion main
