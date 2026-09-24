/**
 * Create a maintenance reminder on the athlete's first gear item, then
 * delete it. This writes to the account: it creates and removes a real gear
 * reminder. The reminder is deleted in a finally block so a failed step does
 * not leave it behind.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account (briefly).
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/gear/reminders.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const gear = await client.gear.list();
const item = gear[0];

if (!item || item.id === undefined) {
  console.log('No gear found; add an item of gear before running this example');
} else {
  console.log(`Using gear: ${item.name ?? item.id}`);

  const reminder = await client.gear.createReminder(item.id, {
    type: 'DISTANCE',
    threshold: 5000,
    message: 'Created by the SDK example',
  });
  if (typeof reminder.id !== 'number') {
    console.error('The API did not return an id for the created reminder; it may need deleting by hand.');
    process.exit(1);
  }
  const reminderId = reminder.id;
  console.log(`Created reminder id=${reminderId}`);

  try {
    console.log(`Reminder message: ${reminder.message}`);
  } finally {
    await client.gear.deleteReminder(item.id, reminderId);
    console.log(`Deleted reminder ${reminderId}`);
  }
}
// #endregion main
