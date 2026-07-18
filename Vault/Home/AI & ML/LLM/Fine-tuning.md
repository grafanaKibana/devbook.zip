---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Adapting model behavior with supervised training, parameter-efficient updates, and held-out evaluation."
level:
  - "2"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Fine-tuning continues training a pretrained model on task-specific examples. It changes behavior in the weights instead of supplying instructions or facts on every request. Use it for durable output format, domain style, classification boundaries, tool-call reliability, or distilling a narrow task into a smaller model. Do not use it as a mutable knowledge store: facts embedded during training have no citation boundary and begin aging immediately.

Start with prompting, add [[Home/AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] when the gap is current or private knowledge, and fine-tune only when a measured behavior gap remains. [[#Preference alignment]] covers preference-pair methods after supervised fine-tuning, and [[#GRPO]] covers group-relative online reinforcement learning.

## GRPO

Group Relative Policy Optimization (GRPO) is an online reinforcement-learning method for language-model post-training. For each prompt, the current policy samples a group of completions, a reward function or verifier—rule-based or model-based—scores them, and the update increases probability for completions that perform better relative to their group. GRPO removes the learned value model used by PPO-style training; it does not remove on-policy sampling, reward design, KL control, or reward-hacking risk.

### Group-relative update

```text
prompt
  → sample G completions from current policy
  → score each completion
  → normalize rewards inside the group
  → update with clipped objective and reference-policy constraint
```

Suppose a math prompt produces eight completions. Six fail the final-answer check, one reaches the right answer through invalid formatting, and one is correct and well formed. Outcome and format rewards rank that sampled group. The normalized advantage says which trajectories were better than their peers; it is not a calibrated probability that one response is globally correct.

The absence of a critic reduces model-state memory and one source of estimation error. Group estimates can still be noisy, especially when every sampled completion receives nearly the same reward. More samples improve comparison but increase generation cost.

### Reward boundary

GRPO works best when rewards are hard to game and cheap to verify: exact math answers, executable tests, schema checks, or constrained simulators. A style judge or underspecified reward can reward verbosity, shortcuts, or artifacts that do not generalize.

Use several gates:

- Keep held-out prompts and run target, general-capability, and safety evaluations.
- Inspect examples with high reward but poor human judgment.
- Measure reward distribution and group variance, not only average training reward.
- Test the final policy outside the environment and formatting assumptions used by the verifier.

### Evidence boundary

DeepSeekMath introduced GRPO and specifies its group-relative advantages, clipped policy objective, and KL regularization. DeepSeek-R1 reports a GRPO-based reasoning post-training pipeline and evaluations under its documented setup. Those papers support the mechanism and their stated experiments; they do not make undated prices, third-party hardware comparisons, or broad “best model” claims durable facts.

The method is useful when a stable verifier and repeatable rollout environment exist. It is not a substitute for good data governance, held-out evaluation, or deployment-level checkpoints.

## Preference alignment

Preference alignment trains models to prefer one completion over another for the same prompt. Preference data includes explicit instruction boundaries; those labels become the behavior target and therefore the strongest source of bias if the rubric is weak.

### Preference data

```text
prompt: user asks for a refund outside policy
chosen: explains limits and escalation
rejected: invents an exception and promises a refund
rubric: correctness, actionability, tone
```

Hold out prompts, not only response pairs, so evaluation tests generalization to new situations.

### RLHF

In the InstructGPT-style pipeline, human comparisons train a reward model. Reinforcement learning then updates the language-model policy to increase that learned reward while constraining drift from a reference policy. This supports online sampling from the current policy, but adds a reward-model lifecycle and reinforcement-learning instability.

Reward increases are not the product objective. The policy can exploit blind spots in the reward model, so held-out human evaluation and safety checks remain release gates.

### DPO

Direct Preference Optimization derives a classification-style objective from preference pairs and a reference policy. It avoids training a separate reward model and an online RL loop, making the pipeline simpler. It still depends on pair quality, reference choice, loss settings, and coverage; simpler does not mean immune to over-optimization or distribution shift.

Use DPO when a fixed preference set is already available and stable. Use online methods such as [[#GRPO]] when you need reward scoring over sampled candidates and can defend the verifier under shift.

Measure pairwise win rate with blinded raters, task correctness, refusal precision and recall, calibration, and safety slices. Keep a separate set for regressions in general capability. If response length differs, control or report it: raters and judges can prefer longer answers even when they are not more correct.

## When fine-tuning earns its cost

- The model understands the task but inconsistently follows a format or policy after good prompting and few-shot examples.
- The target behavior is easier to demonstrate than specify, and representative examples can be labeled consistently.
- A high-volume narrow task justifies distilling a larger model’s behavior into a smaller one.
- Long repeated instructions dominate context and inference cost, and training can encode that stable behavior.

Do not begin without a held-out evaluation set and a baseline from the exact base model. Training loss proves fit to training examples, not improvement on production behavior.

## Full fine-tuning

Full fine-tuning updates every model weight. Its memory footprint is not a fixed multiple of a published model size. Training may hold model weights, gradients, optimizer states, activations, temporary buffers, and communication shards, each at a precision chosen by the implementation. Adam-style optimizers can keep multiple state tensors; activation memory grows with batch size, sequence length, layer shape, and checkpointing policy. Quantization, mixed precision, ZeRO/FSDP sharding, CPU offload, and optimizer choice change each component.

Plan capacity from a component-level estimate for the exact model and training stack, then measure a short run. Reserve full tuning for cases where broader weight updates beat PEFT on held-out quality enough to justify distributed compute and a full derived checkpoint.

## Parameter-efficient fine-tuning

### LoRA

Low-Rank Adaptation freezes the base weights and trains low-rank update matrices in selected layers. The adapter is small, can be stored separately, swapped, or merged for serving. Separation improves recoverability: disabling the adapter restores base-model behavior because the original weights did not change.

That does not make an active LoRA adapter immune to catastrophic forgetting or regressions. The adapter changes the effective computation and can bias the deployed model away from general instruction following, safety behavior, or capabilities absent from narrow training data. Evaluate the base-plus-adapter system on both target and broad holdouts. “Frozen base” describes storage and update mechanics, not guaranteed behavior while the adapter is active.

### QLoRA

QLoRA stores the frozen base in 4-bit NormalFloat form and trains LoRA adapters through that quantized representation. The QLoRA paper reports fine-tuning models up to 65B parameters on a single 48 GB GPU under its stated configurations; that is evidence for those experiments, not a promise that any large model fits any consumer GPU.

Feasibility still depends on model architecture, sequence length, batch and accumulation settings, adapter targets, optimizer state, activation checkpointing, attention kernels, and available device memory. Quality must be verified for the chosen base, quantization settings, task, and evaluation set. Use a memory estimator and a short measured run before committing to hardware.

## Data

Data quality and coverage matter more than raw count.

- Match the production chat template, system role, tool schema, and output format exactly.
- Remove contradictory labels and near-duplicate examples that over-weight one phrasing.
- Cover ordinary cases, boundary cases, refusals, and negative examples in the proportions expected at inference.
- Keep a held-out split that is never used for training or prompt iteration.
- Record the base checkpoint, tokenizer, data version, hyperparameters, and adapter targets so the run is reproducible.

## Evaluation

Compare base and fine-tuned candidates on the same target set, a broad capability set, and safety guardrails. Report effect sizes by slice instead of only one average. A format gain that causes a reasoning or refusal regression is not a free improvement.

During training, validation loss and early stopping detect memorization, but shipping still depends on task metrics and production confirmation through [[Home/AI & ML/LLM/Evaluation/Online Evaluation and AB Tests|online evaluation and A/B tests]]. Keep the base checkpoint deployable so rollback is an operational action, not a retraining project.

## Pitfalls

**Injecting knowledge** — a model trained on a document corpus may reproduce facts but cannot guarantee retrieval, freshness, or citation. Store changing facts in RAG and train only the behavior for using them.

**Format mismatch** — different chat templates or tool schemas between training and serving teach a distribution the runtime never presents.

**Narrow-only evaluation** — target gains can hide losses in general reasoning, multilingual behavior, or safety. Evaluate the effective deployed model, including its active adapter.

**Capacity estimates from one multiplier** — model-file size is not training memory. Estimate weights, gradients, optimizer states, activations, and sharding separately for the actual configuration.

## Tradeoffs

| Approach | Main benefit | Main cost | Best fit |
| --- | --- | --- | --- |
| Prompting | Fast iteration, no training | Repeated context and inconsistent behavior | Most new tasks |
| RAG | Fresh, attributable knowledge | Retrieval and indexing system | Changing or private facts |
| LoRA | Small separable updates | Active adapter can still regress capabilities | Stable behavior on limited compute |
| QLoRA | Lower base-weight memory during tuning | Hardware fit and quality are configuration-specific | PEFT when full-precision base storage is the constraint |
| Full tuning | Broadest update capacity | Highest memory, compute, and checkpoint cost | Proven quality gap that PEFT cannot close |

## Questions

> [!QUESTION]- Why can LoRA still cause forgetting if the base weights are frozen?
> The deployed output comes from the base plus the adapter’s updates. Narrow adapter training can steer that effective model away from capabilities outside the training distribution. The frozen base makes rollback easy; it does not guarantee unchanged behavior while the adapter is enabled.

> [!QUESTION]- How should you estimate full fine-tuning memory?
> Account separately for weights, gradients, optimizer states, activations, temporary buffers, precision, and sharding. Sequence length, batch, checkpointing, and optimizer choice can move the total enough that a generic multiplier is not a safe capacity plan.

> [!QUESTION]- What does GRPO remove compared with PPO-style language-model training?
> It removes the separately learned value model by estimating relative advantage from a group of sampled completions. It retains policy sampling, reward computation, clipped updates, and a reference-policy constraint.

> [!QUESTION]- What is DPO’s operational advantage over reward-model RLHF?
> It trains directly from preference pairs without a separate learned reward model or online policy-optimization loop. The tradeoff is that it cannot explore and score fresh outputs during the update.

## References

- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) — the primary paper defining frozen base weights and trainable low-rank updates.
- [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314) — the primary 4-bit fine-tuning method and the hardware/configuration evidence behind its memory claims.
- [ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054) — primary decomposition of model-state memory and distributed partitioning.
- [DeepSeekMath](https://arxiv.org/abs/2402.03300) — the primary paper introducing GRPO and its objective.
- [DeepSeek-R1](https://arxiv.org/abs/2501.12948) — primary report for a GRPO-based reasoning post-training pipeline and its stated evaluation setup.
- [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347) — the primary clipped-policy optimization work that provides the comparison point for GRPO.
- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290) — the primary derivation and evaluation of preference training without a separate reward model.
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) — the primary InstructGPT SFT, reward-model, and RLHF pipeline.
- [Discovering Language Model Behaviors with Model-Written Evaluations](https://arxiv.org/abs/2212.09251) — primary evidence on behavioral evaluation and risks such as sycophancy that alignment must measure explicitly.
- [Fine-tuning guide](https://platform.openai.com/docs/guides/fine-tuning) — provider guidance on data preparation, supervised tuning, and evaluation.
- [Fine-tuning considerations](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/fine-tuning-considerations) — production decision framing for fine-tuning versus retrieval and prompting.
- [ByteByteGo source snapshot: DeepSeek one-pager](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/deepseek-1-pager.md) — the pinned secondary summary reconciled here by retaining the GRPO mechanism and excluding volatile cost, hardware, and benchmark comparisons.
