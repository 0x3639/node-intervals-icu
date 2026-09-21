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

  it('(d) swallows a 422 from createLabel (a concurrent run already created it)', async () => {
    const github = mockGithub({
      getLabel: vi.fn().mockRejectedValue({ status: 404 }),
      createLabel: vi.fn().mockRejectedValue({ status: 422, message: 'already_exists' }),
      listForRepo: vi.fn().mockResolvedValue({ data: [] }),
      create: vi.fn().mockResolvedValue({ data: { number: 9 } }),
    });

    const result = await upsertDriftIssue({ github, owner, repo, label, title, body });

    expect(github.rest.issues.createLabel).toHaveBeenCalled();
    expect(result).toEqual({ action: 'created', number: 9 });
  });

  it('(e) propagates a non-422 error from createLabel', async () => {
    const github = mockGithub({
      getLabel: vi.fn().mockRejectedValue({ status: 404 }),
      createLabel: vi.fn().mockRejectedValue({ status: 500, message: 'boom' }),
    });

    await expect(upsertDriftIssue({ github, owner, repo, label, title, body })).rejects.toMatchObject({
      status: 500,
    });
  });

  it('(f) ignores pull requests when reusing an open issue', async () => {
    const github = mockGithub({
      getLabel: vi.fn().mockResolvedValue({}),
      listForRepo: vi.fn().mockResolvedValue({
        data: [
          { number: 5, pull_request: {} },
          { number: 7 },
        ],
      }),
    });

    const result = await upsertDriftIssue({ github, owner, repo, label, title, body });

    expect(github.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ owner, repo, issue_number: 7, body }),
    );
    expect(result).toEqual({ action: 'commented', number: 7 });
  });

  it('(h) paginates the open-issue lookup: a first page full of PRs, second page has the issue -> commented on it', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ number: i + 1, pull_request: {} }));
    const page2 = [{ number: 200 }];
    const listForRepo = vi.fn(async ({ page }) => ({ data: page === 1 ? page1 : page === 2 ? page2 : [] }));
    const github = mockGithub({
      getLabel: vi.fn().mockResolvedValue({}),
      listForRepo,
    });

    const result = await upsertDriftIssue({ github, owner, repo, label, title, body });

    expect(listForRepo).toHaveBeenCalledTimes(2);
    expect(listForRepo).toHaveBeenNthCalledWith(1, expect.objectContaining({ owner, repo, per_page: 100, page: 1 }));
    expect(listForRepo).toHaveBeenNthCalledWith(2, expect.objectContaining({ owner, repo, per_page: 100, page: 2 }));
    expect(github.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ owner, repo, issue_number: 200, body }),
    );
    expect(result).toEqual({ action: 'commented', number: 200 });
  });

  it('(g) creates a new issue when every open, labeled item is a pull request', async () => {
    const github = mockGithub({
      getLabel: vi.fn().mockResolvedValue({}),
      listForRepo: vi.fn().mockResolvedValue({ data: [{ number: 5, pull_request: {} }] }),
      create: vi.fn().mockResolvedValue({ data: { number: 11 } }),
    });

    const result = await upsertDriftIssue({ github, owner, repo, label, title, body });

    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
    expect(github.rest.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner, repo, title, body, labels: [label] }),
    );
    expect(result).toEqual({ action: 'created', number: 11 });
  });
});
