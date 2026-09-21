import { describe, it, expect } from 'vitest';
import { stableStringify, diffSpecs, formatDriftReport } from '../../scripts/lib/spec-drift.mjs';

function baseSpec() {
  return {
    paths: {
      '/api/v1/athlete/{id}/wellness{ext}': {
        get: {
          tags: ['Wellness'],
          summary: 'List wellness',
          parameters: [
            { name: 'oldest', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'newest', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Wellness' } } } },
          },
        },
      },
      '/api/v1/athlete/{id}/chats': {
        get: { tags: ['Chats'], summary: 'List chats', responses: { '200': { description: 'OK' } } },
      },
    },
    components: {
      schemas: {
        Wellness: { type: 'object', properties: { id: { type: 'string' }, weight: { type: 'number' } } },
        Chat: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
  };
}

// Deep clone helper (structuredClone may not be available depending on Node version in CI, but Node >=18 has it).
function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

describe('stableStringify', () => {
  it('sorts object keys but keeps array order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
    expect(stableStringify({ z: [{ b: 1, a: 2 }], a: 1 })).toBe('{"a":1,"z":[{"a":2,"b":1}]}');
  });
});

describe('diffSpecs', () => {
  it('(a) identical specs are not drifted', () => {
    const spec = baseSpec();
    const diff = diffSpecs(spec, clone(spec));
    expect(diff.drifted).toBe(false);
    expect(diff.addedOps).toEqual([]);
    expect(diff.removedOps).toEqual([]);
    expect(diff.changedOps).toEqual([]);
    expect(diff.addedSchemas).toEqual([]);
    expect(diff.removedSchemas).toEqual([]);
    expect(diff.changedSchemas).toEqual([]);
  });

  it('(b) same spec with object keys reordered (nested two levels, including inside a parameter object) is not drifted', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    // Reorder top-level keys of the operation object.
    const op = live.paths['/api/v1/athlete/{id}/wellness{ext}'].get;
    const reordered = { responses: op.responses, summary: op.summary, parameters: op.parameters, tags: op.tags };
    live.paths['/api/v1/athlete/{id}/wellness{ext}'].get = reordered;
    // Reorder keys inside a parameter object (nested two levels deep).
    reordered.parameters[0] = { schema: reordered.parameters[0].schema, required: reordered.parameters[0].required, in: reordered.parameters[0].in, name: reordered.parameters[0].name };
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(false);
    expect(diff.changedOps).toEqual([]);
  });

  it('(c) a changed parameter (required: false -> true) marks the op changed and drifted', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.paths['/api/v1/athlete/{id}/wellness{ext}'].get.parameters[0].required = true;
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(true);
    expect(diff.changedOps).toEqual(['GET /athlete/{id}/wellness{ext}']);
  });

  it('(d) a changed responses[200] schema ref marks the op changed', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.paths['/api/v1/athlete/{id}/wellness{ext}'].get.responses['200'].content['application/json'].schema.$ref =
      '#/components/schemas/Chat';
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(true);
    expect(diff.changedOps).toEqual(['GET /athlete/{id}/wellness{ext}']);
  });

  it('(e) an added path is reported in addedOps', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.paths['/api/v1/athlete/{id}/routes'] = { get: { tags: ['Routes'], summary: 'List routes', responses: {} } };
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(true);
    expect(diff.addedOps).toEqual(['GET /athlete/{id}/routes']);
  });

  it('(f) a removed schema is reported in removedSchemas', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    delete live.components.schemas.Chat;
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(true);
    expect(diff.removedSchemas).toEqual(['Chat']);
  });
});

describe('formatDriftReport', () => {
  it('reports no drift when nothing changed', () => {
    const diff = diffSpecs(baseSpec(), clone(baseSpec()));
    const report = formatDriftReport(diff);
    expect(report).toContain('Live spec matches');
  });

  it('includes an Operations changed section when an op changed', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.paths['/api/v1/athlete/{id}/wellness{ext}'].get.parameters[0].required = true;
    const diff = diffSpecs(vendored, live);
    const report = formatDriftReport(diff);
    expect(report).toContain('Operations changed');
    expect(report).toContain('GET /athlete/{id}/wellness{ext}');
  });
});
