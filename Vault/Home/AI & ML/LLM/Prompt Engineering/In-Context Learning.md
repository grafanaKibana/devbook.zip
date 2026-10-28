---
topic: [AI & ML]
subtopic: [LLM]
summary: "An LLM adapting to a task from prompt examples without weight updates."
level: ["3"]
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

- Separators, casing, and field order stay consistent across examples.
- The set covers real decision boundaries, including classes that are easy to confuse.
- A few representative examples are more useful than many near-duplicates.
- More than one ordering is tested because later examples can receive disproportionate influence.
- Demonstrations are added for format or boundary failures. They cannot supply missing external facts reliably.

# Limitations

- Long dependency chains and global constraints can remain brittle even with good examples.
- Demonstrations condition behavior. They are not a reliable store for facts absent from the model and prompt.
- Long example blocks leave less context for the request and its source material.
- A model upgrade, reordered example, or formatting change can move quality enough to require reevaluation.

When this pattern is not enough for reasoning-heavy tasks, [[Reasoning Techniques]] covers the next options.

# Pitfalls

## Recency Bias in Example Ordering

The last example can pull outputs toward a rare edge case.

Several fixed orderings are tested against the same evaluation set. Randomizing order in production can reduce systematic position bias, but it also makes failures harder to reproduce, so that tradeoff is measured before randomization is enabled.

## Adding More Shots Instead of Fixing the Root Cause

Inconsistent output often comes from ambiguous instructions or mismatched example formats. Adding more examples can amplify both problems.

The schema is normalized first. Another shot is added only when evaluation shows a missing case rather than a broken contract.

## Context Window Pressure

A long demonstration block can crowd out the document or conversation being processed. The failure may appear as truncation, lost instructions, or weak attention to earlier content.

The fixed token cost of the prompt is measured, and context is reserved for the largest supported input and output. When that budget no longer fits, demonstrations are shortened or retrieved.

# Tradeoffs

| Approach | Token cost | Format control (heuristic) | External facts supplied by the technique | Use when |
|----------|-----------|---------------|-------------------|----------|
| Zero-shot | Minimal | Low | None | Simple, well-specified tasks. Instruction-tuned models |
| One-shot | Low | Medium | None | Format is inconsistent. One example clarifies the schema |
| Few-shot (3-5) | Medium | High | None | Ambiguous class boundaries. Complex output structure |
| Fine-tuning | High (training) | Very high | No reliable external source | Stable behavior at scale. Examples cannot fit in context |
| RAG + zero-shot | Medium (retrieval) | Low | Yes (external docs) | Task requires external knowledge not in model weights |

The facts column describes only the evidence that each technique supplies automatically. Shot count describes only the number of demonstrations, so trusted documents supplied separately can accompany a zero-shot, one-shot or few-shot prompt. The format-control ratings are heuristics that require validation on the target model and task. Neither examples nor fine-tuning enforce a schema, so a strict output shape still needs structured outputs or schema validation.

Zero-shot is the starting baseline. One example is added for a stubborn output contract, and further demonstrations only for measured boundary failures. Fine-tuning fits stable behavior at scale. Retrieval fits tasks that need external facts.

# Questions

<!-- qard-id: c88469f4-babd-4f11-9181-de7a49f1a0f7 -->
> [!qard]- When should a prompt move from zero-shot to one-shot or few-shot?
> A prompt moves beyond zero-shot only when evaluation shows a gap that examples can close. Each added example stays only if it improves results on a representative evaluation set.
>
> 1. **Zero-shot:** instructions without examples. This is enough when the instruction and allowed labels already define the task, and it is the cheapest baseline that later prompts must beat.
> 2. **One-shot:** one complete input-output pair. This fits when the task is understood but the output shape is not, such as JSON keys or field order.
> 3. **Few-shot:** several diverse examples. These fit when they show decision boundaries better than prose can, such as classes that are easy to confuse. Near-duplicate easy examples add tokens without adding information.
> 
> The evaluation gate matters because examples are not free. Each one consumes context on every request. Example choice, order and formatting can also change behavior, so a model upgrade or a reordering can require reevaluation. When inconsistent output comes from an ambiguous instruction or conflicting example formats, more examples can amplify the problem, so fixing the instruction and format comes first.
>
> Examples make a format likely, not guaranteed. A strict output shape still needs structured outputs or schema validation.
>
> Sources: [Min et al., Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837) · [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

<!-- qard-id: 72a29801-08d8-4f28-a17b-c5049c397cfc -->
> [!qard]- How does in-context learning work, and how does it differ from fine-tuning and retrieval?
> In-context learning adapts a pretrained model to a task through instructions and examples placed in the prompt. The model still predicts the next token, and the examples shift that prediction by showing the task structure, the label space and the output format. No weights change, so the effect applies only to requests that include the examples.
>
> | Aspect | In-context learning | Fine-tuning | Retrieval |
> |---|---|---|---|
> | What changes | The prompt of one request. | The model's weights, through a training run. | The context, filled at request time with passages from an external store. |
> | What it mainly supplies | How to perform the task: format, labels and boundary cases. | Stable learned behavior that no longer has to fit in every prompt. | Evidence the model lacks, such as current or private documents. |
> | How long the effect lasts | Only while the examples are in the prompt. | Until the model is retrained or replaced. | It reflects whatever the index contains when the request runs. |
> | Main cost | Context tokens on every request, plus sensitivity to example choice and order. | Training data, training runs and a model lifecycle to maintain. | Indexing and retrieval quality; poor retrieval caps answer quality. |
>
> The mechanisms combine: one prompt can contain retrieved passages and a few examples and be sent to a base or fine-tuned model. Examples are still not a reliable substitute for current or private source material, because they demonstrate behavior rather than serving as a dependable store of facts.
>
> Sources: [Brown et al., Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) · [Min et al., Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837) · [OpenAI prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering)

<!-- qard-id: 10d2fab2-81ed-4276-8775-ea307e40ec1b -->
> [!qard]- What can few-shot examples clarify, and what problems do they not solve?
> Few-shot examples clarify how a task should be performed. They show the output format, the allowed labels, conventions such as casing and field order, and the boundary between easily confused cases. They are not a dependable source of facts and cannot enforce permissions or runtime limits. Their own effect also depends on how they are chosen.
>
> What they do not solve:
>
> - **Missing or changing facts:** examples condition the response to the current prompt without updating model weights. They demonstrate behavior, so they are not a reliable store for facts absent from the model and the supplied context. Current or private evidence comes from trusted context supplied with the request, such as provided documents or retrieved passages.
> - **Permissions and runtime limits:** prompt text cannot enforce authorization, budgets or loop termination in a multi-step workflow. Those controls run in the runtime, outside the model.
> 
> Their effect is also sensitive and costly. Example choice, format and order, as well as the model itself, can change the result, so a change to any of them needs reevaluation. A long example block also uses context needed for the request and its source material.
>
> Sources: [Min et al., Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837) · [OpenAI prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering)

# References

- [Brown et al. 2020 - Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)
- [Min et al. 2022 - Rethinking the Role of Demonstrations](https://arxiv.org/abs/2202.12837)
- [Prompt Engineering for Large Language Models (Eugene Yan)](https://eugeneyan.com/writing/prompting/)
