---
publish: true
created: 2026-08-20T20:41:15.492Z
modified: 2026-08-20T20:41:15.492Z
published: 2026-08-20T20:41:15.492Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Adapting model behavior with supervised training, parameter-efficient updates, and held-out evaluation.
level:
  - "2"
priority: High
status: Ready to Repeat
---

Fine-tuning continues a pretrained model's training on task-specific examples. The resulting behavior lives in the weights, so the same instructions do not need to travel with every request. It works well for stable output conventions, classification boundaries, tool-call reliability, and narrow-task distillation. It makes a poor knowledge store. Facts learned during training have no citation boundary and start aging immediately.

Start with prompting, add [[AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] when the gap is current or private knowledge, and fine-tune only when a measured behavior gap remains. [[#Preference alignment]] covers preference-pair methods after supervised fine-tuning, and [[#GRPO]] covers group-relative online reinforcement learning.

# GRPO

Group Relative Policy Optimization (GRPO) is an online reinforcement-learning method for language-model post-training. For each prompt, the current policy samples a group of completions. A rule-based or model-based verifier scores them, and the update favors completions that perform better than others in that group. GRPO removes the learned value model used by PPO-style training. On-policy sampling, reward design, KL control, and reward-hacking risk remain.

## Group-relative Update

```text
prompt
  → sample G completions from current policy
  → score each completion
  → normalize rewards inside the group
  → update with clipped objective and reference-policy constraint
```

A math prompt might produce eight completions. Six fail the final-answer check. Another reaches the right answer with invalid formatting, while the last is correct and well formed. Outcome and format rewards rank this sampled group. The normalized advantage identifies trajectories that beat their peers. It is not a calibrated probability that a response is globally correct.

The absence of a critic reduces model-state memory and one source of estimation error. But group estimates can still be noisy, especially when every sampled completion receives nearly the same reward. More samples improve comparison and increase generation cost.

## Rewards the Model Cannot Cheaply Game

GRPO works best with rewards that are cheap to verify and hard to game, such as exact math answers, executable tests, schema checks, or constrained simulators. A vague style judge can reward verbosity or shortcuts that fail outside the training setup.

Check that the reward still predicts useful behavior:

- Keep held-out prompts and run target, general-capability, and safety evaluations.
- Inspect examples with high reward but poor human judgment.
- Measure reward distribution and group variance alongside average training reward.
- Test the final policy outside the environment and formatting assumptions used by the verifier.

## Where GRPO Came From

DeepSeekMath introduced GRPO with group-relative advantages, a clipped policy objective, and KL regularization. DeepSeek-R1 later reported a GRPO-based reasoning post-training pipeline. The method fits problems with a stable verifier and a repeatable rollout environment. A release still depends on trustworthy data, held-out evaluation, and deployment checks.

# Preference Alignment

Preference alignment trains a model to favor one completion over another for the same prompt. The labels show which responses the model should prefer. A weak rubric therefore puts its bias directly into training.

## Preference Data

```text
prompt: user asks for a refund outside policy
chosen: explains limits and escalation
rejected: invents an exception and promises a refund
rubric: correctness, actionability, tone
```

Hold out complete prompts as well as response pairs so evaluation tests generalization to new situations.

## RLHF

In the InstructGPT-style pipeline, human comparisons train a reward model. Reinforcement learning then updates the language-model policy to increase that learned reward while constraining drift from a reference policy. This supports online sampling from the current policy, but adds a reward-model lifecycle and reinforcement-learning instability.

Reward increases are only a training signal. A policy can exploit blind spots in the reward model, so held-out human evaluation and safety checks must still pass before release.

## DPO

Direct Preference Optimization derives a classification-style objective from preference pairs and a reference policy. It removes the separate reward model and online RL loop, which makes the pipeline simpler. Pair quality, reference choice, loss settings, and coverage still determine whether that simpler pipeline generalizes.

DPO fits a fixed preference set that is already available and stable. Online methods such as [[#GRPO]] fit when a verifier can score newly sampled candidates and remains reliable as outputs change.

Measure pairwise win rate with blinded raters alongside task correctness, refusal behavior, calibration, and safety slices. Keep another set for general-capability regressions. Response length needs explicit control or reporting because raters and judges can favor longer answers that are no more correct.

# When Fine-tuning Earns Its Cost

- The model understands the task but inconsistently follows a format or policy after good prompting and few-shot examples.
- The target behavior is easier to demonstrate than specify, and representative examples can be labeled consistently.
- A high-volume narrow task justifies distilling a larger model’s behavior into a smaller one.
- Long repeated instructions dominate context and inference cost, and training can encode that stable behavior.

A held-out evaluation set and a baseline from the exact base model must exist before training starts. Training loss shows fit to the examples. It says nothing by itself about production behavior.

# Full Fine-tuning

Full fine-tuning updates every model weight. Its memory footprint is not a fixed multiple of the published model size. A run may hold weights, gradients, optimizer states, activations, temporary buffers, and communication shards at different precisions. Adam-style optimizers keep several state tensors. Activation memory moves with batch size, sequence length, layer shape, and checkpointing policy. Quantization, mixed precision, ZeRO/FSDP sharding, CPU offload, and optimizer choice change the total again.

Plan capacity from a component-level estimate for the exact model and training stack, then measure a short run. Reserve full tuning for cases where broader weight updates beat PEFT on held-out quality enough to justify distributed compute and a full derived checkpoint.

# Parameter-efficient Fine-tuning

## LoRA

Low-Rank Adaptation freezes the base weights and trains low-rank update matrices in selected layers. The small adapter can stay separate, be swapped, or be merged for serving. Keeping it separate makes rollback straightforward: disabling the adapter restores the original base weights.

An active LoRA adapter can still cause catastrophic forgetting or other regressions. It changes the effective computation and can pull the deployed model away from instruction following, safety behavior, or capabilities missing from narrow training data. Evaluation must cover the complete base-plus-adapter system on target and broad holdouts. “Frozen base” describes storage and update mechanics. It does not promise unchanged behavior while the adapter is active.

## QLoRA

QLoRA stores the frozen base in 4-bit NormalFloat form and trains LoRA adapters through that quantized representation. The QLoRA paper reports fine-tuning models up to 65B parameters on a single 48 GB GPU under its stated configurations. That is evidence for those experiments, not a promise that any large model fits any consumer GPU.

Feasibility still depends on the model architecture and the actual training configuration: sequence length, batching, adapter targets, optimizer state, checkpointing, attention kernels, and device memory. Quality must be measured for the chosen base, quantization settings, task, and evaluation set. A memory estimate followed by a short run is safer than committing hardware from a headline number.

# Data

Data quality and coverage matter more than raw count.

- Match the production chat template, system role, tool schema, and output format exactly.
- Remove contradictory labels and near-duplicate examples that over-weight one phrasing.
- Cover ordinary cases, boundary cases, refusals, and negative examples in the proportions expected at inference.
- Keep a held-out split that is never used for training or prompt iteration.
- Record the base checkpoint, tokenizer, data version, hyperparameters, and adapter targets so the run is reproducible.

# Evaluation

Compare the base and fine-tuned candidates on the same target set, broad capability holdouts, and safety checks. Report effect sizes by slice instead of hiding them inside one average. A format gain that causes a reasoning or refusal regression is a trade, not a free improvement.

During training, validation loss and early stopping detect memorization, but shipping still depends on task metrics and production confirmation through [[AI & ML/LLM/Evaluation/Online Evaluation and AB Tests|online evaluation and A/B tests]]. Keep the base checkpoint deployable so rollback is an operational action, not a retraining project.

# Pitfalls

**Injecting knowledge:** a model trained on a document corpus may reproduce facts, yet cannot guarantee retrieval, freshness, or citation. Changing facts belong in RAG. Fine-tuning can teach the behavior for using them.

**Format mismatch:** different chat templates or tool schemas between training and serving teach a distribution the runtime never presents.

**Narrow-only evaluation:** target gains can hide losses in general reasoning, multilingual behavior, or safety. The active adapter belongs in every deployment candidate being evaluated.

**Capacity estimates from one multiplier:** model-file size is not training memory. Estimate weights, gradients, optimizer states, activations, and sharding for the actual configuration.

# Tradeoffs

| Approach | Main benefit | Main cost | Best fit |
| --- | --- | --- | --- |
| Prompting | Fast iteration, no training | Repeated context and inconsistent behavior | Most new tasks |
| RAG | Fresh, attributable knowledge | Retrieval and indexing system | Changing or private facts |
| LoRA | Small separable updates | Active adapter can still regress capabilities | Stable behavior on limited compute |
| QLoRA | Lower base-weight memory during tuning | Hardware fit and quality are configuration-specific | PEFT when full-precision base storage is the constraint |
| Full tuning | Broadest update capacity | Highest memory, compute, and checkpoint cost | Proven quality gap that PEFT cannot close |

# Questions

> [!QUESTION]- Why can LoRA still cause forgetting if the base weights are frozen?
> The deployed output comes from the base plus the adapter’s updates. Narrow adapter training can steer that effective model away from capabilities outside the training distribution. The frozen base makes rollback easy. It does not guarantee unchanged behavior while the adapter is enabled.

# References

- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)
- [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314)
- [DeepSeekMath](https://arxiv.org/abs/2402.03300)
- [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347)
- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290)
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155)
- [Fine-tuning guide](https://platform.openai.com/docs/guides/fine-tuning)
