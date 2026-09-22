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
  it('blockChat toggles a private chat on and back off', async (ctx) => {
    const chat = (await c().chats.listChats()).find((x) => x.type === 'PRIVATE' && x.id);
    if (!chat) ctx.skip();
    const chatId = chat!.id as number;
    let unblocked: Chat | undefined;
    try {
      const blocked = await c().chats.blockChat(chatId, true);
      expect(blocked.id).toBe(chatId);
    } finally {
      unblocked = await c().chats.blockChat(chatId, false);
    }
    expect(unblocked.id).toBe(chatId);
  });

  it('updateMessage and deleteMessage act on a message this test sent to the caller', async () => {
    const sent = await c().chats.sendMessage({ to_athlete_id: athleteId(), content: 'phase 3 live test', type: 'TEXT' });
    // `chat_id` is not in the vendored Message schema; read it defensively from the raw
    // response and fall back to the new chat's id. Verified only when LIVE_WRITE runs.
    const chatId = (sent.message as { chat_id?: number } | undefined)?.chat_id ?? sent.new_chat?.id;
    const msgId = sent.message?.id ?? sent.id;
    // Fail, do not skip: a message now exists and the ids are needed to delete it.
    expect(chatId, `send response lacks a chat id: ${JSON.stringify(sent)}`).toBeTypeOf('number');
    expect(msgId, `send response lacks a message id: ${JSON.stringify(sent)}`).toBeTypeOf('number');
    try {
      await c().chats.updateMessage(chatId as number, msgId as number, { content: 'phase 3 live test (edited)' });
      const after = await c().chats.listMessages(chatId as number, { limit: 20 });
      expect(after.find((m) => m.id === msgId)?.content).toBe('phase 3 live test (edited)');
    } finally {
      await c().chats.deleteMessage(chatId as number, msgId as number);
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
