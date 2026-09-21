import { describe, it, expect } from 'vitest';
import {
  stripComments,
  normalizeSdkPath,
  specOperations,
  sdkOperations,
  specPathRegex,
  matchOperations,
  applyBaseline,
  applyAllowlist,
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

describe('stripComments', () => {
  it('(a) leaves `//` inside a string alone', () => {
    const out = stripComments("const s = 'http://example.com';");
    expect(out).toContain("'http://example.com'");
  });

  it('(b) removes a /* */ block, including one that contains a call shape', () => {
    const out = stripComments(
      "foo();\n/* this.httpClient.request({ method: 'GET', url: `/fake` }); */\nbar();",
    );
    expect(out).not.toContain('httpClient');
    expect(out).toContain('foo();');
    expect(out).toContain('bar();');
  });

  it('(c) removes a // comment trailing real code', () => {
    const out = stripComments("foo(); // trailing comment\nbar();");
    expect(out).not.toContain('trailing comment');
    expect(out).toContain('foo();');
    expect(out).toContain('bar();');
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
    const { ops, unparsed } = sdkOperations(files);
    expect(unparsed).toEqual([]);
    const keys = ops.map((o) => o.key).sort();
    expect(keys).toEqual([
      'GET /athlete/{x}/download-fit-files',
      'GET /athlete/{x}/wellness',
      'GET /pace_distances',
      'POST /athlete/{x}/folders/{x}/import-workout',
      'POST /download-workout{x}',
    ]);
  });

  it('records the source file', () => {
    const { ops } = sdkOperations(files);
    const op = ops.find((o) => o.key === 'GET /pace_distances');
    expect(op?.source).toBe('client.ts');
  });
});

describe('specPathRegex', () => {
  it('treats an unclosed brace as a literal instead of looping forever', () => {
    const re = specPathRegex('/athlete/{id/events');
    expect(re.test('/athlete/{id/events')).toBe(true);
    expect(re.test('/athlete/{x}/events')).toBe(false);
  });

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

  it('(Codex round-4 item 2) a whole-segment {param} only matches the normalized {x} placeholder, not a hard-coded value', () => {
    const re = specPathRegex('/athlete/{id}/events');
    expect(re.test('/athlete/{x}/events')).toBe(true);
    expect(re.test('/athlete/not-an-id/events')).toBe(false);
  });
});

describe('matchOperations', () => {
  it('reports matched, phantom and missing', () => {
    const spec = specOperations(miniSpec);
    const { ops: sdk } = sdkOperations([
      { name: 'a.ts', text: "this.httpClient.request({ method: 'GET', url: `/athlete/${id}/wellness` })" },
      { name: 'b.ts', text: 'this.httpClient.download(`/athlete/${id}/download-fit-files`)' },
      { name: 'c.ts', text: "this.httpClient.request({ method: 'GET', url: `/chats` })" },
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
    const { ops: sdk } = sdkOperations([
      {
        name: 'events.service.ts',
        text: "this.httpClient.request({ method: 'PUT', url: `/athlete/${id}/events/bulk-delete` })",
      },
    ]);
    const result = matchOperations(specOps, sdk);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].spec.key).toBe('PUT /athlete/{id}/events/bulk-delete');
    expect(result.phantom).toEqual([]);
    expect(result.missing.map((m) => m.key)).toEqual(['PUT /athlete/{id}/events/{eventId}']);
  });

  it('(Codex round-4 item 2) a hard-coded value in place of a whole-segment param does not satisfy the spec param: the SDK call is phantom and the spec op is missing', () => {
    const spec = {
      paths: { '/api/v1/athlete/{id}/events': { get: { tags: ['Events'], summary: 'List events' } } },
    };
    const specOps = specOperations(spec);
    const { ops: sdk } = sdkOperations([
      { name: 'events.service.ts', text: "this.httpClient.request({ method: 'GET', url: '/athlete/not-an-id/events' })" },
    ]);
    const result = matchOperations(specOps, sdk);
    expect(result.matched).toEqual([]);
    expect(result.phantom.map((p) => p.key)).toEqual(['GET /athlete/not-an-id/events']);
    expect(result.missing.map((m) => m.key)).toEqual(['GET /athlete/{id}/events']);
  });
});

describe('applyBaseline', () => {
  it('splits phantom ops into new (regressions) and resolvedPhantom (stale baseline entries)', () => {
    const phantom = [{ key: 'GET /chats', source: 'chat.service.ts' }, { key: 'GET /search/athletes', source: 'search.service.ts' }];
    const baseline = { phantom: ['GET /chats', 'DELETE /athlete/{id}/wellness/{date}'], covered: [] };
    const { newPhantom, resolvedPhantom } = applyBaseline({ phantom, coveredKeys: [] }, baseline);
    expect(newPhantom.map((p) => p.key)).toEqual(['GET /search/athletes']);
    expect(resolvedPhantom).toEqual(['DELETE /athlete/{id}/wellness/{date}']);
  });

  it('treats every phantom op as new when the baseline is empty', () => {
    const phantom = [{ key: 'GET /chats' }, { key: 'GET /search/athletes' }];
    const { newPhantom, resolvedPhantom } = applyBaseline({ phantom, coveredKeys: [] }, { phantom: [], covered: [] });
    expect(newPhantom.map((p) => p.key).sort()).toEqual(['GET /chats', 'GET /search/athletes']);
    expect(resolvedPhantom).toEqual([]);
  });

  it('(a) reports lostCoverage when a baseline-covered key is no longer covered', () => {
    const baseline = { phantom: [], covered: ['GET /a', 'GET /b'] };
    const { lostCoverage } = applyBaseline({ phantom: [], coveredKeys: ['GET /a'] }, baseline);
    expect(lostCoverage).toEqual(['GET /b']);
  });

  it('(b) reports newlyCovered when the current covered set has keys the baseline does not', () => {
    const baseline = { phantom: [], covered: ['GET /a', 'GET /b'] };
    const { newlyCovered } = applyBaseline({ phantom: [], coveredKeys: ['GET /a', 'GET /b', 'GET /c'] }, baseline);
    expect(newlyCovered).toEqual(['GET /c']);
  });

  it('(c) treats a missing `covered` key in an old baseline as empty and reports every current key as newlyCovered', () => {
    const baseline = { phantom: [] };
    const { lostCoverage, newlyCovered } = applyBaseline({ phantom: [], coveredKeys: ['GET /a'] }, baseline);
    expect(lostCoverage).toEqual([]);
    expect(newlyCovered).toEqual(['GET /a']);
  });

  it('removing a matched SDK op from a mini fixture shows lostCoverage is non-empty', () => {
    const twoOpSpec = {
      paths: {
        '/api/v1/foo': { get: { tags: [], summary: '' } },
        '/api/v1/bar': { get: { tags: [], summary: '' } },
      },
    };
    const spec = specOperations(twoOpSpec);
    const { ops: sdkWithBoth } = sdkOperations([
      { name: 'a.ts', text: "this.httpClient.request({ method: 'GET', url: `/foo` })" },
      { name: 'b.ts', text: "this.httpClient.request({ method: 'GET', url: `/bar` })" },
    ]);
    const before = matchOperations(spec, sdkWithBoth);
    const baselineCovered = [...new Set(before.matched.map((m) => m.spec.key))].sort();

    // Now remove the /bar call from the SDK (simulating a regression).
    const { ops: sdkAfter } = sdkOperations([{ name: 'a.ts', text: "this.httpClient.request({ method: 'GET', url: `/foo` })" }]);
    const after = matchOperations(spec, sdkAfter);
    const currentCovered = [...new Set(after.matched.map((m) => m.spec.key))];

    const { lostCoverage } = applyBaseline(
      { phantom: after.phantom, coveredKeys: currentCovered },
      { phantom: [], covered: baselineCovered },
    );
    expect(lostCoverage).toEqual(['GET /bar']);
  });
});

describe('sdkOperations ignores non-call text', () => {
  it('does not extract a TypeScript union type or a comment mentioning url:, but does extract the real call', () => {
    const files = [
      {
        name: 'types.ts',
        text: [
          "interface Options { method: 'GET' | 'POST'; }",
          "// NOTE: this service used to build the url: manually before httpClient existed.",
          "this.httpClient.request({ method: 'GET', url: `/real/path` });",
        ].join('\n'),
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['GET /real/path']);
    expect(unparsed).toEqual([]);
  });
});

describe('sdkOperations anchored parser (Codex round-3 item 2)', () => {
  it('(a) an exact call shape inside a /* */ comment, and one inside a // comment, are both ignored', () => {
    const files = [
      {
        name: 'a.ts',
        text: [
          "/* this.httpClient.request({ method: 'GET', url: `/fake-block` }); */",
          "// this.httpClient.request({ method: 'GET', url: `/fake-line` });",
          "this.httpClient.request({ method: 'GET', url: `/real` });",
        ].join('\n'),
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['GET /real']);
    expect(unparsed).toEqual([]);
  });

  it('(b) a double-quoted method is recognized', () => {
    const files = [{ name: 'a.ts', text: 'this.httpClient.request({ method: "GET", url: `/x` });' }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['GET /x']);
    expect(unparsed).toEqual([]);
  });

  it('(c) url: before method: is recognized (order-independent)', () => {
    const files = [{ name: 'a.ts', text: "this.httpClient.request({ url: `/x`, method: 'GET' });" }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['GET /x']);
    expect(unparsed).toEqual([]);
  });

  it('(d) an intervening property between method and url is recognized', () => {
    const files = [{ name: 'a.ts', text: "this.httpClient.request({ method: 'PUT', data, url: `/x` });" }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['PUT /x']);
    expect(unparsed).toEqual([]);
  });

  it('(e) a multi-line call with a type argument is recognized', () => {
    const files = [
      {
        name: 'a.ts',
        text: "this.httpClient.request<Foo>({\n  method: 'GET',\n  url: `/x/${id}`\n});",
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['GET /x/{x}']);
    expect(unparsed).toEqual([]);
  });

  it('(f) a shorthand `url` property (no url: literal) is reported as unparsed, not as an op', () => {
    const files = [{ name: 'a.ts', text: "this.httpClient.request({ method: 'GET', url });" }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toEqual([]);
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0]).toMatchObject({ source: 'a.ts', kind: 'request' });
    expect(unparsed[0].snippet).toContain('httpClient.request');
  });

  it("(g) Codex's exact reproduction: one recognized call plus one unrecognized call in the same file -> ops has 1, unparsed has 1", () => {
    const files = [
      {
        name: 'a.ts',
        text: [
          "this.httpClient.request({ method: 'GET', url: `/real` });",
          'this.httpClient.request({ method: someVar, url: buildUrl() });',
        ].join('\n'),
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toHaveLength(1);
    expect(ops[0].key).toBe('GET /real');
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].kind).toBe('request');
  });

  it('(h) download(templateUrl, { method: "POST", data }) extracts a POST op', () => {
    const files = [
      { name: 'a.ts', text: "this.httpClient.download(`/download-workout${format}`, { method: 'POST', data });" },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['POST /download-workout{x}']);
    expect(unparsed).toEqual([]);
  });

  it('a download() with no method key at all defaults to GET', () => {
    const files = [{ name: 'a.ts', text: 'this.httpClient.download(`/x${id}`, { id: workoutId });' }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['GET /x{x}']);
    expect(unparsed).toEqual([]);
  });

  it('an upload() is always POST and its url is extracted across a multi-line object', () => {
    const files = [
      {
        name: 'a.ts',
        text: "this.httpClient.upload<UploadResponse>({\n  url: `/athlete/${id}/activities`,\n  file,\n  fileName,\n  params,\n});",
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['POST /athlete/{x}/activities']);
    expect(unparsed).toEqual([]);
  });

  it('an upload() with an explicit top-level method: "PUT" is recorded as PUT, not POST', () => {
    const files = [
      {
        name: 'a.ts',
        text: "this.httpClient.upload<X>({ url: `/activity/${id}/streams.csv`, file, fileName, method: 'PUT' });",
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['PUT /activity/{x}/streams.csv']);
    expect(unparsed).toEqual([]);
  });

  it('an upload() without a method: property defaults to POST', () => {
    const files = [
      { name: 'a.ts', text: 'this.httpClient.upload<X>({ url: `/activity/${id}/streams.csv`, file, fileName });' },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['POST /activity/{x}/streams.csv']);
    expect(unparsed).toEqual([]);
  });

  it('an upload() with a nested `method` inside another property does not count; the call defaults to POST', () => {
    const files = [
      {
        name: 'a.ts',
        text: "this.httpClient.upload<X>({ url: `/activity/${id}/streams.csv`, file, fileName, params: { method: 'PUT' } });",
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['POST /activity/{x}/streams.csv']);
    expect(unparsed).toEqual([]);
  });

  it('a download() whose url cannot be extracted (a bare identifier, not a literal) is unparsed', () => {
    const files = [{ name: 'a.ts', text: 'this.httpClient.download(someUrlVariable, { method: "GET" });' }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toEqual([]);
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].kind).toBe('download');
  });

  it('an upload() whose url cannot be extracted is unparsed', () => {
    const files = [{ name: 'a.ts', text: 'this.httpClient.upload({ url: buildUrl(), file, fileName });' }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toEqual([]);
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].kind).toBe('upload');
  });
});

describe('sdkOperations executable-calls-only, top-level-properties-only (Codex round-4 item 1)', () => {
  const CALL = "this.httpClient.request({ method: 'GET', url: '/fake' })";

  it('(a) the exact call text inside a single-quoted string is not a call', () => {
    const files = [{ name: 'a.ts', text: `const s = '${CALL.replace(/'/g, "\\'")}';` }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toEqual([]);
    expect(unparsed).toEqual([]);
  });

  it('(a) the exact call text inside a double-quoted string is not a call', () => {
    const files = [{ name: 'a.ts', text: `const s = "${CALL}";` }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toEqual([]);
    expect(unparsed).toEqual([]);
  });

  it('(a) the exact call text inside a template-literal string is not a call', () => {
    const files = [{ name: 'a.ts', text: `const s = \`${CALL}\`;` }];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toEqual([]);
    expect(unparsed).toEqual([]);
  });

  it('(b) a top-level shorthand `url` with a nested literal `url` is unparsed, not the nested value', () => {
    const files = [
      {
        name: 'a.ts',
        text: 'this.httpClient.request({ method: "GET", url, params: { url: "/nested" } });',
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toEqual([]);
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].kind).toBe('request');
  });

  it('(c) a top-level shorthand `method` with a nested literal `method` is unparsed', () => {
    const files = [
      {
        name: 'a.ts',
        text: "this.httpClient.request({ method, url: '/x', headers: { method: 'POST' } });",
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops).toEqual([]);
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].kind).toBe('request');
  });

  it('(d) a nested `url` inside `params` is ignored; the top-level template url wins', () => {
    const files = [
      {
        name: 'a.ts',
        text: "this.httpClient.request({ method: 'GET', url: `/x/${id}`, params: { url: '/nested' } });",
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['GET /x/{x}']);
    expect(unparsed).toEqual([]);
  });

  it('(e) a real multi-line request with an intervening nested `data: { method: "zzz" }` still parses the top-level method/url', () => {
    const files = [
      {
        name: 'a.ts',
        text: [
          'this.httpClient.request({',
          "  method: 'PUT',",
          "  data: { method: 'zzz' },",
          '  url: `/x`,',
          '});',
        ].join('\n'),
      },
    ];
    const { ops, unparsed } = sdkOperations(files);
    expect(ops.map((o) => o.key)).toEqual(['PUT /x']);
    expect(unparsed).toEqual([]);
  });
});

describe('applyAllowlist', () => {
  it('removes allowed phantom ops and reports unused allowlist entries', () => {
    const phantom = [{ key: 'POST /shared-event' }, { key: 'GET /chats' }] as any;
    const r = applyAllowlist(phantom, ['POST /shared-event', 'DELETE /nope']);
    expect(r.phantom.map((p: any) => p.key)).toEqual(['GET /chats']);
    expect(r.allowed.map((p: any) => p.key)).toEqual(['POST /shared-event']);
    expect(r.unused).toEqual(['DELETE /nope']);
  });
});
