import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Schema-backed types added in Phase 3 must declare exactly the properties the vendored
 * spec declares for the same schema, with the same optionality (from the schema's
 * `required` list) and the matching TypeScript type. This replaces a generated-types
 * step: it catches a typo or a spec change without committing a 9,700-line generated file.
 * Query-parameter option types (IntervalSearchOptions, ActivitiesAroundOptions, WorkoutsZipOptions,
 * ActivityPowerCurvesOptions, ActivityPaceCurvesOptions) are checked against paths[...].parameters
 * the same way, via `paramMembers`.
 */
const spec = JSON.parse(readFileSync(new URL('../../spec/openapi.json', import.meta.url), 'utf8'));

/** One property as both sides see it: name, whether it may be omitted, and its TypeScript type. */
interface Member { name: string; optional: boolean; type: string }

/** Map a JSON-schema property to the TypeScript type the hand-written interface should use. */
function tsType(prop: any): string {
  if (prop.$ref) return String(prop.$ref).split('/').pop() as string;
  switch (prop.type) {
    case 'string': return 'string';
    case 'boolean': return 'boolean';
    case 'integer':
    case 'number': return 'number';
    case 'array': return `${tsType(prop.items ?? {})}[]`;
    default: return 'unknown';
  }
}

function schemaMembers(name: string): Member[] {
  const schema = spec.components.schemas[name];
  if (!schema) throw new Error(`schema ${name} not in spec/openapi.json`);
  const required: string[] = schema.required ?? [];
  return Object.entries(schema.properties ?? {})
    .map(([k, v]) => ({ name: k, optional: !required.includes(k), type: tsType(v) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Parse `name?: type;` members out of an interface body or an inline object type. */
function parseMembers(body: string): Member[] {
  return [...body.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)(\?)?:\s*([^;]+);/gm)]
    .map((x) => ({ name: x[1], optional: x[2] === '?', type: x[3].trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function interfaceMembers(file: string, name: string): Member[] {
  const src = readFileSync(new URL(`../../src/types/${file}`, import.meta.url), 'utf8');
  const m = new RegExp(`export interface ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(src);
  if (!m) throw new Error(`interface ${name} not found in src/types/${file}`);
  return parseMembers(m[1]);
}

/**
 * Query parameters of one spec operation as Members. `overrides` names members whose
 * hand-written type deliberately differs from the schema's primitive (e.g. a shared union
 * type used across the SDK), and `omit` drops parameters that are method arguments rather
 * than option-object members.
 */
function paramMembers(path: string, verb: string, opts: { overrides?: Record<string, string>; omit?: string[] } = {}): Member[] {
  const op = spec.paths[`/api/v1${path}`]?.[verb];
  if (!op) throw new Error(`${verb.toUpperCase()} ${path} not in spec/openapi.json`);
  return (op.parameters ?? [])
    .filter((p: any) => p.in === 'query' && !(opts.omit ?? []).includes(p.name))
    .map((p: any) => ({
      name: p.name,
      optional: !p.required,
      type: opts.overrides?.[p.name] ?? (p.schema?.enum ? p.schema.enum.map((v: string) => `'${v}'`).join(' | ') : tsType(p.schema ?? {})),
    }))
    .sort((a: Member, b: Member) => a.name.localeCompare(b.name));
}

describe('Phase 3 hand-written types match the vendored spec (names, optionality, types)', () => {
  it('AthleteConnections', () => {
    expect(interfaceMembers('athlete.ts', 'AthleteConnections')).toEqual(schemaMembers('AthleteConnections'));
  });

  it('AthleteWithTags adds exactly the members the spec adds to Athlete', () => {
    const athleteNames = new Set(schemaMembers('Athlete').map((m) => m.name));
    const extra = schemaMembers('AthleteWithTags').filter((m) => !athleteNames.has(m.name));
    expect(extra.map((m) => m.name)).toEqual(['icu_notes', 'icu_tags']);
    const src = readFileSync(new URL('../../src/types/athlete.ts', import.meta.url), 'utf8');
    const alias = /export type AthleteWithTags = Athlete & \{([^}]*)\}/.exec(src);
    expect(alias, 'AthleteWithTags alias not found').toBeTruthy();
    expect(parseMembers(alias![1].replace(/;\s*$/, '') + ';')).toEqual(extra);
  });

  it('Bucket', () => {
    expect(interfaceMembers('activity.ts', 'Bucket')).toEqual(schemaMembers('Bucket'));
  });

  it('TimeAtHRPlot matches the spec schema named Plot', () => {
    expect(interfaceMembers('activity.ts', 'TimeAtHRPlot')).toEqual(schemaMembers('Plot'));
  });

  it('IntervalSearchOptions matches the interval-search query parameters', () => {
    expect(interfaceMembers('activity.ts', 'IntervalSearchOptions')).toEqual(paramMembers('/athlete/{id}/activities/interval-search', 'get'));
  });

  it('ActivitiesAroundOptions matches the activities-around query parameters minus activity_id', () => {
    expect(interfaceMembers('activity.ts', 'ActivitiesAroundOptions')).toEqual(paramMembers('/athlete/{id}/activities-around', 'get', { omit: ['activity_id'] }));
  });

  it('WorkoutsZipOptions matches the workouts.zip query parameters (ext is the shared WorkoutFormat union)', () => {
    expect(interfaceMembers('event.ts', 'WorkoutsZipOptions')).toEqual(paramMembers('/athlete/{id}/workouts.zip', 'get', { overrides: { ext: 'WorkoutFormat' } }));
  });

  it('ActivityPowerCurvesOptions matches the activity power-curves query parameters', () => {
    expect(interfaceMembers('performance.ts', 'ActivityPowerCurvesOptions')).toEqual(paramMembers('/activity/{id}/power-curves{ext}', 'get'));
  });

  it('ActivityPaceCurvesOptions matches the activity-pace-curves query parameters minus filters (type is the shared ActivityType union)', () => {
    expect(interfaceMembers('performance.ts', 'ActivityPaceCurvesOptions')).toEqual(paramMembers('/athlete/{id}/activity-pace-curves{ext}', 'get', { omit: ['filters'], overrides: { type: 'ActivityType' } }));
  });
});
