import { IntervalsClient } from '../../src/client.js';

export const LIVE = Boolean(process.env.INTERVALS_API_KEY && process.env.INTERVALS_ATHLETE_ID);
export const LIVE_WRITE = LIVE && process.env.INTERVALS_LIVE_WRITE === '1';

export function athleteId(): string {
  return process.env.INTERVALS_ATHLETE_ID as string;
}

export function liveClient(): IntervalsClient {
  return new IntervalsClient({
    apiKey: process.env.INTERVALS_API_KEY as string,
    athleteId: athleteId(),
    maxRetries: 0,
  });
}
