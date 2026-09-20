import { describe, it, expect } from 'vitest';
import { LIVE, liveClient, athleteId } from './setup.js';

describe.skipIf(!LIVE)('live: smoke', () => {
  it('fetches the authenticated athlete', async () => {
    const athlete = await liveClient().athletes.getAthlete();
    expect(athlete.id).toBe(athleteId());
  });
});
