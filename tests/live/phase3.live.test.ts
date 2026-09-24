import { describe, it, expect } from 'vitest';
import { LIVE, LIVE_WRITE, athleteId, liveClient } from './setup.js';
import type { Chat } from '../../src/types/index.js';

const today = () => new Date().toISOString().slice(0, 10);
const yearAgo = () => new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);

/** Latest activity with a usable type (skips this account's malformed Strava-import stubs). */
async function latestActivityId(): Promise<string | undefined> {
  const activities = await liveClient().activities.listActivities({ oldest: yearAgo(), newest: today() });
  return activities.find((a) => a.type)?.id;
}

describe.skipIf(!LIVE)('live: phase 3 — existing services', () => {
  const c = () => liveClient();

  it('getActivities returns the latest activity by id', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    const list = await c().activities.getActivities([id as string]);
    expect(list.map((a) => a.id)).toContain(id);
  });
  it('listActivitiesAround responds for the latest activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    expect(Array.isArray(await c().activities.listActivitiesAround(id as string, { limit: 3 }))).toBe(true);
  });
  it('searchActivitiesFull responds', async () => {
    expect(Array.isArray(await c().activities.searchActivitiesFull('a', { limit: 2 }))).toBe(true);
  });
  it('searchIntervals responds', async () => {
    const r = await c().activities.searchIntervals({ minSecs: 60, maxSecs: 3600, minIntensity: 0, maxIntensity: 300, limit: 2 });
    expect(Array.isArray(r)).toBe(true);
  });
  it('listActivityTags responds', async () => {
    expect(Array.isArray(await c().activities.listActivityTags())).toBe(true);
  });
  it('downloadActivitiesCSV returns CSV text', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    const csv = await c().activities.downloadActivitiesCSV();
    expect(csv.toString().split('\n')[0]).toContain('id');
  });
  it('downloadGPX returns a GPX document for the latest activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    expect((await c().activities.downloadGPX(id as string)).toString()).toContain('<gpx');
  });

  it('listAthletes includes the caller', async () => {
    const list = await c().athletes.listAthletes();
    expect(list.map((a) => a.id)).toContain(athleteId());
  });
  it('getConnections responds with an id', async () => {
    expect((await c().athletes.getConnections()).id).toBe(athleteId());
  });
  it('getSettings responds for desktop', async () => {
    expect(await c().athletes.getSettings('desktop')).toBeTypeOf('object');
  });
  // athletes.disconnectApp() is deliberately never called: it revokes the calling app.

  it('getChat returns the first chat', async (ctx) => {
    const [chat] = await c().chats.listChats();
    if (!chat?.id) ctx.skip();
    expect((await c().chats.getChat(chat.id as number)).id).toBe(chat.id);
  });
  it('listGroups responds', async () => {
    expect(Array.isArray(await c().chats.listGroups())).toBe(true);
  });

  it('listEventTags responds', async () => {
    expect(Array.isArray(await c().events.listEventTags())).toBe(true);
  });
  it('listFitnessModelEvents responds', async () => {
    expect(Array.isArray(await c().events.listFitnessModelEvents())).toBe(true);
  });
  it('downloadWorkoutsZip returns a zip when the calendar has workouts', async (ctx) => {
    const events = await c().events.listEvents({ oldest: yearAgo(), newest: today(), category: ['WORKOUT'] });
    if (events.length === 0) ctx.skip();
    const zip = await c().events.downloadWorkoutsZip({ ext: '.zwo', oldest: yearAgo(), newest: today() });
    expect(zip.subarray(0, 2).toString()).toBe('PK');
  });

  it('gear.list and gear.downloadCSV respond', async () => {
    expect(Array.isArray(await c().gear.list())).toBe(true);
    expect((await c().gear.downloadCSV()).length).toBeGreaterThan(0);
  });
  it('gear.calc responds for the first item of gear', async (ctx) => {
    const [g] = await c().gear.list();
    if (!g?.id) ctx.skip();
    expect(await c().gear.calc(g.id as string)).toBeTypeOf('object');
  });

  it('sport settings matching-activities and pace_distances respond for the first settings', async (ctx) => {
    const [s] = await c().sportSettings.list();
    if (s?.id === undefined) ctx.skip();
    expect(Array.isArray(await c().sportSettings.listMatchingActivities(s.id as number))).toBe(true);
    expect(await c().sportSettings.getPaceDistances(s.id as number)).toBeTypeOf('object');
  });

  it('listWorkoutTags responds', async () => {
    expect(Array.isArray(await c().workouts.listWorkoutTags())).toBe(true);
  });
});

