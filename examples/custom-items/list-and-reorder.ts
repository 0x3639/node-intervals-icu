/**
 * List the athlete's custom items, then reorder them into their current
 * order (a no-op that exercises the route). This writes to the account: it
 * calls the reorder endpoint even though the resulting order is unchanged.
 *
 * CI never runs this example. Running it by hand writes to the authenticated
 * account (briefly, and harmlessly since the order does not change).
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/custom-items/list-and-reorder.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const items = await client.customItems.list();
console.log(`${items.length} custom items`);
for (const item of items) {
  console.log(`- ${item.id}  ${item.type ?? 'unknown type'}  ${item.name ?? ''}`);
}

// flatMap drops (and narrows away) any item the API returned without an id.
const order = items.flatMap((item, index) => (typeof item.id === 'number' ? [{ id: item.id, index }] : []));

if (order.length !== items.length || order.length === 0) {
  console.log('No custom items (or one is missing an id); skipping reorder');
} else {
  await client.customItems.reorder(order);
  console.log(`Reordered ${order.length} custom items (no-op: same order)`);
}
// #endregion main
