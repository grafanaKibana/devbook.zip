---
publish: true
created: 2026-10-28T12:27:02.656Z
modified: 2026-10-28T12:33:02.628Z
published: 2026-10-28T12:33:02.628Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Decomposing complex tasks into multiple LLM calls for reliability and debuggability.
level:
  - "3"
priority: Medium
status: Done
qard-deck: AI & ML
qard-topic: LLM/Prompt Engineering/Prompt Composition
flashcard_uid: a52de874
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

1. Prompt generation: a model drafts a first prompt from a task description.
2. Prompt refinement: a model receives the current prompt plus failure cases and proposes an improved version.
3. Prompt evaluation: a model identifies weaknesses and likely failure modes in a prompt.

A refinement pass might start from this evidence:

- Initial prompt: "Summarize this incident report."
- Failure case: output misses timeline and root cause.
- Meta prompt request: "Rewrite this prompt so output must include timeline, root cause, and actions in JSON with required keys."
- Refined prompt outcome: required timeline and root-cause fields in a machine-checkable schema.

Meta prompting keeps a person in the revision loop. [[Automated Prompt Optimization]] turns the same candidate-and-evaluator idea into a search process that proposes and scores prompt variants without a manual edit at each step.

# Pitfalls

**Error propagation.** A bad extraction can corrupt every later step. If ERR-42 becomes `error_code: null`, the classifier may route the request as a general inquiry. A required-field check rejects the missing value and stops the chain when an intermediate contract fails. A confidence score is useful only when it has been calibrated against observed errors.

**Cross-step instruction smuggling.** A chain can copy hostile text into a later call where it is mistaken for an instruction. Delimiters help the model distinguish data from control text, but they are not a security boundary. System rules stay outside untrusted content, later calls receive the smallest structured fields possible, and downstream actions are constrained by ordinary authorization and validation.

**Meta-prompt overfitting.** A revision that fixes five remembered failures can break ordinary inputs. Evaluating every candidate on held-out examples can reveal that regression before release. The prompt is versioned with its evaluator, and a rollback threshold limits the impact of regressions the evaluation misses.

# Tradeoffs

| Choice | Prefer Option A | Prefer Option B |
| --- | --- | --- |
| Single prompt vs prompt chaining | Single prompt for low-risk tasks where latency and cost matter most | Prompt chaining for high-stakes tasks that need step-level control and debuggability |
| Generated knowledge prompting vs direct answer prompting | Generated knowledge for evaluated, low-risk tasks where an explicit scaffold helps | Direct answer prompting when the task is simple or facts must come from trusted context |
| Manual prompt edits vs meta prompting | Manual edits for stable prompts with clear, isolated issues | Meta prompting for fast iteration with concrete failure examples to optimize against |

# Questions

<!-- qard-id: 891d3fd3-1b89-4b8c-a92d-679c7e978ad5 -->

> [!qard]- When is prompt chaining a better fit than one large prompt?
> Prompt chaining fits better when a task has real stages and an intermediate result must be checked before later work can trust it, or when that result determines what happens next. One prompt fits better when no intermediate result needs separate treatment. Each extra call adds latency, token cost and another boundary where errors can propagate.
>
> A chain earns its cost only when its boundaries are real:
>
> - Each stage has one narrow job and an explicit output contract, such as entities as JSON or an intent label from a closed set.
> - A deterministic check runs before the next stage uses that output. A missing required field or an unknown label stops the chain instead of corrupting later steps.
> - Failures can be localized, because each stage's input and output can be inspected separately.
>
> For example, a support assistant extracts entities, validates them against a schema, classifies intent into an allowed set and only then writes the reply. If the error code `ERR-42` comes back as `error_code: null`, a required-field check stops the chain. Without that check, the classifier may route the request as a general inquiry.
>
> Splitting one vague prompt into several vague prompts adds failure points without adding control. For that reason, the complete chain is evaluated end to end against a simpler single-prompt baseline.
>
> Sources: [Anthropic, Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) · [OpenAI evals](https://developers.openai.com/api/docs/guides/evals)

<!-- qard-id: 637042dc-8641-4fbe-9f1a-25620b16a717 -->

> [!qard]- What is a practical meta-prompting workflow for improving a weak prompt?
> A practical workflow treats a model-drafted prompt revision as a candidate that must beat the current prompt on held-out cases before it ships.
>
> 1. **Collect failures:** the starting evidence is observed failures from real outputs, such as incident summaries that omit the timeline and root cause.
> 2. **Group by cause:** failures are grouped by likely cause, such as a missing output requirement or an ambiguous instruction. One revision then targets a cause instead of patching single cases.
> 3. **Draft a candidate:** a model receives the current prompt, the grouped failures and the required output contract, and proposes a revision. In the incident example, the revision can require `timeline`, `root_cause` and `actions` as mandatory JSON keys.
> 4. **Compare on held-out cases:** the candidate and the current prompt are both scored on the known failures and on representative cases that were not used to write the revision.
> 5. **Version and gate:** the prompt is versioned together with its evaluator, and a rollback threshold is set before deployment.
>
> The held-out comparison is the check for meta-prompt overfitting, where a revision fixes the remembered failures but silently breaks ordinary inputs. It can reveal that regression before release, which reduces the risk without ruling it out. Inputs that the evaluation set does not represent can still regress, so the rollback threshold limits the damage after deployment. A model-drafted revision is a hypothesis to test, not a reliability guarantee.
>
> Sources: [OpenAI model optimization](https://developers.openai.com/api/docs/guides/model-optimization) · [OpenAI evals](https://developers.openai.com/api/docs/guides/evals)

# References

- [Prompt Chaining - Prompt Engineering Guide](https://www.promptingguide.ai/techniques/prompt_chaining)
- [Generated Knowledge Prompting for Commonsense Reasoning (Liu et al., 2022)](https://arxiv.org/abs/2110.08387)
