# Towerflow — Code Correlation Evaluation Environment

**State:** Isolated experiment. Not merged, deployed, or integrated with AURA/FLOW. No Qwen3 selection, model weights, subscriptions, persistent telemetry, or production changes.

## Intended system
This is a **first-use interpretation eval** for the user's corrected correlation codes. It tests whether a real model can decode an ordinary-language request into appropriate technical domains, operational patterns, and explicit preservation constraints **without being shown the answer**.

| Four-file role described by the user | Source in this experiment |
| --- | --- |
| SPECS: exact codes | `code-correlation-cases.json` `expected.codes` and domain vocabulary in `run-code-correlation-eval.cjs` |
| DESIGN: triggered pattern | `expected.patterns` |
| PRESERVATION: must remain unchanged | `expected.preserve` |
| API: sequence and checks | `run-code-correlation-eval.cjs`, `code-correlation-eval.cjs` |

These logical roles do **not** replace any original user-owned SPECS/DESIGN/PRESERVATION/API files. The current repository does not yet expose their canonical contents in this branch.

## Run

Prerequisite: Node.js 22. Run from repository root.

```powershell
node --test .\integrations\agents\code-correlation-eval.test.cjs
node .\integrations\agents\run-code-correlation-eval.cjs --smoke
```

`--smoke` intentionally scores **0/12** and exits **2** to prove the evaluator rejects incorrect responses. This is not a model test.

To evaluate a **real explicitly selected OpenAI-compatible chat-completions model** (hosted HTTPS or local loopback; does not default to Qwen):

```powershell
$env:TF_EVAL_ENDPOINT='https://YOUR-PROVIDER.example/v1/chat/completions'
$env:TF_EVAL_MODEL='YOUR-MODEL-ID'
$env:TF_EVAL_API_KEY='YOUR-API-KEY'
node .\integrations\agents\run-code-correlation-eval.cjs --model
Remove-Item Env:TF_EVAL_API_KEY
```

Use environment variables only; **never commit real tokens**. The CLI prints scores, failures, case IDs, and provider model ID, not prompts or raw response text; model prompts are transmitted to the explicitly configured endpoint. Set model-specific budgets/billing externally. No provider subscription is configured by this PR.

## Gating and interpretation

Per case each of three gates receives either **10** or **0**:
- **Code exact:** reference domain labels *and* correct ambiguity/clarification classification.
- **Pattern present:** exact expected set of pattern IDs, with no unsupported extras.
- **Preservation intact:** exact expected set of preservation IDs, no omissions or extras.

Pass requires **10/10/10**. Runs report pass rate and gate rates; refusal or provider/network failure is a fail, never disguised as a pass.

**What this does prove, once a real model is run:** whether its structured interpretation matches pre-registered reference labels on these tests. The mocked provider test proves the HTTP adapter/JSON grader wiring only.

**What it does not prove:** that any images, audio, sensory model, agent action, or 3D room changes were actually executed, and it does not establish learning, operational accuracy, or universal predictability. Claims of photorealism or acoustic quality require calibrated render/audio artifacts and independent human/physical measurements.

## Experimental validity safeguards and next gates

- The initial 12 expected-answer cases are hypotheses based on the user's corrected table, not expert-certified scientific truth. They should be reviewed without showing hidden answers to the tested model.
- Do not put reference labels or answers in the prompt. This runner sends only the user's natural-language task and allowed vocabulary.
- Require held-out paraphrases and adversarial cases, multi-run repeatability, latency/cost measurements, independent source verification, expert labeling agreement, and baseline-model comparison before ranking capability.
- Model interpretation accuracy is only gate one of a larger closed-loop system. Later **action** evals must check actual room state, source diffs, screenshot perceptual quality, and whether preserved behaviors survived.
- Do not promote an experiment or automatically merge a PR based on 12 successful cases.

## Research

- Anthropic: [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- OpenAI: [Working with evals](https://developers.openai.com/api/docs/guides/evals) — platform lifecycle changes may apply; this implementation is independent.
- NIST: [AI RMF MEASURE](https://airc.nist.gov/airmf-resources/playbook/measure/)
- scikit-learn: [Probability calibration](https://scikit-learn.org/stable/modules/calibration.html)

The policy is to test **operational truth**, not to reward a model for claiming it succeeded.
