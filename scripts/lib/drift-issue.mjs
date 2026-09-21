// Pure(ish) drift-issue upsert logic shared by .github/workflows/spec-drift.yml
// and its tests. All I/O is the injected `github` (an octokit-shaped client,
// as provided by actions/github-script).

/**
 * Ensure `label` exists, then comment on the first open issue with that
 * label, or create a new one. Returns `{ action: 'commented' | 'created', number }`.
 */
export async function upsertDriftIssue({ github, owner, repo, label, title, body }) {
  try {
    await github.rest.issues.getLabel({ owner, repo, name: label });
  } catch (err) {
    if (err?.status !== 404) throw err;
    await github.rest.issues.createLabel({
      owner,
      repo,
      name: label,
      color: 'd73a4a',
      description: 'Live Intervals.icu OpenAPI spec differs from spec/openapi.json',
    });
  }

  const { data: open } = await github.rest.issues.listForRepo({ owner, repo, state: 'open', labels: label });
  if (open.length) {
    await github.rest.issues.createComment({ owner, repo, issue_number: open[0].number, body });
    return { action: 'commented', number: open[0].number };
  }

  const { data: created } = await github.rest.issues.create({ owner, repo, title, body, labels: [label] });
  return { action: 'created', number: created.number };
}
