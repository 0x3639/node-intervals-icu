import { describe, it, expect, vi } from 'vitest';
import { upsertDriftIssue } from '../../scripts/lib/drift-issue.mjs';

const owner = 'acme';
const repo = 'node-intervals-icu';
const label = 'spec-drift';
const title = 'Intervals.icu API spec drift detected (2026-09-20)';
const body = '## Spec drift detected\n';

function mockGithub(overrides = {}) {
  return {
    rest: {
      issues: {
        getLabel: vi.fn().mockResolvedValue({}),
        createLabel: vi.fn().mockResolvedValue({}),
        listForRepo: vi.fn().mockResolvedValue({ data: [] }),
        createComment: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({ data: { number: 1 } }),
        ...overrides,
      },
    },
  };
}

describe('upsertDriftIssue', () => {
  it('(a) creates the label and the issue when the label is missing and no issue is open', async () => {
    const github = mockGithub({
      getLabel: vi.fn().mockRejectedValue({ status: 404 }),
      listForRepo: vi.fn().mockResolvedValue({ data: [] }),
      create: vi.fn().mockResolvedValue({ data: { number: 42 } }),
    });

    const result = await upsertDriftIssue({ github, owner, repo, label, title, body });

    expect(github.rest.issues.createLabel).toHaveBeenCalledWith(
      expect.objectContaining({ owner, repo, name: label }),
    );
    expect(github.rest.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner, repo, title, body, labels: [label] }),
    );
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
    expect(result).toEqual({ action: 'created', number: 42 });
  });

  it('(b) reuses the open issue and does not create the label when it already exists', async () => {
    const github = mockGithub({
      getLabel: vi.fn().mockResolvedValue({}),
      listForRepo: vi.fn().mockResolvedValue({ data: [{ number: 7 }] }),
    });

    const result = await upsertDriftIssue({ github, owner, repo, label, title, body });

    expect(github.rest.issues.createLabel).not.toHaveBeenCalled();
    expect(github.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ owner, repo, issue_number: 7, body }),
    );
    expect(github.rest.issues.create).not.toHaveBeenCalled();
    expect(result).toEqual({ action: 'commented', number: 7 });
  });

  it('(c) propagates an unexpected error from getLabel', async () => {
    const github = mockGithub({
      getLabel: vi.fn().mockRejectedValue({ status: 500, message: 'boom' }),
    });

    await expect(upsertDriftIssue({ github, owner, repo, label, title, body })).rejects.toMatchObject({
      status: 500,
    });
    expect(github.rest.issues.createLabel).not.toHaveBeenCalled();
  });
});