describe.skipIf(!LIVE_WRITE)('live (write): phase 3 chat mutations', () => {
  const c = () => liveClient();

  // Every write below restores state in a `finally` so a failed assertion or a thrown
  // request cannot leave the account blocked or with a stray message.
  it('blockChat toggles a private chat and restores its original state', async (ctx) => {
    const chat = (await c().chats.listChats()).find((x) => x.type === 'PRIVATE' && typeof x.id === 'number');
    if (!chat) ctx.skip();
    const chatId = chat!.id as number;
    // Restore whatever the chat was before, so an already-blocked chat stays blocked.
    const wasBlocked = Boolean(chat!.blocked);
    let restored: Chat | undefined;
    try {
      const toggled = await c().chats.blockChat(chatId, !wasBlocked);
      expect(toggled.id).toBe(chatId);
    } finally {
      restored = await c().chats.blockChat(chatId, wasBlocked);
    }
    expect(restored.id).toBe(chatId);
  });

  // The API refuses a message to yourself (422 "Cannot send message to self", probed
  // 2026-09-24), so the round trip needs a consenting recipient: set INTERVALS_LIVE_CHAT_TO
  // to that athlete's id. They receive one message, which is edited and then deleted.
  const CHAT_TO = process.env.INTERVALS_LIVE_CHAT_TO;

  it('sendMessage to the caller is rejected with 422 and the reason is on the error', async () => {
    // Marked and cleaned up like every other write: if the API ever starts accepting
    // self-sends, the assertion fails but no stray message is left behind.
    const content = `phase 3 live test self-send ${Date.now()}`;
    let accepted = false;
    try {
      await c().chats.sendMessage({ to_athlete_id: athleteId(), content, type: 'TEXT' });
      accepted = true;
    } catch (err) {
      expect(err).toMatchObject({ status: 422, details: { error: 'Cannot send message to self' } });
    } finally {
      // Only a message the API accepted needs finding and deleting; the expected rejection
      // leaves nothing behind, so the chat scan is skipped.
      if (accepted) {
        for (const chat of await c().chats.listChats()) {
          if (typeof chat.id !== 'number') continue;
          const hit = (await c().chats.listMessages(chat.id, { limit: 20 })).find((m) => m.content === content);
          if (typeof hit?.id === 'number') await c().chats.deleteMessage(chat.id, hit.id);
        }
      }
    }
    expect(accepted).toBe(false);
  });

  it.skipIf(!CHAT_TO)('updateMessage and deleteMessage act on a message this test sent to INTERVALS_LIVE_CHAT_TO', async () => {
    const content = `phase 3 live test ${Date.now()}`;
    const edited = `${content} (edited)`;
    let chatId: number | undefined;
    let msgId: number | undefined;
    // Find the message by its unique content (original or edited) across the caller's chats.
    const recover = async () => {
      for (const chat of await c().chats.listChats()) {
        if (typeof chat.id !== 'number') continue;
        const hit = (await c().chats.listMessages(chat.id, { limit: 20 })).find((m) => m.content === content || m.content === edited);
        if (typeof hit?.id === 'number') {
          chatId = chat.id;
          msgId = hit.id;
          return;
        }
      }
    };
    try {
      const sent = await c().chats.sendMessage({ to_athlete_id: CHAT_TO as string, content, type: 'TEXT' });
      // `chat_id` is not in the vendored Message schema; read it defensively from the raw
      // response and fall back to the new chat's id. Verified only when LIVE_WRITE runs.
      chatId = (sent.message as { chat_id?: number } | undefined)?.chat_id ?? sent.new_chat?.id;
      msgId = sent.message?.id ?? sent.id;
      if (typeof chatId !== 'number' || typeof msgId !== 'number') await recover();
      expect(chatId, `could not determine the chat id of the sent message: ${JSON.stringify(sent)}`).toBeTypeOf('number');
      expect(msgId, `could not determine the message id of the sent message: ${JSON.stringify(sent)}`).toBeTypeOf('number');
      await c().chats.updateMessage(chatId as number, msgId as number, { content: edited });
      const after = await c().chats.listMessages(chatId as number, { limit: 20 });
      expect(after.find((m) => m.id === msgId)?.content).toBe(edited);
    } finally {
      // The send may have been accepted even if its response was lost or recovery threw:
      // try recovery once more, then delete whenever the ids are known.
      if (typeof chatId !== 'number' || typeof msgId !== 'number') {
        try {
          await recover();
        } catch {
          // Nothing more can be done here; the failing assertion above carries the response body.
        }
      }
      if (typeof chatId === 'number' && typeof msgId === 'number') {
        await c().chats.deleteMessage(chatId, msgId);
      }
    }
  });
});

