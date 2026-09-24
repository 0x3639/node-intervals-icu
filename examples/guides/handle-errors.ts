/**
 * Catch and inspect an IntervalsAPIError thrown by a failed request.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/handle-errors.ts
 */
import { IntervalsClient, IntervalsAPIError } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

try {
  await client.activities.getActivity('does-not-exist');
} catch (err) {
  if (err instanceof IntervalsAPIError) {
    console.log(`status=${err.status} code=${err.code} message=${err.message} retryAfter=${err.retryAfter}`);
    // `details` is the body the API sent with the error, e.g. { status: 422, error: '...' } on a validation failure.
    if (err.details !== undefined) console.log('details:', JSON.stringify(err.details));
  } else {
    throw err;
  }
}
// #endregion main
