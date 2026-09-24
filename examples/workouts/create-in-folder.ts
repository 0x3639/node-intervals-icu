/**
 * Create a workout in the athlete's first library folder, read it back, then
 * delete it. This writes to the account: it creates and removes a real
 * library workout. The workout is deleted in a finally block so a failed
 * step does not leave it behind.
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
const client = new IntervalsClient({ apiKey });

const folders = await client.folders.list();
const folder = folders[0];

if (!folder) {
  console.log('No folders found; create a folder in the library before running this example');
} else {
  console.log(`Using folder: ${folder.name ?? folder.id}`);

  const workout = await client.workouts.createWorkout({
    folder_id: folder.id,
    name: 'Created by the SDK example',
    type: 'Ride',
    description: '- 20m 85%',
  });
  console.log(`Created workout id=${workout.id}`);

  try {
    const fetched = await client.workouts.getWorkout(workout.id!);
    console.log(`Fetched workout description: ${fetched.description}`);
  } finally {
    await client.workouts.deleteWorkout(workout.id!);
    console.log(`Deleted workout ${workout.id}`);
  }
}
// #endregion main