// Irreversible: there is no API to recreate a tombstone, so nothing here can be cleaned up.
// LIVE_WRITE is not enough. This block also needs INTERVALS_LIVE_DESTRUCTIVE=1, a separate
// opt-in that says "I accept permanent changes", plus the tombstoned activity id to clear.
const DESTRUCTIVE = LIVE_WRITE && process.env.INTERVALS_LIVE_DESTRUCTIVE === '1' && !!process.env.INTERVALS_TOMBSTONE_ID;
describe.skipIf(!DESTRUCTIVE)('live (write, irreversible): deleteTombstone', () => {
  it('deleteTombstone clears the supplied tombstone', async () => {
    await expect(liveClient().activities.deleteTombstone(process.env.INTERVALS_TOMBSTONE_ID as string)).resolves.toBeUndefined();
  });
});

describe.skipIf(!LIVE)('live: phase 3 — analytics and activity pace curves', () => {
  const c = () => liveClient();

  it('the four histograms return arrays for the latest activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    for (const fn of ['getPowerHistogram', 'getHRHistogram', 'getPaceHistogram', 'getGAPHistogram'] as const) {
      expect(Array.isArray(await c().analytics[fn](id as string)), fn).toBe(true);
    }
  });
  it('getTimeAtHR returns secs arrays', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    const plot = await c().analytics.getTimeAtHR(id as string);
    expect(Array.isArray(plot.secs)).toBe(true);
  });
  it('getIntervalStats works on the first interval of an activity that has one', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    const [iv] = (await c().activities.getIntervals(id as string)).icu_intervals ?? [];
    if (iv?.start_index === undefined || iv?.end_index === undefined) ctx.skip();
    const stats = await c().analytics.getIntervalStats(id as string, iv!.start_index as number, iv!.end_index as number);
    expect(stats).toBeTypeOf('object');
  });
  it('getPowerSpikeModel responds', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    const model = await c().analytics.getPowerSpikeModel(id as string);
    expect(Object.keys(model)).toContain('criticalPower');
  });
  // LIVE: the API returns 422 for stream or fatigue values the activity cannot serve (observed: hr, pace, kj0, kj1 on a ride); watts + normal bind both array params on the wire.
  it('getCurves and its CSV sibling respond', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    expect(Array.isArray(await c().analytics.getCurves(id as string, { types: ['watts'], fatigue: ['normal'] }))).toBe(true);
    expect((await c().analytics.getCurvesCSV(id as string, { types: ['watts'] })).length).toBeGreaterThan(0);
  });
  it('getMMPModel responds for Ride', async () => {
    const model = await c().analytics.getMMPModel('Ride');
    expect(Object.keys(model)).toContain('criticalPower');
  });
  it('getActivityPaceCurves returns { distances, gap, curves }', async () => {
    const r = await c().performance.getActivityPaceCurves({ oldest: yearAgo(), newest: today(), type: 'Run', distances: [1000, 5000] });
    expect(Array.isArray(r.distances)).toBe(true);
    expect(typeof r.gap).toBe('boolean');
    expect(Array.isArray(r.curves)).toBe(true);
  });
  // LIVE: the CSV form returns 500 without `distances` (JSON form does not); always pass distances here.
  it('getActivityPaceCurvesCSV responds when distances are supplied', async () => {
    const csv = await c().performance.getActivityPaceCurvesCSV({ oldest: yearAgo(), newest: today(), type: 'Run', distances: [1000, 5000] });
    expect(csv.length).toBeGreaterThan(0);
  });
});
