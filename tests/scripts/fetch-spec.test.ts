import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSpec } from '../../scripts/fetch-spec.mjs';

const URL = 'https://example.test/docs';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchSpec', () => {
  it('(i) rejects with a message containing the status on a non-ok response', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 503, statusText: 'x' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSpec(URL)).rejects.toThrow(/503/);
  });

  it('(ii) rejects when fetch itself rejects (e.g. AbortError)', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const fetchMock = vi.fn(async () => {
      throw abortError;
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSpec(URL)).rejects.toThrow(/The operation was aborted/);
  });

  it('(iii) rejects when res.json() rejects with a SyntaxError', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSpec(URL)).rejects.toThrow(/Unexpected token/);
  });

  it('(iv) rejects with "Unexpected spec shape" when the body is not an OpenAPI document', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ paths: [] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSpec(URL)).rejects.toThrow(/Unexpected spec shape/);
  });

  it('(v) resolves to the parsed spec on a well-shaped response', async () => {
    const spec = { openapi: '3.0.1', paths: {} };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => spec,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSpec(URL)).resolves.toEqual(spec);
  });
});
