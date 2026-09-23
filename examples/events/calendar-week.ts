/**
 * List planned workouts and races on the calendar for the next 7 days, then
 * list every tag ever applied to a calendar event.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/events/calendar-week.ts
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
const weekAhead = new Date(now);
weekAhead.setDate(weekAhead.getDate() + 7);
const oldest = localDate(now);
const newest = localDate(weekAhead);

const events = await client.events.listEvents({ oldest, newest, category: ['WORKOUT', 'RACE'] });
if (events.length === 0) {
  console.log('No workouts or races in the next 7 days');
} else {
  for (const event of events) {
    console.log(`${event.start_date_local ?? ''}  ${event.category ?? ''}  ${event.name ?? ''}`);
  }
}

const tags = await client.events.listEventTags();
console.log(tags.length > 0 ? `Event tags: ${tags.join(', ')}` : 'No event tags');
// #endregion main
