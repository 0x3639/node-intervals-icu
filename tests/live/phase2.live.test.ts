import { describe, it, expect } from 'vitest';
import { LIVE, liveClient, athleteId } from './setup.js';

const today = () => new Date().toISOString().slice(0, 10);
const yearAgo = () => new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);

/**
 * Latest activity id with a usable FIT source, or undefined when the account has none.
 * Skips malformed Strava-import stubs (all fields undefined except id/source) that this
 * account's history has among its most recent entries; the API 422s ("No activities
 * found") for those regardless of `ids` encoding, which is a data issue, not a route bug.
 */
async function latestActivityId() {
  const activities = await liveClient().activities.listActivities({ oldest: yearAgo(), newest: today() });
  return activities.find((a) => a.type)?.id;
}

describe.skipIf(!LIVE)('live: phase 2 verb fixes', () => {
  it('downloadFitFiles returns a zip for the most recent activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip(); // reported as skipped, not passed
    const zip = await liveClient().activities.downloadFitFiles([id as string]);
    expect(zip.subarray(0, 2).toString()).toBe('PK');
  });
});
