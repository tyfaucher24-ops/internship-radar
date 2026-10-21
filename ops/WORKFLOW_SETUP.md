# Turn on the 2-hour auto-sync (one-time, ~3 minutes)

The sync workflow is ready in `ops/workflows/sync.yml`, but GitHub only runs workflows from `.github/workflows/`, and the token used so far cannot write there (missing `workflow` scope). Pick ONE option.

## Option A — GitHub website (no terminal)
1. Open https://github.com/tyfaucher24-ops/internship-radar
2. Click **Add file → Create new file**.
3. Name it exactly: `.github/workflows/sync.yml`
4. Paste the full contents of `ops/workflows/sync.yml` (open it on GitHub, click **Raw**, copy all).
5. Click **Commit changes** (commit to `main`).
6. Go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**, Save.
7. Go to **Actions → Sync listings → Run workflow** once to test. After that it runs every 2 hours on its own.

## Option B — terminal
1. `gh auth refresh -h github.com -s workflow` (approve in the browser).
2. Note `.github/` is in `.gitignore`: remove that line, then `mkdir -p .github/workflows && cp ops/workflows/sync.yml .github/workflows/sync.yml`
3. `git add .gitignore .github/workflows/sync.yml && git commit -m "Enable 2h sync" && git push`
4. Do step 6–7 from Option A.

If a run fails, the workflow opens (or comments on) an issue labeled `sync-failure`.
