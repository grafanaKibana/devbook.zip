# Week 02 — Evaluation-First AI Engineering
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 01 - LLM and RAG Foundations]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 03 - Agents, Tool Use, and MCP]]

## Goal

Turn the first RAG slice into an engineering system instead of a promising demo. This week is about making quality measurable through a small golden set, deterministic checks, and an explicit regression habit.

## Weekly Outcome

By the end of the week, you should have a usable evaluation harness for the `Support Copilot Platform`, including a small golden set, deterministic checks, a repeatable baseline run, and written rules for what blocks a change versus what is only a warning. The goal is to turn quality from opinion into an explicit release input.

## Task Checklist

- [ ] Define 4 to 6 evaluation dimensions for the current support workflow.
- [ ] Create 10 to 15 golden cases with a mix of answerable, unsupported, stale-doc, and citation-sensitive prompts.
- [ ] Write expected outcomes for each case, not just the prompt text.
- [ ] Version the golden set so future changes are trackable.
- [ ] Implement deterministic checks for answer shape, citation presence, refusal behavior, and escalation behavior.
- [ ] Add pass, warn, and fail thresholds for the first baseline.
- [ ] Run the baseline and save results in a human-readable report.
- [ ] Record the top 3 failure modes with example outputs.
- [ ] Add one regression command that can run locally before a merge.
- [ ] Decide which checks belong in CI and which belong in deeper manual review.

## Suggested Session Plan

### Session 1, define what good means

- List the failure modes that matter most for support answers.
- Decide what should count as a failure, a warning, and an acceptable limitation.
- Translate those ideas into concrete evaluation dimensions.

### Session 2, build the golden set

- Write 10 to 15 high-signal support questions.
- Include stale-document, unsupported, and citation-sensitive cases.
- Add expected outcomes, expected refusal behavior, or required citation hints for each case.

### Session 3, implement deterministic checks

- Validate answer shape.
- Validate that citations exist when the answer claims evidence.
- Validate refusal behavior for unsupported cases.
- Validate escalation or handoff language for high-risk support scenarios.

### Session 4, baseline and analysis

- Run the full set.
- Save the raw outputs.
- Score the current system against the evaluation dimensions.
- Group failures by root cause, retrieval miss, answer-generation miss, citation issue, refusal issue.

### Session 5, release-gate design and review

- Decide what runs locally versus in CI.
- Write one short eval-gate note for the team.
- Re-run after one small fix so you experience the regression loop, not just the first baseline.

## Suggested Steps

### Step 1 — Name the evaluation dimensions

- Groundedness
- citation correctness
- refusal quality when evidence is missing
- escalation or handoff correctness for support scenarios

### Step 2 — Build the first golden set

- Add answerable questions.
- Add one unsupported question.
- Add one stale-document case.
- Add one citation-sensitive case.

### Step 3 — Make checks deterministic

- Validate answer shape.
- Validate citation presence.
- Validate refusal behavior for unsupported cases.
- Keep the first version mechanical and boring.

## Implementation Tasks

Anchor the work to the `Support Copilot Platform` release path.

- Create a versioned golden-set file with fields for prompt, expected behavior, required citations, and severity.
- Add golden cases for support-specific failures, especially outdated policy answers and unsafe escalation guidance.
- Implement deterministic validators that check for required response fields and citation count.
- Add a validator for unsupported cases so the system fails if it fabricates an answer instead of refusing.
- Add a validator for escalation scenarios, for example billing dispute, security incident, or account lockout, where the system should route or advise carefully.
- Produce a baseline run summary that shows per-case results, aggregate pass rate, and a short failure taxonomy.
- Add a single command or test target that engineers can run before they touch prompts, retrieval, or tools.
- Write an eval-gate note that states what blocks rollout today and what will remain informational until later.

## Deep Study

- Read [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]].
- Read [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]].
- Read [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]].

## Resource Pack

### Internal notes

- [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]]

### External docs

- [OpenAI evals design guide](https://platform.openai.com/docs/guides/evals), practical guidance on how to structure eval tasks, score outputs, and use evals during iteration.
- [Promptfoo documentation](https://www.promptfoo.dev/docs/intro/), examples of test-case driven prompt and model evaluation with repeatable CLI workflows.
- [LangSmith evaluation concepts](https://docs.smith.langchain.com/evaluation/concepts), useful reference for dataset design, offline evaluation structure, and experiment comparison.

## Build Plan

- Create a versioned golden-set file.
- Add deterministic validators.
- Produce one baseline run summary.
- Record the top 3 failure modes instead of hiding them.

Concrete outputs for the week:

- golden-set file
- deterministic validator script or test harness
- baseline score report
- short eval-gate note

## System Design Drill

Design the eval loop like a release gate:

- What runs locally?
- What runs in CI?
- What blocks rollout?
- Which failures are hard blockers versus soft warnings?

## DSA Plan

- Solve 1 sliding-window problem.
- Solve 1 graph traversal problem.
- Tie each problem back to logs, workflow paths, or evaluation batching.

## Best Practices

- Make quality visible before trying to improve it.
- Prefer 10-15 excellent cases over 100 vague ones.
- Treat unsupported-answer handling as a first-class scenario.
- Keep the first harness cheap enough to run often.
- Store raw outputs for failing cases, scores alone won't tell you what to fix.
- Separate release-gate checks from exploratory metrics so the team knows what actually blocks change.

## Common Mistakes

- Tuning against one cherry-picked prompt.
- Mixing offline and online evaluation goals too early.
- Using LLM-as-a-judge before hard checks exist.
- Recording scores without recording failure types.

## Useful Links

- [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]]
- [OpenAI evals design guide](https://platform.openai.com/docs/guides/evals)
- [Promptfoo](https://www.promptfoo.dev/docs/intro/)

## Review and Checkpoint

Use these prompts at the end of the week:

- If a change improves one hand-picked demo, do the golden-set results also improve?
- Which failures are product-risk issues versus measurement gaps in the harness?
- Do my cases cover both answer correctness and refusal correctness?
- Can another engineer understand why a case failed without asking me for context?
- Which checks should block a merge right now, and which are still advisory because the system is young?
- If leadership asked whether quality improved this week, what numbers and examples would I show?

## Definition of Done

- You have a reusable golden set.
- The Support Copilot Platform can be regression-tested.
- You know the baseline failure modes.
- You can explain why deterministic checks come before softer evaluation layers.
