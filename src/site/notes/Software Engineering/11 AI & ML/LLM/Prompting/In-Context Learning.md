---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/prompting/in-context-learning/"}
---


# Intro

In-context learning is the ability of an LLM to adapt to a task from the prompt context itself, without updating model weights. Mechanically, the model is still doing next-token prediction at inference time; the examples in the prompt change what token sequences are most probable next, so behavior changes without training. The key control is shot count: zero-shot (no examples), one-shot (one example), or few-shot (multiple examples). More shots can improve task steering, but they also consume context window budget.

## Zero-Shot Prompting

Zero-shot prompting asks the model to perform a task with no demonstrations, relying on instruction quality and prior training.

When it works well:
- classification with clear labels
- extraction with explicit fields
- transformations with deterministic rules

Instruction-tuned models (for example ChatGPT- and Claude-style assistants) usually perform much better in zero-shot settings than base next-token models because they were aligned to follow instructions.

```text
Classify sentiment as Positive, Neutral, or Negative.

Text: "The battery life is acceptable, but the camera is disappointing."
Answer:
```

Typical output:

```text
Neutral
```

## One-Shot Prompting

One-shot prompting is the minimal demonstration setting: one complete input-output example plus a new input to solve. Use it when zero-shot mostly works but output format or decision boundaries are still inconsistent.

```text
Extract entities from support messages.
Return JSON with keys: customer, issue, severity.

Input: "Tom reports typo in footer link on pricing page."
Output: {"customer":"Tom","issue":"footer link typo on pricing page","severity":"low"}

Input: "Ava cannot reset password after SSO migration. She is blocked from login."
Output:
```

Possible output:

```json
{"customer":"Ava","issue":"password reset fails after SSO migration","severity":"high"}
```

## Few-Shot Prompting

Few-shot prompting provides multiple demonstrations so the model can copy task structure, label space, and output format. In practice, a small number of examples often improves stability on noisier inputs compared with one-shot.

Why it works:
- examples define the allowed labels and schema
- examples teach output style more reliably than prose instructions alone
- examples give local task context that may override vague priors

Min et al. (2022) showed that demonstration format, label space, and input distribution can matter more than per-example label correctness. They report that randomly replacing labels in demonstrations often hurts less than expected, which suggests the model is strongly using structural cues from demonstrations.

```text
Extract entities from support messages.
Return JSON with keys: customer, issue, severity.

Input: "Maria says checkout crashes on payment step. Impact is high for all EU users."
Output: {"customer":"Maria","issue":"checkout crash on payment step","severity":"high"}

Input: "Tom reports typo in footer link on pricing page."
Output: {"customer":"Tom","issue":"footer link typo on pricing page","severity":"low"}

Input: "Ava cannot reset password after SSO migration. She is blocked from login."
Output:
```

Possible output:

```json
{"customer":"Ava","issue":"password reset fails after SSO migration","severity":"high"}
```

## Design Principles

- keep example formatting strictly consistent (same separators, casing, field order)
- cover the real label space in demonstrations, including edge classes
- prefer representative examples over many similar ones
- test ordering effects; recency can bias outputs toward later examples
- add examples when failures are about format or decision boundaries, not missing world knowledge
- if accuracy is unstable, first fix schema clarity and demonstration distribution before increasing shot count
- random labels in a consistent format can still help structure-following (Min et al., 2022), but use correct labels in production prompts for reliability and auditability

## Limitations

- few-shot can be brittle on tasks with long dependency chains or strict global constraints
- examples cannot inject knowledge the model does not have; they only condition behavior in-context
- long demonstration blocks consume context window and can reduce room for actual user input
- performance can be brittle across model versions, prompt order, and minor formatting changes

When this pattern is not enough for reasoning-heavy tasks, continue with [[Software Engineering/11 AI & ML/LLM/Prompting/Reasoning Techniques\|Reasoning Techniques]].

## Questions

> [!QUESTION]- When should you start with zero-shot versus few-shot?
> Expected answer:
> - Start zero-shot for simple, well-specified tasks (basic classification, extraction, rewrite).
> - Move to one-shot/few-shot when output format is inconsistent or class boundaries are ambiguous.
> - Use one-shot first for lightweight steering, then increase shots only if failure patterns persist.
> Why this matters: it minimizes prompt complexity and token cost while improving reliability only where needed.

> [!QUESTION]- What makes a good few-shot example set?
> Expected answer:
> - Consistent input and output structure.
> - Coverage of real label space and edge cases.
> - Examples representative of production distribution, not synthetic easy cases.
> - Minimal but sufficient count (often 1-5) to show mapping clearly.
> Why this matters: demonstration quality usually matters more than raw quantity.

> [!QUESTION]- What are the main failure modes of few-shot prompting?
> Expected answer:
> - Breakdown on tasks requiring multi-step reasoning.
> - Sensitivity to example order and formatting drift.
> - Context-window pressure from too many demonstrations.
> - Poor transfer when task needs external facts not present in model knowledge.
> Why this matters: these limits tell you when to pivot to other techniques instead of adding more shots.

## References

- [Prompt Engineering Guide - Zero-Shot Prompting](https://www.promptingguide.ai/techniques/zeroshot)
- [Prompt Engineering Guide - Few-Shot Prompting](https://www.promptingguide.ai/techniques/fewshot)
- [Brown et al. 2020 - Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)
- [Min et al. 2022 - Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837)
- [Anthropic Prompt Engineering Overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Prompt Engineering for Large Language Models (Eugene Yan)](https://eugeneyan.com/writing/prompting/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM\|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Automated Prompt Optimization\|Automated Prompt Optimization]]
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Prompt Composition\|Prompt Composition]]
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Reasoning Techniques\|Reasoning Techniques]]
<!-- whats-next:end -->
