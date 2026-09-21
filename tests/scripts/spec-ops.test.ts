import { describe, it, expect } from 'vitest';
import {
  normalizeSdkPath,
  specOperations,
  sdkOperations,
  specPathRegex,
  matchOperations,
  applyBaseline,
} from '../../scripts/lib/spec-ops.mjs';

const miniSpec = {
  paths: {
    '/api/v1/athlete/{id}/wellness{ext}': { get: { tags: ['Wellness'], summary: 'List wellness' } },
    '/api/v1/athlete/{id}/download-fit-files': { post: { tags: ['Activities'], summary: 'Zip' } },
    '/api/v1/download-workout{ext}': { post: { tags: ['Library'], summary: 'Convert' } },
    '/api/v1/athlete/{id}/chats': { get: { tags: ['Chats'], summary: 'List chats' } },
    '/api/v1/athlete/{id}/workouts.zip': { get: { tags: ['Events'], summary: 'Zip workouts' } },
  },
};

describe('normalizeSdkPath', () => {
  it('replaces template expressions with {x}', () => {
    expect(normalizeSdkPath('/athlete/${id}/wellness/${date}')).toBe('/athlete/{x}/wellness/{x}');
    expect(normalizeSdkPath('/download-workout${format}')).toBe('/download-workout{x}');
  });
});

describe('specOperations', () => {
  it('strips /api/v1 and upper-cases the verb', () => {
    const ops = specOperations(miniSpec);
    expect(ops).toHaveLength(5);
    expect(ops[0]).toEqual({
      method: 'GET',
      path: '/athlete/{id}/wellness{ext}',
      key: 'GET /athlete/{id}/wellness{ext}',
      tags: ['Wellness'],
      summary: 'List wellness',
    });
  });
});

describe('sdkOperations', () => {
  const files = [
    {
      name: 'wellness.service.ts',
      text: "this.httpClient.request<Wellness[]>({ method: 'GET', url: `/athlete/${id}/wellness`, params });",
    },
    {
      name: 'activity.service.ts',
      text: 'return this.httpClient.download(`/athlete/${id}/download-fit-files`, params);',
    },
    {
      name: 'workout.service.ts',
      text: "return this.httpClient.download(`/download-workout${format}`, { method: 'POST', data });",
    },
    {
      name: 'folder.service.ts',
      text: 'return this.httpClient.upload<Workout>({ url: `/athlete/${id}/folders/${folderId}/import-workout`, file, fileName });',
    },
    {
      name: 'client.ts',
      text: "return this.httpClient.request<PaceDistancesDTO>({ method: 'GET', url: '/pace_distances' });",
    },
  ];

  it('extracts request(), download(), upload() and plain-string urls', () => {
    const keys = sdkOperations(files).map((o) => o.key).sort();
    expect(keys).toEqual([
      'GET /athlete/{x}/download-fit-files',
      'GET /athlete/{x}/wellness',
      'GET /pace_distances',
      'POST /athlete/{x}/folders/{x}/import-workout',
      'POST /download-workout{x}',
    ]);
  });

  it('records the source file', () => {
    const op = sdkOperations(files).find((o) => o.key === 'GET /pace_distances');
    expect(op?.source).toBe('client.ts');
  });
});

describe('specPathRegex', () => {
  it('matches path params and optional inline extension', () => {
    const re = specPathRegex('/athlete/{id}/wellness{ext}');
    expect(re.test('/athlete/{x}/wellness')).toBe(true);
    expect(re.test('/athlete/{x}/wellness.csv')).toBe(true);
    expect(re.test('/athlete/{x}/wellness{x}')).toBe(true);
    expect(re.test('/athlete/{x}/wellness/{x}')).toBe(false);
  });

  it('does not treat a literal extension as optional', () => {
    const re = specPathRegex('/athlete/{id}/workouts.zip');
    expect(re.test('/athlete/{x}/workouts.zip')).toBe(true);
    expect(re.test('/athlete/{x}/workouts')).toBe(false);
  });
});

