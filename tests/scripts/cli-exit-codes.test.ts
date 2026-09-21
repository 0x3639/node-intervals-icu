import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Exercises the real coverage.mjs and check-spec-drift.mjs CLIs end-to-end
// against a throwaway mini repo, since both resolve their repo root from
// import.meta.url (parent of the scripts/ directory they run from).

const realScriptsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts');

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface RepoOptions {
  openapi?: string | null; // null = omit the file entirely
  baseline?: object | null;
  serviceFile?: string | null;
  clientFile?: string;
}

function makeRepo({ openapi, baseline, serviceFile, clientFile }: RepoOptions): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'intervals-icu-cli-'));
  tmpDirs.push(dir);

  cpSync(realScriptsDir, path.join(dir, 'scripts'), { recursive: true });

  mkdirSync(path.join(dir, 'spec'), { recursive: true });
  if (openapi !== null && openapi !== undefined) {
    writeFileSync(path.join(dir, 'spec/openapi.json'), openapi);
  }
  if (baseline !== null && baseline !== undefined) {
    writeFileSync(path.join(dir, 'spec/coverage-baseline.json'), JSON.stringify(baseline));
  }

  mkdirSync(path.join(dir, 'src/services'), { recursive: true });
  if (serviceFile !== null) {
    writeFileSync(path.join(dir, 'src/services/x.service.ts'), serviceFile ?? '');
  }
  writeFileSync(path.join(dir, 'src/client.ts'), clientFile ?? 'export const noop = 1;\n');

  return dir;
}

const miniSpec = JSON.stringify({
  openapi: '3.0.1',
  paths: {
    '/api/v1/chats': { get: { tags: ['Chats'], summary: 'List chats' } },
  },
});

const specWithExtraOp = JSON.stringify({
  openapi: '3.0.1',
  paths: {
    '/api/v1/chats': { get: { tags: ['Chats'], summary: 'List chats' } },
    '/api/v1/chats/send-message': { post: { tags: ['Chats'], summary: 'Send a message' } },
  },
});

const matchingServiceFile = `
export class XService {
  constructor(private httpClient) {}
  async listChats() {
    return this.httpClient.request({ method: 'GET', url: \`/chats\` });
  }
}
`;

const emptyServiceFile = `
export class XService {
  constructor(private httpClient) {}
}
`;

function runNode(dir: string, script: string, args: string[] = [], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [path.join(dir, 'scripts', script), ...args], {
    cwd: dir,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

describe('coverage.mjs exit codes', () => {
  it('(i) exits 1 with "not found" in stderr when spec/openapi.json is missing', () => {
    const dir = makeRepo({ openapi: null, baseline: null, serviceFile: matchingServiceFile });

    const result = runNode(dir, 'coverage.mjs');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not found');
  });

  it('(ii) exits 1 with "not valid JSON" in stderr when spec/openapi.json is invalid', () => {
    const dir = makeRepo({ openapi: '{ not json', baseline: null, serviceFile: matchingServiceFile });

    const result = runNode(dir, 'coverage.mjs');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not valid JSON');
  });

  it('(iii) exits 0 for a matching spec/SDK pair with an exact baseline', () => {
    const dir = makeRepo({
      openapi: miniSpec,
      baseline: { phantom: [], covered: ['GET /chats'] },
      serviceFile: matchingServiceFile,
    });

    const result = runNode(dir, 'coverage.mjs');

    expect(result.status).toBe(0);
  });

  it('(iv) exits 1 with "Lost coverage" in stdout when the SDK call is removed', () => {
    const dir = makeRepo({
      openapi: miniSpec,
      baseline: { phantom: [], covered: ['GET /chats'] },
      serviceFile: emptyServiceFile,
    });

    const result = runNode(dir, 'coverage.mjs');

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Lost coverage');
  });
});

describe('check-spec-drift.mjs exit codes', () => {
  it('(v) exits 0 when the vendored spec matches INTERVALS_SPEC_FILE', () => {
    const dir = makeRepo({ openapi: miniSpec, baseline: null, serviceFile: null });
    const liveFile = path.join(dir, 'live-spec.json');
    writeFileSync(liveFile, miniSpec);

    const result = runNode(dir, 'check-spec-drift.mjs', [], { INTERVALS_SPEC_FILE: liveFile });

    expect(result.status).toBe(0);
  });

  it('(vi) exits 2 with "Spec drift detected" in stdout when the file has an extra op', () => {
    const dir = makeRepo({ openapi: miniSpec, baseline: null, serviceFile: null });
    const liveFile = path.join(dir, 'live-spec.json');
    writeFileSync(liveFile, specWithExtraOp);

    const result = runNode(dir, 'check-spec-drift.mjs', [], { INTERVALS_SPEC_FILE: liveFile });

    expect(result.status).toBe(2);
    expect(result.stdout).toContain('Spec drift detected');
  });

  it('(vii) exits 1 with "not found" in stderr when the vendored spec is missing', () => {
    const dir = makeRepo({ openapi: null, baseline: null, serviceFile: null });
    const liveFile = path.join(dir, 'live-spec.json');
    writeFileSync(liveFile, miniSpec);

    const result = runNode(dir, 'check-spec-drift.mjs', [], { INTERVALS_SPEC_FILE: liveFile });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not found');
  });
});
