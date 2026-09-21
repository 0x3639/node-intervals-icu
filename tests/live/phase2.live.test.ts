import { describe, it, expect } from 'vitest';
import { LIVE, liveClient } from './setup.js';
import type { Event, WorkoutConversionInput } from '../../src/types/index.js';

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

/**
 * A calendar event that carries every field convertWorkout() requires, plus an id for
 * events.downloadWorkout(). The guard checks runtime shapes, not just truthiness: API data
 * is external, and the type says nothing about what the server actually sent.
 */
type ConvertibleEvent = Event & WorkoutConversionInput & { id: number };
const isConvertible = (e: Event): e is ConvertibleEvent =>
  typeof e.id === 'number' &&
  typeof e.name === 'string' &&
  typeof e.description === 'string' &&
  typeof e.type === 'string' &&
  typeof e.workout_doc === 'object' && e.workout_doc !== null && !Array.isArray(e.workout_doc);

/** First convertible calendar WORKOUT event in the last year, or undefined when the account has none. */
async function firstCalendarWorkoutEvent(): Promise<ConvertibleEvent | undefined> {
  const events = await liveClient().events.listEvents({
    oldest: yearAgo(),
    newest: today(),
    category: ['WORKOUT'],
  });
  return events.find(isConvertible);
}

describe.skipIf(!LIVE)('live: phase 2 verb fixes', () => {
  it('downloadFitFiles returns a zip for the most recent activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip(); // reported as skipped, not passed
    const zip = await liveClient().activities.downloadFitFiles([id as string]);
    expect(zip.subarray(0, 2).toString()).toBe('PK');
  });

  // A minimal inline body ({ name, description, type }) 500s on this account (see AUDIT.md).
  // Including `workout_doc` from an existing calendar workout event makes the conversion succeed,
  // so this test derives the body from one of the athlete's calendar workouts.
  it('convertWorkout returns a Zwift file for a workout derived from a calendar event', async (ctx) => {
    const event = await firstCalendarWorkoutEvent();
    if (!event) ctx.skip(); // reported as skipped, not passed
    const zwo = await liveClient().workouts.convertWorkout(
      { name: event!.name, description: event!.description, type: event!.type, workout_doc: event!.workout_doc },
      '.zwo',
    );
    expect(zwo.toString()).toContain('<workout_file');
  });

  it('convertWorkoutForAthlete returns a Zwift file for a workout derived from a calendar event', async (ctx) => {
    const event = await firstCalendarWorkoutEvent();
    if (!event) ctx.skip(); // reported as skipped, not passed
    const zwo = await liveClient().workouts.convertWorkoutForAthlete(
      { name: event!.name, description: event!.description, type: event!.type, workout_doc: event!.workout_doc },
      '.zwo',
    );
    expect(zwo.toString()).toContain('<workout_file');
  });

  it('events.downloadWorkout returns a Zwift file for a calendar workout event', async (ctx) => {
    const event = await firstCalendarWorkoutEvent();
    if (!event) ctx.skip(); // reported as skipped, not passed
    const zwo = await liveClient().events.downloadWorkout(event!.id, '.zwo');
    expect(zwo.toString()).toContain('<workout_file');
  });

  it('listChats responds', async () => {
    expect(Array.isArray(await liveClient().chats.listChats())).toBe(true);
  });
  it('getSummary responds', async () => {
    expect(Array.isArray(await liveClient().athletes.getSummary({ start: yearAgo(), end: today() }))).toBe(true);
  });
  // Proves the `tags` array param binds without a server error under the repeated-key
  // encoding (paramsSerializer: { indexes: null }); a nonexistent tag legitimately
  // returns an empty (or unfiltered, depending on API behavior) array, so we only
  // assert the shape, not emptiness.
  it('getSummary with a tags array param responds', async () => {
    const result = await liveClient().athletes.getSummary({
      start: yearAgo(),
      end: today(),
      tags: ['nonexistent-tag-xyz'],
    });
    expect(Array.isArray(result)).toBe(true);
  });
  it('getPowerHRCurve responds', async () => {
    expect(await liveClient().performance.getPowerHRCurve({ start: yearAgo(), end: today() })).toBeTypeOf('object');
  });
  it('getForecast responds', async () => {
    expect(await liveClient().weather.getForecast()).toBeTypeOf('object');
  });
  it('getWeatherSummary responds for the latest activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    expect(await liveClient().activities.getWeatherSummary(id as string)).toBeTypeOf('object');
  });
  // This account has exactly one route, so we compare it against itself. That proves the
  // route (GET /routes/{id}/similarity/{otherId}) is reachable and responds — it does not
  // prove the similarity value is semantically meaningful for two distinct routes.
  it('getSimilarity responds for the first route', async (ctx) => {
    const [route] = await liveClient().routes.list();
    if (!route?.route_id) ctx.skip();
    expect(await liveClient().routes.getSimilarity(route.route_id as number, route.route_id as number)).toBeTypeOf('object');
  });
});
