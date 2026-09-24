/**
 * Get a shared event by id, given as a command-line argument. Prints a usage
 * message and exits if the id is missing, and prints the error status if the
 * lookup fails (the account used for this example has no known shared event
 * id, so a 404 is the expected outcome).
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/shared-events/get.ts <event-id>
 */
import { IntervalsClient, IntervalsAPIError } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

const eventId = Number(process.argv[2]);
if (!Number.isInteger(eventId) || eventId <= 0) {
  console.error('Usage: npx tsx examples/shared-events/get.ts <event-id>');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

try {
  const event = await client.sharedEvents.get(eventId);
  console.log(`${event.name ?? eventId}: ${event.start_date_local ?? 'n/a'} at ${event.location ?? 'n/a'}`);
} catch (err) {
  if (err instanceof IntervalsAPIError) {
    console.log(`Could not fetch shared event ${eventId}: status=${err.status}`);
  } else {
    throw err;
  }
}
// #endregion main
