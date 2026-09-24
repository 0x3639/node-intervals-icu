/**
 * List the athlete's routes, then compare the first route to itself. Does
 * not change the account: every call is a read.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/routes/list-and-similarity.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const routes = await client.routes.list();
console.log(`${routes.length} routes`);
for (const route of routes) {
  console.log(`- ${route.name ?? route.route_id}: ${route.distance ?? 0} m`);
}

const first = routes[0];
if (!first || first.route_id === undefined) {
  console.log('No routes found');
} else {
  // Comparing a route to itself does not measure anything useful; it only proves the
  // route is reachable through getSimilarity. A real comparison needs a second route id.
  const similarity = await client.routes.getSimilarity(first.route_id, first.route_id);
  console.log(`Route ${first.route_id} is reachable via getSimilarity (self-similarity=${similarity.similarity ?? 'n/a'})`);
}
// #endregion main
