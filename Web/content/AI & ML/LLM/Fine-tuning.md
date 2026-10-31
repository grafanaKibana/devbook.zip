---
publish: true
created: 2026-06-11T07:39:53.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-31T08:53:28.461Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Adapting model behavior with supervised training, parameter-efficient updates, and held-out evaluation.
level:
  - "2"
priority: High
status: Ready to Repeat
qard-deck: AI & ML
qard-topic: LLM/Fine-tuning
flashcard_uid: b36582e5
---

Fine-tuning continues a pretrained model's training on task-specific examples. The resulting behavior lives in the weights, so the same instructions do not need to travel with every request. It works well for stable output conventions, classification boundaries, tool-call reliability, and narrow-task distillation. It makes a poor knowledge store. Facts learned during training have no citation boundary and start aging immediately.

Prompting is the usual starting point. [[AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] addresses gaps in current or private knowledge, and fine-tuning is justified only when a measured behavior gap remains. [[#Preference alignment]] covers preference-pair methods after supervised fine-tuning, and [[#GRPO]] covers group-relative online reinforcement learning.

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

Validation checks that the reward still predicts useful behavior:

- Held-out prompts are kept and run through target, general-capability, and safety evaluations.
- Examples with high reward but poor human judgment are inspected.
- Reward distribution and group variance are measured alongside average training reward.
- The final policy is tested outside the environment and formatting assumptions used by the verifier.

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

Evaluation holds out complete prompts as well as response pairs, so it tests generalization to new situations.

## RLHF

In the InstructGPT-style pipeline, human comparisons train a reward model. Reinforcement learning then updates the language-model policy to increase that learned reward while constraining drift from a reference policy. This supports online sampling from the current policy, but adds a reward-model lifecycle and reinforcement-learning instability.

Reward increases are only a training signal. A policy can exploit blind spots in the reward model, so held-out human evaluation and safety checks must still pass before release.

## DPO

Direct Preference Optimization derives a classification-style objective from preference pairs and a reference policy. It removes the separate reward model and online RL loop, which makes the pipeline simpler. Pair quality, reference choice, loss settings, and coverage still determine whether that simpler pipeline generalizes.

DPO fits a fixed preference set that is already available and stable. Online methods such as [[#GRPO]] fit when a verifier can score newly sampled candidates and remains reliable as outputs change.

Evaluation measures pairwise win rate with blinded raters alongside task correctness, refusal behavior, calibration, and safety slices. A separate set catches general-capability regressions. Response length needs explicit control or reporting because raters and judges can favor longer answers that are no more correct.

# When Fine-tuning Earns Its Cost

- The model understands the task but inconsistently follows a format or policy after good prompting and few-shot examples.
- The target behavior is easier to demonstrate than specify, and representative examples can be labeled consistently.
- A high-volume narrow task justifies distilling a larger model’s behavior into a smaller one.
- Long repeated instructions dominate context and inference cost, and training can encode that stable behavior.

A held-out evaluation set and a baseline from the exact base model must exist before training starts. Training loss shows fit to the examples. It says nothing by itself about production behavior.

# Full Fine-tuning

Full fine-tuning updates every model weight. Its memory footprint is not a fixed multiple of the published model size. A run may hold weights, gradients, optimizer states, activations, temporary buffers, and communication shards at different precisions. Adam-style optimizers keep several state tensors. Activation memory moves with batch size, sequence length, layer shape, and checkpointing policy. Quantization, mixed precision, ZeRO/FSDP sharding, CPU offload, and optimizer choice change the total again.

Capacity planning starts from a component-level estimate for the exact model and training stack, followed by a measured short run. Full tuning is justified only when broader weight updates beat PEFT on held-out quality by enough to pay for distributed compute and a full derived checkpoint.

# Parameter-efficient Fine-tuning

## LoRA

Low-Rank Adaptation freezes the base weights and trains low-rank update matrices in selected layers. The small adapter can stay separate, be swapped, or be merged for serving. Keeping it separate makes rollback straightforward: disabling the adapter restores the original base weights.

An active LoRA adapter can still cause catastrophic forgetting or other regressions. It changes the effective computation and can pull the deployed model away from instruction following, safety behavior, or capabilities missing from narrow training data. Evaluation must cover the complete base-plus-adapter system on target and broad holdouts. “Frozen base” describes storage and update mechanics. It does not promise unchanged behavior while the adapter is active.

## QLoRA

QLoRA stores the frozen base in 4-bit NormalFloat form and trains LoRA adapters through that quantized representation. The QLoRA paper reports fine-tuning models up to 65B parameters on a single 48 GB GPU under its stated configurations. That is evidence for those experiments, not a promise that any large model fits any consumer GPU.

Feasibility still depends on the model architecture and the actual training configuration: sequence length, batching, adapter targets, optimizer state, checkpointing, attention kernels, and device memory. Quality must be measured for the chosen base, quantization settings, task, and evaluation set. A memory estimate followed by a short run is safer than committing hardware from a headline number.

# Data

Data quality and coverage matter more than raw count.

- Training examples match the production chat template, system role, tool schema, and output format exactly.
- Contradictory labels and near-duplicate examples that over-weight one phrasing are removed.
- Ordinary cases, boundary cases, refusals, and negative examples appear in the proportions expected at inference.
- A held-out split is never used for training or prompt iteration.
- The base checkpoint, tokenizer, data version, hyperparameters, and adapter targets are recorded so the run is reproducible.

# Evaluation

The base and fine-tuned candidates are compared on the same target set, broad capability holdouts, and safety checks. Effect sizes are reported by slice instead of hidden inside one average. A format gain that causes a reasoning or refusal regression is a trade, not a free improvement.

During training, validation loss and early stopping detect memorization, but shipping still depends on task metrics and production confirmation through [[AI & ML/LLM/Evaluation/Online Evaluation and AB Tests|online evaluation and A/B tests]]. A deployable base checkpoint keeps rollback an operational action, not a retraining project.

# Pitfalls

**Injecting knowledge:** a model trained on a document corpus may reproduce facts, yet cannot guarantee retrieval, freshness, or citation. Changing facts belong in RAG. Fine-tuning can teach the behavior for using them.

**Format mismatch:** different chat templates or tool schemas between training and serving teach a distribution the runtime never presents.

**Narrow-only evaluation:** target gains can hide losses in general reasoning, multilingual behavior, or safety. The active adapter belongs in every deployment candidate being evaluated.

**Capacity estimates from one multiplier:** model-file size is not training memory. A usable estimate accounts for weights, gradients, optimizer states, activations, and sharding in the actual configuration.

# Tradeoffs

| Approach | Main benefit | Main cost | Best fit |
| --- | --- | --- | --- |
| Prompting | Fast iteration, no training | Repeated context and inconsistent behavior | Most new tasks |
| RAG | Fresh, attributable knowledge | Retrieval and indexing system | Changing or private facts |
| LoRA | Small separable updates | Active adapter can still regress capabilities | Stable behavior on limited compute |
| QLoRA | Lower base-weight memory during tuning | Hardware fit and quality are configuration-specific | PEFT when full-precision base storage is the constraint |
| Full tuning | Broadest update capacity | Highest memory, compute, and checkpoint cost | Proven quality gap that PEFT cannot close |

# Questions

> [!qard]- What is LoRA, and why is it cheaper than full fine-tuning?
> LoRA (Low-Rank Adaptation) fine-tunes a pretrained model by freezing its weights and training only a small low-rank update for selected layers. Because the trainable part is a tiny fraction of the model, training needs gradients and optimizer state only for that update, and the result is a small adapter instead of a full model copy.
>
> 1. A chosen weight matrix `W0` stays frozen.
> 2. Its change is represented as the product of two small matrices, `B·A`. Their shared inner dimension, the rank `r`, is much smaller than the layer's dimensions.
> 3. Only `A` and `B` are trained.
> 4. The adapted layer computes `W0·x + B·A·x`.
>
> The small trainable set lowers training memory compared with updating every weight. Adapters for different tasks can share one base model and be swapped. An adapter can also be merged into `W0`, so serving needs no extra computation. Whether a LoRA adapter matches full fine-tuning on a particular task depends on its configuration, such as rank and target layers, and held-out evaluation establishes it.
>
> Sources: [Hu et al.: LoRA](https://arxiv.org/abs/2106.09685) · [Hugging Face PEFT: LoRA](https://huggingface.co/docs/peft/en/developer_guides/lora)

<!-- qard-id: d65b682a-c207-4ffc-87d5-1839b2d5ba54 -->

> [!qard]- Why can LoRA still cause capability regressions if the base weights are frozen?
> Freezing the base weights fixes what is stored and updated during training, not what the deployed model computes. LoRA adds a trainable low-rank update to selected layers. While the adapter is active, each adapted layer computes the frozen weight's output plus the adapter's contribution: `W0·x + B·A·x`.
>
> That added term applies to every input passing through those layers, not only to inputs that resemble the training data. Training optimizes it for the target examples alone, so it can also shift behavior the data never covered, such as instruction following, safety behavior or general reasoning. Frozen base weights therefore do not guarantee unchanged outputs. The full base-plus-adapter model needs evaluation on both the target task and broad held-out sets.
>
> Freezing does make rollback easier. A separate adapter can be disabled, which returns the model to the base behavior. Merging folds the update into the weights, so rollback after a merge depends on a supported unmerge or an unmodified copy of the base checkpoint.
>
> Sources: [Hu et al.: LoRA](https://arxiv.org/abs/2106.09685) · [Hugging Face PEFT: LoRA](https://huggingface.co/docs/peft/en/developer_guides/lora) · [More Than Catastrophic Forgetting](https://arxiv.org/abs/2405.17830)

# References

- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)
- [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314)
- [DeepSeekMath](https://arxiv.org/abs/2402.03300)
- [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347)
- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290)
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155)
- [Fine-tuning guide](https://platform.openai.com/docs/guides/fine-tuning)
