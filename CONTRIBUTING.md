# Contribute to Towerflow — 90-second team workflow

## Your contribution stays yours

Each feature belongs in a separate GitHub branch and pull request. Do not edit the running Windows host just to demonstrate an idea. The repository's `dev` branch is the integration target; code reaches production only after separate review and deployment.

### Team member: browser-first path

1. Open [Towerflow on github.dev](https://github.dev/Cos229-239/2610_Team02) or [GitHub Codespaces](https://codespaces.new/Cos229-239/2610_Team02) (if you need a build/debug runtime).
2. Create a branch named `contrib/<your-github-username>/<your-feature>` based on `dev`.
3. Make your change in the corresponding part of the repository. Prefer `TowerFlow/` for business UI, `integrations/frontier/` for staged room visuals, `integrations/agents/` for protected agent tools and `integrations/market/` for provider adapters.
4. Commit and open a **pull request into `dev`**, filling in the existing ownership/impact/preview checklist.
5. Attach before/after evidence and run required CI. The reviewer can preview, request changes, or leave your PR unmerged; the review UI has **no delete operation**.

### Host/reviewer: exact source preview (no deploy)

On the Windows `Team2` checkout, run a read-only source review followed by an isolated **static** app preview:

```powershell
& ".\tools\preview-towerflow-contribution.ps1" -PullRequest 8
```

Substitute the real PR number; review the diff first. The helper fetches that PR's head SHA to a **separate detached Git worktree** and starts a localhost preview on port 5188. It never checks out the active room files, merges, deletes another author's branch, or restarts the 4173 collaboration server. Close the terminal to stop the preview.

The preview renders the `TowerFlow` **static product only**. It does not accurately simulate server routes, 3D scenes, membership authorization or external provider connections. For these, review the code and use explicitly isolated integration tests. **Never execute untrusted teammate code directly on the production Windows host**. Use a sandboxed devcontainer or approved Codespace for arbitrary builds and debugging.

### What a good contribution includes

- Clear `author : contribution` description and a link to the PR, with pinned commit.
- Before/after screenshots and test cases for changed app UI; visual references if 3D.
- What feature changed and which existing capabilities were preserved.
- Exact data source, freshness, and external provider entitlement for market or company data.
- Capability/permission and failure tests for new agent tools; no arbitrary command or secret exposure.
- If a character voice, recording, movie clip or branded image is involved, documented license and attribution **before enabling it**.
- An explicit rollback plan.

### Why we don't auto-delete or auto-merge

The application **does not provide buttons to delete code, branches or PRs**. Requesting changes or leaving a PR unmerged preserves its source and record. The contributor controls their own branch subject to GitHub permissions; GitHub repository maintainers/admins still retain actual platform privileges. For stronger enforcement, repository admins should configure protected `dev` branch rules, required CI reviews, code-owner approvals, limited force-push/deletion permissions, and retention/archive controls. None of those policies is automatically created by this document.

### Which interface to use

- In the TowerFlow business dashboard, select **TEAM CONTRIBUTIONS** for linked review cards and safe preview instructions.
- Use GitHub Pull Requests to see the actual author, changes, discussions, checks and merge status. The in-app metadata manifest is a snapshot, not a live database.
- Use the isolated preview for exact *business app* changes. No live room restarts are required.

### Agent-generated code

The human who initiated an AI-generated contribution should submit the PR under their own branch and identity and review all generated changes. The AI itself does not acquire deletion powers. The source author/repository permissions govern actual Git operations; the TowerFlow UI must remain non-destructive.

### Support

Reference the source-backed [Towerflow release contract](TOWERFLOW_PRODUCT_RELEASE.md) and the [agent capability contract](integrations/agents/AGENT_CAPABILITIES.md). Keep all claims about AI, quotes, payment and physical modeling explicit about whether the service actually runs.
