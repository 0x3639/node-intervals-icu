import { describe, it, expect } from 'vitest';
import { stableStringify, diffSpecs, formatDriftReport } from '../../scripts/lib/spec-drift.mjs';

function baseSpec() {
  return {
    openapi: '3.0.1',
    info: { title: 'Intervals.icu', version: '1.0' },
    servers: [{ url: 'https://intervals.icu/api/v1' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/api/v1/athlete/{id}/wellness{ext}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
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
      securitySchemes: {
        ApiKeyAuth: { type: 'http', scheme: 'basic', description: 'API key as the basic auth username' },
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

  it('(g) a path-level parameters change on an existing path is reported in changedPathItems, drifted, otherChanges false', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.paths['/api/v1/athlete/{id}/wellness{ext}'].parameters[0].required = false;
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(true);
    expect(diff.changedPathItems).toEqual(['/athlete/{id}/wellness{ext}']);
    expect(diff.otherChanges).toBe(false);
  });

  it('(h) a components.securitySchemes change is reported in changedComponents, otherChanges false', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.components.securitySchemes.ApiKeyAuth.scheme = 'bearer';
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(true);
    expect(diff.changedComponents).toEqual(['securitySchemes']);
    expect(diff.otherChanges).toBe(false);
  });

  it('(i) a root security change is reported in changedTopLevel, otherChanges false', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.security = [{ OAuth2: [] }];
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(true);
    expect(diff.changedTopLevel).toEqual(['security']);
    expect(diff.otherChanges).toBe(false);
  });

  it('(j) a servers[0].url change is reported in changedTopLevel, otherChanges false', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.servers[0].url = 'https://staging.intervals.icu/api/v1';
    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(true);
    expect(diff.changedTopLevel).toEqual(['servers']);
    expect(diff.otherChanges).toBe(false);
  });

  it("(l) Codex's exact case: an existing op changed AND a new verb-less path added -> changedOps has the op, addedPaths has the new path, drifted, otherChanges false", () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    // An existing op changes...
    live.paths['/api/v1/athlete/{id}/wellness{ext}'].get.parameters[0].required = true;
    // ...and a brand-new path is added whose item has only `parameters`, no verbs.
    live.paths['/api/v1/athlete/{id}/gear'] = {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    };
    const diff = diffSpecs(vendored, live);
    expect(diff.changedOps).toEqual(['GET /athlete/{id}/wellness{ext}']);
    expect(diff.addedPaths).toEqual(['/athlete/{id}/gear']);
    expect(diff.drifted).toBe(true);
    expect(diff.otherChanges).toBe(false);
  });

  it('(m) removal of a verb-less path is reported in removedPaths', () => {
    const vendored = baseSpec();
    vendored.paths['/api/v1/athlete/{id}/gear'] = {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    };
    const live = clone(baseSpec());
    const diff = diffSpecs(vendored, live);
    expect(diff.removedPaths).toEqual(['/athlete/{id}/gear']);
    expect(diff.drifted).toBe(true);
    expect(diff.otherChanges).toBe(false);
  });

  it('(n) a top-level key added (e.g. externalDocs) is reported in changedTopLevel', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.externalDocs = { url: 'https://intervals.icu/api-docs.html' };
    const diff = diffSpecs(vendored, live);
    expect(diff.changedTopLevel).toEqual(['externalDocs']);
    expect(diff.drifted).toBe(true);
    expect(diff.otherChanges).toBe(false);
  });

  it('(o) a components subkey added (e.g. components.parameters) is reported in changedComponents', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.components.parameters = { PageParam: { name: 'page', in: 'query', schema: { type: 'integer' } } };
    const diff = diffSpecs(vendored, live);
    expect(diff.changedComponents).toEqual(['parameters']);
    expect(diff.drifted).toBe(true);
    expect(diff.otherChanges).toBe(false);
  });

  it('(k) key reorder at every level, including inside securitySchemes, is not drifted', () => {
    const vendored = baseSpec();
    const live = clone(vendored);

    // Reorder top-level keys.
    const reorderedTop = {
      components: live.components,
      paths: live.paths,
      security: live.security,
      servers: live.servers,
      info: live.info,
      openapi: live.openapi,
    };
    Object.keys(live).forEach((k) => delete live[k]);
    Object.assign(live, reorderedTop);

    // Reorder keys inside a path item.
    const pathItem = live.paths['/api/v1/athlete/{id}/wellness{ext}'];
    const reorderedPathItem = { get: pathItem.get, parameters: pathItem.parameters };
    live.paths['/api/v1/athlete/{id}/wellness{ext}'] = reorderedPathItem;

    // Reorder keys inside components and inside securitySchemes.
    const scheme = live.components.securitySchemes.ApiKeyAuth;
    live.components.securitySchemes.ApiKeyAuth = {
      description: scheme.description,
      scheme: scheme.scheme,
      type: scheme.type,
    };
    live.components = { securitySchemes: live.components.securitySchemes, schemas: live.components.schemas };

    const diff = diffSpecs(vendored, live);
    expect(diff.drifted).toBe(false);
    expect(diff.changedPathItems).toEqual([]);
    expect(diff.changedComponents).toEqual([]);
    expect(diff.changedTopLevel).toEqual([]);
    expect(diff.otherChanges).toBe(false);
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

  it('includes a Path items changed section when a path-level field changed', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.paths['/api/v1/athlete/{id}/wellness{ext}'].parameters[0].required = false;
    const diff = diffSpecs(vendored, live);
    const report = formatDriftReport(diff);
    expect(report).toContain('Path items changed');
    expect(report).toContain('/athlete/{id}/wellness{ext}');
  });

  it('includes a Components changed section when a non-schema component changed', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.components.securitySchemes.ApiKeyAuth.scheme = 'bearer';
    const diff = diffSpecs(vendored, live);
    const report = formatDriftReport(diff);
    expect(report).toContain('Components changed');
    expect(report).toContain('securitySchemes');
  });

  it('includes a Top-level changed section when servers changed', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.servers[0].url = 'https://staging.intervals.icu/api/v1';
    const diff = diffSpecs(vendored, live);
    const report = formatDriftReport(diff);
    expect(report).toContain('Top-level changed');
    expect(report).toContain('servers');
  });

  it('includes a Paths added section when a verb-less path is added', () => {
    const vendored = baseSpec();
    const live = clone(vendored);
    live.paths['/api/v1/athlete/{id}/gear'] = {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    };
    const diff = diffSpecs(vendored, live);
    const report = formatDriftReport(diff);
    expect(report).toContain('Paths added');
    expect(report).toContain('/athlete/{id}/gear');
  });

  it('includes a Paths removed section when a verb-less path is removed', () => {
    const vendored = baseSpec();
    vendored.paths['/api/v1/athlete/{id}/gear'] = {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    };
    const live = clone(baseSpec());
    const diff = diffSpecs(vendored, live);
    const report = formatDriftReport(diff);
    expect(report).toContain('Paths removed');
    expect(report).toContain('/athlete/{id}/gear');
  });

  it('includes an Unclassified change note when otherChanges is true', () => {
    const diff = {
      addedOps: [],
      removedOps: [],
      changedOps: [],
      addedSchemas: [],
      removedSchemas: [],
      changedSchemas: [],
      changedPathItems: [],
      changedComponents: [],
      changedTopLevel: [],
      addedPaths: [],
      removedPaths: [],
      drifted: true,
      otherChanges: true,
    };
    const report = formatDriftReport(diff);
    expect(report).toContain('Unclassified change');
  });
});
