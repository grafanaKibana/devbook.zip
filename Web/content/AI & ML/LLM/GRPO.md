---
publish: true
created: 2026-07-16T18:34:16.560Z
modified: 2026-07-16T18:34:16.561Z
published: 2026-07-16T18:34:16.561Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Online policy optimization using rewards relative to a group of sampled completions without a learned critic.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

Group Relative Policy Optimization (GRPO) is an online reinforcement-learning method for language-model post-training. For each prompt, the current policy samples a group of completions, a reward function scores them, and the update increases probability for completions that perform better relative to their group. GRPO removes the learned value model used by PPO-style training; it does not remove on-policy sampling, reward design, KL control, or the risk of reward hacking.

## Group-relative update

```text
prompt
  → sample G completions from the current policy
  → score every completion
  → normalize rewards within the group
  → update the policy with a clipped objective and reference-policy constraint
```

Suppose a math prompt produces eight completions. Six fail the final-answer check, one reaches the right answer through invalid formatting, and one is correct and well formed. Outcome and format rewards rank that sampled group. The normalized advantage says which trajectories were better than their peers; it is not a calibrated probability that one response is globally correct.

The absence of a critic reduces model-state memory and one source of estimation error. Group estimates can still be noisy, especially when every sampled completion receives nearly the same reward. More samples improve comparison but increase generation cost.

## Reward boundary

GRPO works best when rewards are difficult to game and cheap to verify: exact math answers, executable tests, schema checks, or constrained simulators. A style judge or underspecified reward can reward verbosity, shortcuts, or artifacts that do not generalize.

Use several gates:

- Keep held-out prompts and run target, general-capability, and safety evaluations.
- Inspect examples with high reward but poor human judgment.
- Measure reward distribution and group variance, not only average training reward.
- Test the final policy outside the environment and formatting assumptions used by the verifier.

## DeepSeek evidence boundary

DeepSeekMath introduced GRPO and specifies its group-relative advantages, clipped policy objective, and KL regularization. DeepSeek-R1 reports a GRPO-based reasoning post-training pipeline and evaluations under its documented setup. Those papers support the mechanism and their stated experiments; they do not make undated API prices, third-party GPU comparisons, or broad “best model” claims durable facts.

## Tradeoffs

GRPO avoids a learned critic but spends compute sampling several completions per prompt. It is attractive when rewards are verifiable and critic memory is material. [[Preference Alignment|DPO]] is simpler when a fixed, high-quality preference dataset already captures the desired boundary and online exploration is unnecessary.

## Questions

> [!QUESTION]- What does GRPO remove compared with PPO-style language-model training?
> It removes the separately learned value model by estimating relative advantage from a group of sampled completions. It retains policy sampling, reward computation, clipped updates, and a reference-policy constraint.

> [!QUESTION]- Why can training reward rise while reasoning quality does not?
> The policy may exploit the verifier or output format, and group-relative rewards only compare sampled candidates under that reward. Held-out task and human evaluation are required to show that the learned behavior generalizes.

## References

- [DeepSeekMath](https://arxiv.org/abs/2402.03300) — the primary paper introducing GRPO and its objective.
- [DeepSeek-R1](https://arxiv.org/abs/2501.12948) — primary report for a GRPO-based reasoning post-training pipeline and its stated evaluation setup.
- [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347) — the primary clipped-policy optimization work that provides the comparison point for GRPO.
- [ByteByteGo source snapshot: DeepSeek one-pager](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/deepseek-1-pager.md) — the pinned secondary summary reconciled here by retaining the GRPO mechanism and excluding volatile cost, hardware, and benchmark comparisons.
