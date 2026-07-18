---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Measuring LLM behavior with versioned cases, exact checks, semantic scoring, and production outcomes."
tags:
  - FolderNote
publish: true
level:
  - "3"
status: Done
priority: High
---

Evaluation measures whether an LLM application satisfies product, grounding, safety, and operational requirements. Because open-ended output has several valid forms, one assertion cannot cover the system. A useful evaluation combines a versioned regression corpus, exact predicates, semantic rubrics, human calibration, and production outcomes.

The corpus and the scoring techniques are different things. A [[Golden Test Set and Regression Runs|golden test set]] is the versioned dataset that supplies inputs, expected facts or invariants, rubrics, and slice metadata. [[Deterministic Checks]] and [[LLM-as-a-Judge|judges]] score candidate outputs produced from those cases. Regression logic then compares the candidate with a pinned baseline or threshold.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Evaluation system

```mermaid
flowchart TD
    G[Versioned golden corpus] --> R[Run candidate and baseline]
    R --> O[Captured outputs and traces]
    O --> X[Exact deterministic predicates]
    O --> J[Rubric judge and human samples]
    X --> S[Scores by case and slice]
    J --> S
    S --> C{Regression gate}
    C -->|pass| P[Controlled production rollout]
    C -->|fail| F[Block and diagnose]
    P --> ON[Online outcomes and failures]
    ON --> T[Triage and label]
    T -->|new dataset version| G
```

Exact checks can run before an expensive judge for one candidate output, but the golden corpus is not a downstream stage after the judge. It is the common input and comparison boundary for every scorer.

Use deterministic code where the predicate is exact:

- JSON parses against a pinned schema.
- A required field exists and has the expected type.
- A tool name belongs to an allowed set.
- A numeric value stays inside a declared range.

Those checks have no classification error when the predicate and implementation match the product contract. The guarantee does not extend to every rule implemented in code. Regex-based PII detection, keyword safety filters, toxicity classifiers, and unsupported-claim heuristics are repeatable but imperfect: they can produce both false positives and false negatives. Calibrate them on labeled examples and treat uncertain content as a scored signal or review path rather than an infallible hard gate.

Semantic dimensions such as correctness, groundedness, and actionability need a rubric. An LLM judge scales that rubric, while blinded human samples measure judge agreement and reveal systematic bias. Keep judge model, prompt, rubric, and sampling settings versioned with the result.

# Example

One customer-support case can carry both exact and semantic expectations:

```text
case_id: damaged-refund-45-days
input: "Can I return a damaged item after 45 days?"

exact predicates:
- response matches the answer schema
- cited_policy_sections contains at least one identifier
- tool_calls use only policy_search

rubric dimensions (0-2):
- policy correctness
- groundedness in the cited section
- actionability of the escalation path

heuristic signals:
- possible payment-card number
- possible unsupported promise
```

A schema failure is exact. “Possible payment-card number” remains a detector result until its precision and recall are established for this traffic.

# Dataset lifecycle and overfitting

Give every corpus version immutable case identifiers, provenance, expected behavior, slice labels, and a reason for inclusion. New production failures enter through triage, not by silently editing an existing case. Keep a development set for iteration and a frozen holdout for release decisions.

Repeatedly tuning prompts or judge rubrics against the holdout turns it into training data. A rising holdout score with flat [[Online Evaluation and AB Tests|online outcomes]] is evidence of evaluation overfitting. Rotate or add independently sourced cases, inspect slice-level effects, and retain human review for disputed decisions.

# Questions

> [!QUESTION]- Is a golden test set a scoring stage?
> No. It is a versioned regression dataset. Exact predicates, semantic judges, and human raters score outputs generated from its cases; the regression gate compares those results with a pinned baseline or threshold.

> [!QUESTION]- When does a deterministic check have zero classification error?
> Only when it evaluates an exact product predicate, such as schema validity or membership in an allowed set, and the implementation matches that contract. Deterministic PII, toxicity, and content heuristics still have false positives and false negatives.

> [!QUESTION]- Why is a strong offline score insufficient to ship?
> A fixed corpus cannot reproduce every traffic shift, multi-turn interaction, or user outcome. Use offline regression as a release gate, then estimate production impact with monitoring and controlled online experiments.

# References

- [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — provider guidance for task-specific criteria, datasets, graders, and continuous evaluation loops.
- [OpenAI evals guide](https://developers.openai.com/api/docs/guides/evals) — primary API documentation for defining, running, and inspecting evaluation jobs.
- [Anthropic: define success criteria](https://docs.anthropic.com/en/docs/test-and-evaluate/define-success) — provider guidance for translating product goals into measurable success criteria and test cases.
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) — the primary voluntary risk-management framework for governing measurement, validation, and monitoring across the AI lifecycle.
