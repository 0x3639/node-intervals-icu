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
    try {
      await github.rest.issues.createLabel({
        owner,
        repo,
        name: label,
        color: 'd73a4a',
        description: 'Live Intervals.icu OpenAPI spec differs from spec/openapi.json',
      });
    } catch (createErr) {
      // 422: the label already exists (a concurrent run created it between our
      // getLabel and createLabel calls). Swallow it; the label is there either way.
      if (createErr?.status !== 422) throw createErr;
    }
  }

  // listForRepo is paginated (100 items per page) and also returns pull requests
  // (they carry a `pull_request` property); page through all of it and skip them.
  const openAndPRs = [];
  for (let page = 1; ; page++) {
    const { data } = await github.rest.issues.listForRepo({ owner, repo, state: 'open', labels: label, per_page: 100, page });
    openAndPRs.push(...data);
    if (data.length < 100) break;
  }
  const open = openAndPRs.filter((item) => !item.pull_request);
  if (open.length) {
    await github.rest.issues.createComment({ owner, repo, issue_number: open[0].number, body });
    return { action: 'commented', number: open[0].number };
  }

  const { data: created } = await github.rest.issues.create({ owner, repo, title, body, labels: [label] });
  return { action: 'created', number: created.number };
}
