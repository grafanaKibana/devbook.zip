---
publish: true
created: 2026-07-16T18:34:16.393Z
modified: 2026-07-16T18:34:16.393Z
published: 2026-07-16T18:34:16.393Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Optimizing a language model from ranked responses after supervised instruction tuning.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

Preference alignment trains a model to favor one response over another for the same prompt. Supervised fine-tuning teaches imitation from a chosen answer; preference data adds a relative signal about helpfulness, correctness, tone, or refusal behavior. The method can improve policy behavior, but it optimizes the labels and reward definition it receives. A preference for fluent confidence can therefore amplify sycophancy or hide uncertainty.

## Preference data

A record contains a prompt and at least two candidate responses with a preference or ranking. The label should follow an explicit rubric. If raters disagree because “helpful” mixes correctness, tone, and verbosity, the training signal is not one coherent objective.

```text
prompt: customer asks for a refund outside policy
chosen: explains the limit, offers the supported escalation path
rejected: invents an exception and promises a refund
rubric: policy correctness first, then actionability and tone
```

Hold out prompts, not only response pairs, so evaluation tests generalization to new situations.

## RLHF

In the InstructGPT-style pipeline, human comparisons train a reward model. Reinforcement learning then updates the language-model policy to increase that learned reward while constraining drift from a reference policy. This supports online sampling from the current policy, but adds a reward-model lifecycle and reinforcement-learning instability.

Reward increases are not the product objective. The policy can exploit blind spots in the reward model, so held-out human evaluation and safety checks remain release gates.

## DPO

Direct Preference Optimization derives a classification-style objective from preference pairs and a reference policy. It avoids training a separate reward model and avoids an online RL loop, making the pipeline simpler. It still depends on pair quality, reference choice, loss settings, and coverage; “simpler” does not mean immune to over-optimization or distribution shift.

Use DPO when a fixed preference dataset describes the desired boundary well. Use an online RL method such as [[GRPO]] when the current policy must generate candidates and a reliable reward can score them, especially for verifiable tasks.

## Evaluation

Measure pairwise win rate with blinded raters, task correctness, refusal precision/recall, calibration, and safety slices. Keep a separate set for regressions in general capability. If response length differs, control or report it: raters and judges can prefer longer answers even when they are not more correct.

## Questions

> [!QUESTION]- Why not use supervised fine-tuning for every preference?
> SFT imitates one selected answer. Preference objectives also learn the boundary between chosen and rejected behavior, which can be more informative when several plausible answers differ in policy or quality.

> [!QUESTION]- What is DPO’s operational advantage over reward-model RLHF?
> It trains directly from preference pairs without a separate learned reward model or online policy-optimization loop. The tradeoff is that it cannot explore and score fresh outputs during the update.

## References

- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) — the primary InstructGPT SFT, reward-model, and RLHF pipeline.
- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290) — the primary derivation and evaluation of direct preference training without a separate reward model.
- [Discovering Language Model Behaviors with Model-Written Evaluations](https://arxiv.org/abs/2212.09251) — primary evidence on behavioral evaluation and risks such as sycophancy that alignment must measure explicitly.