describe('matchOperations', () => {
  it('reports matched, phantom and missing', () => {
    const spec = specOperations(miniSpec);
    const sdk = sdkOperations([
      { name: 'a.ts', text: "request({ method: 'GET', url: `/athlete/${id}/wellness` })" },
      { name: 'b.ts', text: 'download(`/athlete/${id}/download-fit-files`)' },
      { name: 'c.ts', text: "request({ method: 'GET', url: `/chats` })" },
    ]);
    const result = matchOperations(spec, sdk);
    expect(result.matched.map((m) => m.spec.key)).toEqual(['GET /athlete/{id}/wellness{ext}']);
    expect(result.phantom.map((p) => p.key).sort()).toEqual([
      'GET /athlete/{x}/download-fit-files',
      'GET /chats',
    ]);
    expect(result.missing.map((m) => m.key).sort()).toEqual([
      'GET /athlete/{id}/chats',
      'GET /athlete/{id}/workouts.zip',
      'POST /athlete/{id}/download-fit-files',
      'POST /download-workout{ext}',
    ]);
  });

  it('picks the most specific spec path when multiple candidates match (regression)', () => {
    // `/events/{eventId}` is listed BEFORE `/events/bulk-delete` on purpose: a naive
    // `find()`-first-match would let the parameterized path swallow the SDK's literal
    // bulk-delete call, wrongly reporting `/events/bulk-delete` as phantom and
    // `/events/{eventId}` as matched instead of missing.
    const spec = {
      paths: {
        '/api/v1/athlete/{id}/events/{eventId}': { put: { tags: ['Events'], summary: 'Update event' } },
        '/api/v1/athlete/{id}/events/bulk-delete': { put: { tags: ['Events'], summary: 'Bulk delete events' } },
      },
    };
    const specOps = specOperations(spec);
    const sdk = sdkOperations([
      {
        name: 'events.service.ts',
        text: "request({ method: 'PUT', url: `/athlete/${id}/events/bulk-delete` })",
      },
    ]);
    const result = matchOperations(specOps, sdk);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].spec.key).toBe('PUT /athlete/{id}/events/bulk-delete');
    expect(result.phantom).toEqual([]);
    expect(result.missing.map((m) => m.key)).toEqual(['PUT /athlete/{id}/events/{eventId}']);
  });
});

describe('applyBaseline', () => {
  it('splits phantom ops into new (regressions) and resolved (stale baseline entries)', () => {
    const phantom = [{ key: 'GET /chats', source: 'chat.service.ts' }, { key: 'GET /search/athletes', source: 'search.service.ts' }];
    const baselineKeys = ['GET /chats', 'DELETE /athlete/{id}/wellness/{date}'];
    const { newPhantom, resolved } = applyBaseline(phantom, baselineKeys);
    expect(newPhantom.map((p) => p.key)).toEqual(['GET /search/athletes']);
    expect(resolved).toEqual(['DELETE /athlete/{id}/wellness/{date}']);
  });

  it('treats every phantom op as new when the baseline is empty', () => {
    const phantom = [{ key: 'GET /chats' }, { key: 'GET /search/athletes' }];
    const { newPhantom, resolved } = applyBaseline(phantom, []);
    expect(newPhantom.map((p) => p.key).sort()).toEqual(['GET /chats', 'GET /search/athletes']);
    expect(resolved).toEqual([]);
  });
});

describe('sdkOperations ignores non-call text', () => {
  it('does not extract a TypeScript union type or a comment mentioning url:', () => {
    const files = [
      {
        name: 'types.ts',
        text: [
          "interface Options { method: 'GET' | 'POST'; }",
          "// NOTE: this service used to build the url: manually before httpClient existed.",
          "request({ method: 'GET', url: `/real/path` });",
        ].join('\n'),
      },
    ];
    const keys = sdkOperations(files).map((o) => o.key);
    expect(keys).toEqual(['GET /real/path']);
  });
});
