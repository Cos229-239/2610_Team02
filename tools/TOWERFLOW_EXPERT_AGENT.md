# AURA — private Towerflow world expert (Qwen3 / Ollama)

## Current implementation
AURA v1 is a **private local interactive agent** in `tools/towerflow-expert-agent.mjs`. It is **not yet wired to the public Towerflow 3D scene**. This separation is deliberate: the public room includes authenticated multiplayer, code editing and Git tools, so we should not expose an unrestricted AI backend or private memory through Funnel.

- Model: `qwen3:8b` by default via `http://127.0.0.1:11434/api/chat`. Override by environment variable `TOWERFLOW_AI_MODEL`, e.g. `qwen3:4b` on modest machines. Local Ollama must be installed and the model downloaded first.
- Evidence: manually curated, version-controlled `towerflow-knowledge/WORLD.md` and explicitly allowlisted project documents (not arbitrary repository source).
- Retrieval: bounded lexical paragraph ranking (a simple starter RAG). It does **not** use embeddings or a vector database; citations should be audited and confidence must not be overstated.
- Persistent memory: only user-approved facts entered with `/remember ...`, saved to a private per-user `~/.towerflow/assistant/memory.json` file, not Git. Inspect with `/memories` and delete with `/forget ID`.
- Interaction: local terminal CLI, with short in-session history only. Raw conversations are **not persistently logged** by this tool.
- No automatic file edits, Git writes, production deployment, shell execution, GitHub authentication or server control.
- Not always-on: the process responds while running. Service supervision, persisted conversations and browser-room authenticated access are future review-gated phases.

## Setup
1. Install Ollama from the official Ollama website: https://ollama.com/download (official). Keep its local API bound to loopback, not a public network interface.
2. Use `ollama pull qwen3:8b` (model download ≈5.2 GB); for constrained hardware, `ollama pull qwen3:4b` (≈2.5 GB), and set `TOWERFLOW_AI_MODEL=qwen3:4b` in the shell.
3. In the Team 02 repository folder (with this PR's files present), run:
   `node --test tools/towerflow-expert-agent.test.mjs`
   `node tools/towerflow-expert-agent.mjs`
4. Ask about movement, rooms, teammates, GitHub, IDE integration or deployment. Confirm each specific claim against its cited document. Use `/remember` only for non-sensitive, explicitly approved facts.
5. To exit, enter `/exit`.

## Model selection: Qwen3 and Hermes
**Qwen3** is the local language model. **Hermes Agent** is a separate agent runtime/tool layer; its name is not a guarantee of a \"Hermes Qwen3\" fine-tuned model. If you later install Hermes Agent, Ollama documents `ollama launch hermes --model qwen3` as one integration path. Don't give such an external agent unfettered filesystem access to the production host or its `.env`.

## Future architecture: persistent in-world AURA
1. Expose a dedicated `/api/aura/chat` endpoint only after checking server-side OAuth session **and** repository authorization. The browser must never call local Ollama directly or receive model-service API credentials.
2. Put a queue, request quotas, concurrency limits and audit metadata (no secret prompt logs) in a separate Node service. Only the server calls Ollama over loopback.
3. Manage durable shared **world knowledge** separately from user-private memories; version and review world facts, never automatically ingest teammate conversations as authoritative memory.
4. Use an explicit read-only tool registry first: `get_project_map`, `get_verified_feature_status`, `search_reviewed_docs`. For source edits, require draft diff, tests, user approval, separate deploy and rollback.
5. Add quality evaluations, prompt versioning, retrieval precision tests, adversarial-injection tests, and regression benchmarks. Better memory and retrieval do **not** magically improve the base model's weights.
6. Design accessibility: large in-room displays, readable contrast, captioned output, keyboard interaction, non-immersive text alternative, and clear sources.

## Preservation contract
Never replace the existing scene, working Option A controls, live server, Tailscale Funnel, GitHub credentials, or team state as a shortcut to adding AURA. Maintain local snapshots, reviewed code changes, tests, and a manual revert plan.
