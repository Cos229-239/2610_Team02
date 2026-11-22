# Azure Flow — Learning Systems and Investment Understanding

Status: research-backed design knowledge; not a training checkpoint, financial advice or verified company finding.
Updated: 2026-11-22.

## Research anchors
- Retrieval-augmented generation (RAG): Lewis et al., NeurIPS 2020, https://arxiv.org/abs/2005.11401 — retrieve nonparametric knowledge during generation, grounding can improve specificity; retrieval alone does not certify truth.
- Agent memory taxonomy: Rethinking Memory Mechanisms of Foundation Agents, 2026, https://arxiv.org/abs/2602.06052 — working, semantic, episodic, procedural and user-centric memory policies require separate evaluation.
- Active learning: Burr Settles, 2009, https://minds.wisc.edu/items/37538f44-36ae-413e-8967-e6c831e17a8e — targeted human feedback can refine a selected learning task.
- NIST AI RMF, https://www.nist.gov/itl/ai-risk-management-framework — governance, evidence, measurement and performance review.
- SEC EDGAR investor research, https://www.investor.gov/introduction-investing/getting-started/researching-investments/using-edgar-research-investments — free corporate filing research, annual financial statements, risks and management discussions.
- SEC EDGAR public developer resources, https://www.sec.gov/about/developer-resources — public submissions and XBRL data, subject to fair-access rules.
- Investor.gov introduction to investing, https://www.investor.gov/introduction-investing — allocation, diversification, horizon and risk.
- Express.js production security, https://expressjs.com/en/advanced/best-practice-security/ — input validation, TLS, protected sessions and middleware discipline.

## What Azure Flow must understand before discussing an investment
Investment is not simply a stock symbol. Investigate: business model and durable competitive position; price relative to underlying cash flows; revenue quality; operating margin; debt and dilution; liquidity and cash conversion; primary filings and applicable jurisdiction; industry and customer concentration; scenario assumptions; downside and maximum acceptable loss; fees and taxes; investment horizon; opportunity cost; correlation to other holdings; and possible conflicts or incentives.

Separate these perspectives:
1. **Business owner:** return on invested capital, working capital, inventory replenishment, supplier risk, incremental growth, cash runway and distribution alternatives.
2. **Public securities investor:** issuer identification, filings, historical performance, capital structure, valuation assumptions, volatility, diversification and liquidity.
3. **Private business investor:** due diligence, unit economics, ownership, dilution, exit options, legal rights, comparables and unverifiable inputs.
4. **Learner:** baseline concepts, examples, guided explanation, what would change the conclusion and how to challenge evidence.

If records, reliable public sources or assumptions are missing, output questions and clearly labeled scenarios, not invented projections or buy/sell decisions.

## Distinct learning mechanisms and current architecture
| Mechanism | What it can do | Deployed boundary |
| --- | --- | --- |
| Retrieval-augmented semantic memory | Find relevant local Markdown passages, cite hashes and sources | Local BM25 retriever and opt-in public background provider |
| Episodic memory | Recall prior user-reviewed investigations | Explicit feedback ledger; similar useful cases influence *planning only* |
| Case-based reasoning | Compare a current question to a reviewed precedent | Similarity score and authorized routing precedent, not factual transfer |
| Procedural knowledge | Adapt harness selection under the capability registry | Structured LLM plan validated against currently authorized capabilities |
| Active learning | Ask reviewer to flag an error or evidence gap | Human-scored useful/incorrect/needs-more-evidence feedback |
| Metacognition | Separate source quote, inference, unknown and unsupported | JSON schema; exact quote matching; abstain when source missing |
| Counterfactual/scenario reasoning | Test how varying assumptions changes an outcome | **Not implemented as a reliable financial simulation** |
| Continual weight training/RL | Update weights based on trusted training data | **Not implemented**; no automatic fine-tuning, gradient update or promotion |
| Knowledge graph | Represent relationships among people, companies, filings, products | **Proposed**; no verified corporate entity-resolution engine yet |
| Longitudinal evaluation | Track whether outcomes improve on unseen cases | Current 20-case local screen exists; hold-out and real longitudinal evidence pending |

These mechanisms are complementary; a memory entry is not a new model parameter. Only approved feedback is a reusable routing precedent, and even then every requested capability is reauthorized.

## Source hierarchy and contradiction policy
Tier A: official first-party filings and audited documents with stable identifiers and observation dates.
Tier B: official company publications and directly attributable public datasets.
Tier C: reputable independent reporting; each conclusion has an accessible URL and date.
Tier D: community-edited encyclopedia summaries for background, never sole support for financial numbers.
Tier E: user-provided claims and model hypotheses. Clearly label as unverified.

Do not resolve contradictory sources by rhetorical confidence. Retain both, preserve dates and units, show the contradiction and request further retrieval. Every source must carry an origin, excerpt and cryptographic hash. Hashes prove content identity, not truth.

## ADR discipline
An ADR is an architecture decision record: Context; options; chosen approach; trade-offs; evidence; verification; owner approval; revision history. A generated ADR starts as **proposed**, not ratified. Saving it is not permission to alter business records or deploy actions.

## Example non-hardcoded request
"Help me understand whether investing in Microsoft's products, its shares or my own business infrastructure makes sense."

1. Preserve question and distinguish three meanings of "investing".
2. LLM plans a set of authorized harness IDs from the current registry; if ambiguous, show the unresolved interpretations.
3. Retrieve local knowledge, optional public background and any user-owned data separately.
4. Inspect official filing information only if a compliant primary-source connector is available; do not invent SEC numbers.
5. Contrast cost, time horizon, opportunity cost, sensitivity and risk under explicit assumptions.
6. Output source-backed observations, tentative hypotheses, gaps, alternatives and a proposed ADR.
7. Accept user correction, store only explicitly reviewed routing experience, and evaluate later on new cases.
