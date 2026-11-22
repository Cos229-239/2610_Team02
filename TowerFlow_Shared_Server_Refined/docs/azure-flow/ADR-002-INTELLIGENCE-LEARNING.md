# ADR-AF-002 — Intelligence, memory and Express compatibility
Status: **PROPOSED — requires user and team review**
Date: 2026-11-22
Scope: Azure Flow feature branch only, not merged to dev.

## Context
The first prototype hardcoded a few company names and keywords, represented a five-column holdings form as research, and mistook a functioning UI for operating intelligence. The user requires adaptive observation, RAG, sourced Markdown findings, genuine architectural decisions, harness compliance and multiple learning modes. The existing TowerFlow inventory server is a dependency-free native Node HTTP service with authenticated ledger updates.

## Decision under review
Preserve that Node server and its current auth/ledger. Introduce a reusable Node intelligence core with an LLM-proposed, schema-validated plan drawn from a registered capability manifest. Employ local Markdown retrieval, opt-in public background research, evidence-linked synthesis, explicitly saved drafts and reviewed episodic routing memory. Supply a separate **optional Express adapter** for an existing authenticated collaboration-room gateway. Do not install Express into the inventory service solely to change the framework. The optional adapter is not mounted or verified against a live Express host.

## Alternatives
- Replace shared server with Express now: rejected because auth, state and endpoint semantics would require a risky migration with no demonstrated benefit to reasoning.
- Continue with company/keyword branches: rejected because narrow hardcoded lookups cannot generalize and are not evidence-based intelligence.
- Use only a large local LLM: rejected because unconstrained generation cannot authenticate sources or execute verified arithmetic.
- Auto-store every answer as truth: rejected because recursive contamination would amplify unverified model claims.

## Invariants
Source/quote matching is not source factual verification. External research must be explicitly opted in and cannot receive internal inventory, account records or session tokens. Only authorized harnesses may execute. Model-generated plans never confer write permissions. All memory approvals must be attributable to the signed-in owner; unsuccessful or negative feedback must not become routing precedents. No automatic stock trading or investment recommendations.

## Learning acceptance and evidence
- Demonstrate multiple question forms not present in fixed company aliases.
- Test absent/conflicting sources, prompt injection, data leakage, owner/editor boundary, stale evidence and corrupted memory.
- Score actual live model performance on unseen cases with a target of >=80% before considering promotion.
- Track retrieval precision, factual source support, route authorization, usable synthesis, latency, false confidence, and memory-induced regressions independently.
- Gate any future primary-financial-data adapter behind documented rate limits, entity matching and official source proofs.

## Current implementation status
The Node research core, capability registry, source retrieval, source-matching hypothesis proposal, explicit Markdown/ADR draft saves, learning ledger and optional Express adapter are **implemented on the feature branch**. Their full integration tests, live public-source reliability and quality impact are not verified on the user's host. No trained weights, independently validated corporate research, or unsupervised business learning is claimed.
