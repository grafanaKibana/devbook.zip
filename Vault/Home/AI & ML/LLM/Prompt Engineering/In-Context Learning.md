---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "An LLM adapting to a task from prompt examples without weight updates."
level:
  - "3"
priority: Medium
status: Done
publish: true
qard-deck: "AI & ML"
qard-topic: "LLM/Prompt Engineering/In-Context Learning"
flashcard_uid: "a871bbf2"
---

In-context learning changes model behavior through examples in the prompt, without updating model weights. The model still predicts the next token at inference time. Demonstrations shift that prediction by establishing the task, label space, and expected output shape.

Shot count is only the visible control: zero-shot provides no example, one-shot provides one, and few-shot provides several. Example choice, order, and formatting often matter as much as count. Every demonstration also consumes context that could have held the actual input.

# Zero-Shot Prompting

Zero-shot prompting supplies instructions without a demonstration. It is the cheapest useful baseline because every later technique should beat it by enough to justify extra tokens and maintenance.

It works well when labels are clear, fields are explicit, or a transformation has a simple rule.

Instruction-tuned models are built to follow task descriptions, so they are generally stronger zero-shot baselines than base language models.

```text
Classify sentiment as Positive, Neutral, or Negative.

Text: "The battery life is acceptable, but the camera is disappointing."
Answer:
```

Typical output:

```text
Neutral
```

# One-Shot Prompting

One-shot prompting adds one complete input-output pair. A single example is often enough when the instruction is understood but the output schema is not.

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

# Few-Shot Prompting

Few-shot prompting adds several demonstrations. The set can show class boundaries and edge cases that prose describes poorly, but repeated easy examples mostly burn tokens.

Examples make the local task concrete. They expose the allowed labels, demonstrate the schema, and give the model a nearby pattern to continue.

Min et al. (2022) found that demonstration format, label space, and input distribution explain much of few-shot performance on the tasks they studied. Corrupting labels did less damage than a simple input-label mapping account would predict. Correct labels are still the only sensible production choice. The result shows how strongly the model uses structure around them.

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

# Building a Demonstration Set

- Keep separators, casing, and field order consistent.
- Cover real decision boundaries, including classes that are easy to confuse.
- Prefer a few representative examples over many near-duplicates.
- Test more than one ordering because later examples can receive disproportionate influence.
- Add demonstrations for format or boundary failures. They cannot supply missing external facts reliably.

# Limitations

- Long dependency chains and global constraints can remain brittle even with good examples.
- Demonstrations condition behavior. They are not a reliable store for facts absent from the model and prompt.
- Long example blocks leave less context for the request and its source material.
- A model upgrade, reordered example, or formatting change can move quality enough to require reevaluation.

When this pattern is not enough for reasoning-heavy tasks, continue with [[Reasoning Techniques]].

# Pitfalls

## Recency Bias in Example Ordering

The last example can pull outputs toward a rare edge case.

Test several fixed orderings against the same evaluation set. Randomizing order in production can reduce systematic position bias, but it also makes failures harder to reproduce. Measure that tradeoff before enabling it.

## Adding More Shots Instead of Fixing the Root Cause

Inconsistent output often comes from ambiguous instructions or mismatched example formats. Adding more examples can amplify both problems.

Normalize the schema first. Add another shot only when evaluation shows a missing case rather than a broken contract.

## Context Window Pressure

A long demonstration block can crowd out the document or conversation being processed. The failure may appear as truncation, lost instructions, or weak attention to earlier content.

Measure the fixed token cost of the prompt, then reserve context for the largest supported input and output. Shorten or retrieve demonstrations when that budget no longer fits.

# Tradeoffs

| Approach | Token cost | Format control | External facts | Use when |
|----------|-----------|---------------|-------------------|----------|
| Zero-shot | Minimal | Low | None | Simple, well-specified tasks. Instruction-tuned models |
| One-shot | Low | Medium | None | Format is inconsistent. One example clarifies the schema |
| Few-shot (3-5) | Medium | High | None | Ambiguous class boundaries. Complex output structure |
| Fine-tuning | High (training) | Very high | No reliable external source | Stable behavior at scale. Examples cannot fit in context |
| RAG + zero-shot | Medium (retrieval) | Low | Yes (external docs) | Task requires external knowledge not in model weights |

Start zero-shot. Add one example for a stubborn output contract, then add only the demonstrations that cover measured boundary failures. Fine-tuning fits stable behavior at scale. Retrieval fits tasks that need external facts.

# Questions

> [!qard]- How should a task move from zero-shot to one-shot or few-shot prompting?
> Use zero-shot when instructions and labels already define the task. Add one example when the main gap is output shape; use a few diverse examples when they clarify decision boundaries better than prose. Keep only examples that improve a representative evaluation set, because demonstrations consume context and can drift. Examples clarify output conventions; strict shape still needs schema enforcement or validation. [Min et al., Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837) · [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

> [!qard]- How does in-context learning work, and how does it differ from fine-tuning and retrieval?
> In-context learning conditions a pretrained model with examples in the prompt; inference uses them without updating model weights. Demonstrations can show task structure, label space, and output conventions. Fine-tuning changes weights, while retrieval supplies external evidence at request time. These mechanisms can be combined, but examples are not a reliable substitute for current or private source material. [Brown et al., Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) · [Min et al., Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837) · [Include relevant context information](https://developers.openai.com/api/docs/guides/prompt-engineering#include-relevant-context-information)

> [!qard]- What can few-shot examples clarify, and what problems do they not solve?
> Examples condition the model’s response to the current prompt; they do not update model weights or provide a dependable source for facts absent from supplied context. They also cannot enforce multi-step runtime limits. Example choice, format, order, and model can change behavior, while long examples use context needed for the request. Use retrieval for changing or private evidence and runtime controls for permissions or loop termination. [Min et al., Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837) · [OpenAI prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering)

# References

- [Brown et al. 2020 - Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)
- [Min et al. 2022 - Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837)
- [Prompt Engineering for Large Language Models (Eugene Yan)](https://eugeneyan.com/writing/prompting/)
