---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Decomposing complex tasks into multiple LLM calls for reliability and debuggability."
level:
  - "3"
priority: Medium
status: Done
publish: true
---

A single prompt is often the right design. It becomes the wrong one when a task contains intermediate decisions that must be checked before later work can trust them. Prompt composition splits those decisions across calls, adds context before an answer, or uses a model to revise the prompt itself.

The gain is control. A support workflow can expose whether extraction, classification, or response generation failed. The cost is another distributed system in miniature: more calls, more latency, and more boundaries where bad data or instructions can propagate.

# Prompt Chaining

Prompt chaining gives each call one narrow job and passes its output to the next. The chain becomes useful only when the boundaries are real: an intermediate result has a schema, can be validated, and changes what happens next. Splitting one vague prompt into three vague prompts merely triples the failure surface.

A support assistant might use three stages:

1. Extract key entities from the user message (product, error code, account tier).
2. Classify intent (billing issue, technical issue, account request).
3. Generate a response using validated entities and intent.

Deterministic checks belong between the calls. Extracted fields can be schema-validated, and an intent label can be rejected unless it belongs to a closed set.

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

# Generated Knowledge Prompting

Generated knowledge prompting asks the model to state relevant background knowledge before answering. Liu et al. (2022) feed those generated statements into a second prompt. Making the candidate facts explicit can help the final call use them consistently.

A commonsense question can be composed like this:

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

The first call might surface the fact that fewer strokes is better, giving the second call a useful scaffold. But generated knowledge is still model output. It is neither a citation nor verification. High-stakes workflows need trusted retrieved context or an external check.

# Meta Prompting

Meta prompting uses a model to draft or critique prompts. It is cheap search over a text artifact, especially when real failures show what the current prompt gets wrong.

Three uses recur:

1. Prompt generation: describe the task and ask the model to draft a first prompt.
2. Prompt refinement: provide the current prompt plus failure cases and ask for an improved version.
3. Prompt evaluation: ask the model to identify weaknesses and likely failure modes.

A refinement pass might start from this evidence:

- Initial prompt: "Summarize this incident report."
- Failure case: output misses timeline and root cause.
- Meta prompt request: "Rewrite this prompt so output must include timeline, root cause, and actions in JSON with required keys."
- Refined prompt outcome: required timeline and root-cause fields in a machine-checkable schema.

Meta prompting keeps a person in the revision loop. [[Automated Prompt Optimization]] turns the same candidate-and-evaluator idea into a search process that proposes and scores prompt variants without a manual edit at each step.

# Pitfalls

**Error propagation.** A bad extraction can corrupt every later step. If ERR-42 becomes `error_code: null`, the classifier may route the request as a general inquiry. Reject missing required fields and stop the chain when an intermediate contract fails. A confidence score is useful only when it has been calibrated against observed errors.

**Cross-step instruction smuggling.** A chain can copy hostile text into a later call where it is mistaken for an instruction. Delimiters help the model distinguish data from control text, but they are not a security boundary. Keep system rules outside untrusted content, pass the smallest structured fields possible, and constrain downstream actions with ordinary authorization and validation.

**Meta-prompt overfitting.** A revision that fixes five remembered failures can break ordinary inputs. Evaluate every candidate on held-out examples, version the prompt with its evaluator, and keep a rollback threshold.

# Tradeoffs

| Choice | Prefer Option A | Prefer Option B |
| --- | --- | --- |
| Single prompt vs prompt chaining | Single prompt for low-risk tasks where latency and cost matter most | Prompt chaining for high-stakes tasks that need step-level control and debuggability |
| Generated knowledge prompting vs direct answer prompting | Generated knowledge for evaluated, low-risk tasks where an explicit scaffold helps | Direct answer prompting when the task is simple or facts must come from trusted context |
| Manual prompt edits vs meta prompting | Manual edits for stable prompts with clear, isolated issues | Meta prompting for fast iteration with concrete failure examples to optimize against |

# Questions

> [!QUESTION]- When is prompt chaining a better fit than one large prompt?
> Chaining fits when a task has real stages and an intermediate result changes what should happen next. Each stage should have a clear output contract, so invalid data can be stopped before it reaches the following call and failures can be traced to one step. That control has to justify the extra latency, token cost, and risk of errors passing between calls. If the task is simple and no intermediate result needs separate validation, one prompt is usually easier to operate.

> [!QUESTION]- What is a practical meta prompting workflow for improving a weak prompt?
> A useful workflow starts with real failures rather than a general request to make the prompt better. Group the failures by cause, then ask for a revision that addresses those causes and states a clear output contract. Compare the candidate with the current prompt on held-out cases, not only on the examples used to create it. Version the prompt and evaluator together, and keep a rollback threshold in case the revision fixes known failures but hurts normal inputs.

# References

- [Prompt Chaining - Prompt Engineering Guide](https://www.promptingguide.ai/techniques/prompt_chaining)
- [Generated Knowledge Prompting for Commonsense Reasoning (Liu et al., 2022)](https://arxiv.org/abs/2110.08387)
