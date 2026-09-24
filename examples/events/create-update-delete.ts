/**
 * Create a NOTE event on today's calendar, update its description, then
 * delete it. This writes to the account: it creates and removes a real
 * calendar event. The event is deleted in a finally block so a failed step
 * does not leave it behind.
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
 *   npx tsx examples/events/create-update-delete.ts
 */
import { IntervalsClient } from '../../src/index.js';
import { localDateIn } from '../_shared/local-date.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
// maxRetries: 0 — a create that committed before a 5xx would be repeated by a retry, and only the last response's id would be cleaned up.
const client = new IntervalsClient({ apiKey, maxRetries: 0 });

// The API keys calendar events by the athlete's local date, not the machine's. A machine
// in a different time zone (or a CI runner on UTC) would otherwise create the event on the
// wrong day, so the date is formatted in the athlete's zone (see
// examples/_shared/local-date.ts).

const me = await client.athletes.getAthlete();
const today = localDateIn(new Date(), me.timezone);

// A unique marker in the name: if the create fails after the server committed it, this
// is what to search the account for.
const marker = `Created by the SDK example ${Date.now()}`;

const event = await client.events.createEvent({
  category: 'NOTE',
  start_date_local: today,
  name: marker,
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
