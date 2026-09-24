/**
 * Create a workout in the athlete's first library folder, read it back, then
 * delete it. This writes to the account: it creates and removes a real
 * library workout. The workout is deleted in a finally block so a failed
 * step does not leave it behind.
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
 *   npx tsx examples/workouts/create-in-folder.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
// maxRetries: 0 — a create that committed before a 5xx would be repeated by a retry, and only the last response's id would be cleaned up.
const client = new IntervalsClient({ apiKey, maxRetries: 0 });

const folders = await client.folders.list();
const folder = folders[0];

if (!folder || folder.id === undefined) {
  console.log('No folders found (or the first one has no id); create a folder in the library before running this example');
} else {
  console.log(`Using folder: ${folder.name ?? folder.id}`);

  // A unique marker in the name: if the create fails after the server committed it, this
  // is what to search the account for.
  const marker = `Created by the SDK example ${Date.now()}`;

  const workout = await client.workouts.createWorkout({
    folder_id: folder.id,
    name: marker,
    type: 'Ride',
    description: '- 20m 85%',
  });

  if (typeof workout.id !== 'number') {
    console.error('The API did not return an id for the created workout; it may need deleting by hand.');
    process.exit(1);
  }
  const workoutId = workout.id;
  console.log(`Created workout id=${workoutId}`);

  try {
    const fetched = await client.workouts.getWorkout(workoutId);
    console.log(`Fetched workout description: ${fetched.description}`);
  } finally {
    await client.workouts.deleteWorkout(workoutId);
    console.log(`Deleted workout ${workoutId}`);
  }
}
// #endregion main
