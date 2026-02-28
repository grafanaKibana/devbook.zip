---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/prompting/prompt-composition/","noteIcon":"3"}
---


# Intro

Complex tasks can exceed what a single prompt handles reliably, especially when correctness depends on intermediate decisions. Prompt composition techniques can improve reliability by decomposing work into multiple LLM calls, enriching context before answering, or iteratively improving prompts. In practice, this often gives better quality control because each stage has a narrow purpose and can be checked before moving on. Three common patterns are prompt chaining (sequential decomposition), generated knowledge prompting (self-supplied context), and meta prompting (prompt improvement using an LLM).

## Prompt Chaining

Prompt chaining breaks a complex task into simpler subtasks, where each step output becomes input to the next step. The mechanism is straightforward: each prompt has a smaller scope, so the model has less room to drift; then you validate intermediate outputs before they affect the final answer.

Concrete example for a support assistant:

1. Extract key entities from the user message (product, error code, account tier).
2. Classify intent (billing issue, technical issue, account request).
3. Generate a response using validated entities and intent.

You can add deterministic checks between steps, such as schema validation for extracted fields or allowlists for intent labels.

```text
Step 1 prompt:
Extract entities from this message into JSON with keys product, error_code, account_tier.
Message: "My ProPlan account shows ERR-42 when exporting invoices."

Step 2 prompt:
Classify intent as one of: billing_issue, technical_issue, account_request.
Use only the extracted entity JSON.

Step 3 prompt:
Write a support response using the intent label and entities.
Constraints: 4-6 sentences, include one next action.
```

```mermaid
flowchart LR
    A[User message] --> B[Step one extract entities]
    B --> C[Deterministic check entity schema]
    C --> D[Step two classify intent]
    D --> E[Deterministic check allowed labels]
    E --> F[Step three generate response]
```

## Generated Knowledge Prompting

Generated knowledge prompting (sometimes paraphrased as generate knowledge prompting) asks the model to produce relevant background facts before answering the main question. In Liu et al. (2022), the generated facts are then fed back into the answer prompt. The mechanism is that parametric knowledge becomes explicit text in the prompt context, which can make final reasoning more reliable than relying on implicit recall alone.

Concrete example with commonsense reasoning:

- Question: "In golf, does the winner usually have the highest total strokes?"
- Knowledge generation step: "List short facts about how golf scoring works."
- Final answer step: answer the question using only generated knowledge.

```text
Knowledge generation prompt:
List 5 short factual statements about golf scoring.

Final answer prompt:
Question: In golf, does the winner usually have the highest total strokes?
Use only the statements you generated above. Answer yes or no, then explain in 2 sentences.
```

In practice, this can improve accuracy because the model first surfaces a factual scaffold like "fewer strokes is better" and then answers against that scaffold. The risk is that generated knowledge can be wrong or partially hallucinated, so for high-stakes outputs pair this pattern with externally verified context that you provide.

## Meta Prompting

Meta prompting uses an LLM to write, critique, or improve prompts themselves. The mechanism is that prompts are plain text artifacts, so the model can analyze them for ambiguity, missing constraints, or weak output requirements.

Common patterns:

1. Prompt generation: describe the task and ask the model to draft a first prompt.
2. Prompt refinement: provide the current prompt plus failure cases and ask for an improved version.
3. Prompt evaluation: ask the model to identify weaknesses and likely failure modes.

Concrete prompt refinement example:

- Initial prompt: "Summarize this incident report."
- Failure case: output misses timeline and root cause.
- Meta prompt request: "Rewrite this prompt so output must include timeline, root cause, and actions in JSON with required keys."
- Refined prompt outcome: stricter instructions, explicit schema, and a stronger completion criterion.

This page covers the human-guided version. For fully automated loops, see [[Software Engineering/11 AI & ML/LLM/Prompting/Automated Prompt Optimization\|Automated Prompt Optimization]].

## Pitfalls

- Chaining error propagation: a bad extraction in step one can corrupt every downstream step because later prompts trust earlier outputs; mitigate with schema checks, confidence thresholds, and fail-fast stop rules.
- Cross-step instruction smuggling: untrusted user text can be carried into later prompts and treated as instructions instead of data; mitigate by strict delimiting, quoting intermediate artifacts, and role separation between system rules and user content.
- Meta prompting overfitting: prompt revisions can become tuned to a small failure set and regress on unseen inputs; mitigate with held-out evaluation sets and prompt versioning before promotion.

## Tradeoffs

| Choice | Prefer Option A | Prefer Option B |
| --- | --- | --- |
| Single prompt vs prompt chaining | Single prompt for low-risk tasks where latency and cost matter most | Prompt chaining for high-stakes tasks that need step-level control and debuggability |
| Generated knowledge prompting vs direct answer prompting | Generated knowledge prompting when the model tends to miss background facts | Direct answer prompting when the task is simple and stable |
| Manual prompt edits vs meta prompting | Manual edits for stable prompts with clear, isolated issues | Meta prompting for fast iteration when you have concrete failure examples to optimize against |

## Questions

1. When should you choose prompt chaining instead of a single large prompt?
   - Expected answer:
     - Choose chaining when the task has clear stages with different goals.
     - Use chaining when intermediate validation reduces business or safety risk.
     - Prefer chaining when you need step-level observability for debugging.
     - Accept the latency and token overhead when reliability matters more than speed.
     - Use a single prompt for simple, low-risk tasks with stable behavior.
   - Why: this tests whether the engineer can trade off latency and cost against controllability and reliability.

2. What is the main risk of generate knowledge prompting, and how do you mitigate it?
   - Expected answer:
     - The generated background facts can be wrong or fabricated.
     - Treat generated facts as untrusted intermediate context.
     - Constrain the final prompt to use only explicit generated facts.
     - Validate critical claims against trusted context before final output.
     - Add abstain or reject behavior when facts are inconsistent or low confidence.
   - Why: this checks production judgment, not just technique familiarity.

3. What is a practical meta prompting workflow for improving a weak prompt?
   - Expected answer:
     - Collect real failures and cluster them by error type.
     - Ask the model to critique the current prompt against those failures.
     - Request a revised prompt with explicit constraints and output schema.
     - Evaluate on a held-out test set, not only the examples used for revision.
     - Version prompts and keep rollback criteria if quality regresses.
   - Why: this verifies iterative prompt engineering discipline and evaluation mindset.

## References

- [Prompt Chaining - Prompt Engineering Guide](https://www.promptingguide.ai/techniques/prompt_chaining)
- [Generated Knowledge Prompting - Prompt Engineering Guide](https://www.promptingguide.ai/techniques/knowledge)
- [Meta Prompting - Prompt Engineering Guide](https://www.promptingguide.ai/techniques/meta-prompting)
- [Generated Knowledge Prompting for Commonsense Reasoning (Liu et al., 2022)](https://arxiv.org/abs/2110.08387)
- [Prompt Chaining for Complex Workflows - Anthropic Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts)
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Prompt Injection Attacks Against GPT 3 - Simon Willison](https://simonwillison.net/2022/Sep/12/prompt-injection/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM\|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Automated Prompt Optimization\|Automated Prompt Optimization]]
> - [[Software Engineering/11 AI & ML/LLM/Prompting/In-Context Learning\|In-Context Learning]]
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Reasoning Techniques\|Reasoning Techniques]]
<!-- whats-next:end -->
