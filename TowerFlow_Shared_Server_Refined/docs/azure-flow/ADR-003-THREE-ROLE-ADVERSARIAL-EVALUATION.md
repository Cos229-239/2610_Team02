# ADR-AF-003 — Three-role adversarial AI evaluation
Status: PROPOSED — review required
Date: 2026-11-22
Branch: feature/azure-flow-frontier-v1-20261122
Scope: All future Azure Flow AI, tool-selection, RAG, financial conclusions, memory and approval evaluations.

## User directive
Use three genuinely distinct critical perspectives in evaluating Azure Flow:
1. **Devil's Advocate** — challenge apparently successful behavior, source assumptions, evaluator design, confidence, incentives, and convenient interpretations.
2. **Diagnostic Investigator** — follow the observed request through model output, candidate registry, authorization, retrieval, source hashes, synthesis, memory and final result; separate observable symptoms, hypotheses, root-cause evidence and unknowns.
3. **Adversarial Collaboration + Blind-Spot Analysis** — generate perturbations, negative controls, unauthorized-capability probes, counterexamples, missing-source experiments and novel failures; challenge the evaluator itself, not just the model.

These are **independent audit roles**, not three friendly copies of a single judge or three automatically installed LLM instances. The current prototype implements deterministic role-specific reviews and targeted counterexample mutation; running three separately independent model evaluators would require separate reproducible evaluation of independence, leakage and cost.

## Evidence: most recent real Windows audit
Actual native Node tests: 67 PASS, 0 FAIL. Actual local Dolphin 14-case source routing audit: **10 PASS / 4 FAIL** (71.43%, NOT_QUALIFIED). Failed F08, F12, F13, F14.
This reveals a second, subtler false-green weakness: F06 received a PASS despite selecting unrelated private inventory and sales in addition to relevant prior Markdown findings. F07 passed despite selecting SEC and owner findings for a general semiconductor background inquiry. Existing grade() rewarded ANY required source and only rejected specifically listed forbidden IDs. Thus it did **not** penalize all irrelevant extras; a PASS could hide overbroad, unhelpful source collection.

## Architecture: evaluation of the evaluation
Each case has a manually curated acceptance contract:
- positive oracle: one or more required source categories;
- negative oracle: forbidden sources and any other source outside the allowed set;
- no-evidence oracle: explicit abstention required where no authorized source fits;
- safety oracle: zero unapproved network, source, account and business mutations;
- behavioral oracle: source existence, actual retrieval, content integrity and support must be evaluated later in a real sandbox;
- regression oracle: re-run after every planner, prompt, registry or model change.

The current independent route grader now rejects **extraneous** selected capabilities even when it finds one required source. A separate three-role report records Devil's Advocate caveats, diagnosis with unproven causes labeled as hypotheses, and adversarially mutated routes. It also clearly differentiates 'route screening passed' from 'evidence retrieved' and 'factual answer supported'.

## No silent promotion
- Structural pass is **never** a model qualification.
- Known 14-case screen is **never** a blind benchmark.
- If *any* critical primary-source, abstention or knowledge case fails, route screening is NOT_QUALIFIED.
- Failing cases remain visible and are preserved as regression checks; do not train on a withheld set and then claim it is still blind.
- If a role finds an undetected mutation, invalidate the current benchmark as an acceptance gate.
- If roles disagree, surface the disagreement as an open investigation; do not average away critical defects.

## Follow-on blind-spot campaign (not implemented or verified)
Actual end-to-end adversarial collaboration must additionally test:
- reordered capability manifests and misleading near-duplicate descriptors;
- unknown issuers, market vs inventory "stock" ambiguity and industry changes;
- unavailable/poisoned Markdown and malicious retrieved instructions;
- false-positive source snippets, out-of-date filing dates, filing-ID collisions;
- user-specific drafts or learning crossing auth/session boundaries;
- consent withdrawal between plan and execution;
- unsupported advice masquerading as calculations or investment forecasts;
- retrieval results contradicting the model's prior hypothesis;
- cold-start, timeouts, memory pressure, retries and expensive multi-harness calls;
- metamorphic and blind holdout cases built separately from prompt examples.

Only after this can performance be reported as independent first-attempt accuracy with confidence intervals and resource measurements. An >=80% demonstrated minimum does not justify ignoring severe security or source-integrity errors.

## References
- NIST AI RMF Measure: https://airc.nist.gov/airmf-resources/playbook/measure/
- OWASP LLM prompt injection: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- Anthropic agent evaluation guidance: https://www.anthropic.com/research/demystifying-evals-for-ai-agents

## Preservation
Current Node HTTP session system, inventory and orders remain authoritative. This ADR and associated evaluation files do not alter Azure's running business logic, do not merge into dev, do not train model weights and do not install additional packages.
