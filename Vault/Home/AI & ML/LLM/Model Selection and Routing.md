---
topic: [AI & ML]
subtopic: [LLM]
summary: "Selecting and routing models from measured task quality, latency, reliability, and cost."
level: ["2"]
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "AI & ML"
qard-topic: "LLM/Model Selection and Routing"
flashcard_uid: "776eda2e"
---

Model selection decides which models are allowed to serve a workload. Routing makes the per-request choice among them. Frontier models often handle difficult tasks well. Smaller models are usually cheaper and faster. Neither tendency is a contract. A specialized model can win on a narrow task, while a frontier model can miss a latency SLA or regress after a provider update. Production selection is empirical: the least expensive candidate that clears the workload's quality, safety, reliability, and latency gates wins.

Application-level routing chooses between complete model deployments for each request. [[Home/AI & ML/LLM/LLM#Mixture-of-experts|Mixture-of-experts routing]] happens inside one sparse model and selects internal expert parameters token by token. The two mechanisms solve different cost and capacity problems.

# Selection Criteria

Every candidate needs the same versioned workload and constraints:

- **Task quality** — correctness, groundedness, tool-call success, and failure slices on the labeled set.
- **Latency** — p50 and p95 under the expected prompt size, output length, concurrency, and region.
- **Cost** — input, cached input, output, tool calls, and retry or escalation cost per successful task.
- **Capabilities** — required context, structured outputs, tools, modalities, and language coverage.
- **Safety and policy** — refusal behavior, data handling, residency, and provider terms.
- **Operations** — rate limits, uptime, version pinning, observability, and fallback behavior.

Public leaderboards are useful for shortlisting. Release evidence still comes from [[Home/AI & ML/LLM/Evaluation/Evaluation|evaluation]] on the distribution and rubric that define the product.

# Routing Patterns

## Deterministic Task Mapping

Known task classes can map to models in configuration: extraction goes to one candidate, complex synthesis to another, and image work to a multimodal model. Explicit task boundaries keep the policy auditable.

## Classifier Routing

A cheap classifier predicts task type or difficulty before generation, avoiding the cost of a failed first attempt. But a false “easy” decision can silently lower quality. Router evaluation therefore needs overall classification accuracy plus per-route recall for hard and safety-sensitive cases.

## Cascade

A cascade starts with a lower-cost model and escalates when an observable gate fails, such as schema validation, a groundedness check, calibrated confidence, or an explicit unsupported result.

```mermaid
flowchart LR
    Q[Request] --> S[Lower-cost model]
    S --> V{Quality gate passes?}
    V -->|Yes| O[Return result]
    V -->|No| F[Escalate to stronger model]
    F --> O
```

A cascade saves money only when the first attempt plus its escalations cost less than sending every request to the stronger model. Escalated traffic also pays extra latency. End-to-end p95 matters more than either model's isolated number.

# Router Evaluation

A labeled routing set starts with real traffic. Each request records which candidates pass the task rubric along with latency and full cost. That supports comparison against an oracle that always selects the cheapest passing model.

Router evaluation tracks these signals:

- End-to-end task success together with classifier accuracy.
- Hard-query miss rate and safety-sensitive miss rate.
- Escalation frequency and the cost of duplicate generation.
- p95 latency by route and after fallback.
- Drift when traffic, prompts, provider versions, or prices change.

Shadow evaluation runs alternative candidates without serving their answers. It provides fresh routing evidence before user-visible assignments change.

# Operations

One gateway boundary should own provider calls. Model identifiers, fallbacks, timeouts, and routing policy then stay in configuration instead of leaking into scattered conditionals. Operational records need the route decision, candidate version, gate result, latency, and safe token or cost metadata. Sensitive prompts and responses stay out by default.

Versions should be pinned where the provider allows it. A model change behind an alias invalidates earlier evidence and triggers evaluation again. Fallbacks carry the same capability and policy requirements. Availability alone does not make a model safe if it cannot honor the output contract.

# Pitfalls

**Frontier by default:** this hides missing task thresholds and can spend the most on traffic a smaller candidate already passes.

**Small by assumption:** low advertised cost means little when retries or human escalation raise the cost per successful task.

**Router accuracy as the goal:** a class label is only a proxy. The real objective is end-to-end task success within cost and latency constraints.

**Unmeasured cascade tails:** escalated requests pay for two generations and can dominate p95 latency.

**Provider aliases without regression gates:** silent model changes invalidate earlier routing evidence.

# Tradeoffs

| Strategy | Main benefit | Main cost | Good fit |
| --- | --- | --- | --- |
| One approved model | Simple operations | Pays one model’s tradeoffs for all traffic | Uniform workload or early product |
| Deterministic mapping | Auditable decisions | Rules drift as traffic changes | Clear task categories |
| Classifier router | One generation per request | Misrouting risk and calibration work | Predictable difficulty signals |
| Cascade | Observable second chance | Duplicate cost and tail latency | Cheap reliable failure gate |
| Fine-tuned specialist | Low serving cost on one task | Training and model lifecycle | Stable, high-volume narrow task |

# Questions

<!-- qard-id: ff4e82a3-bf2c-40e8-b0b3-e27753258ec9 -->
> [!qard]- How should candidate LLMs be compared for a production workload?
> Candidate LLMs are compared empirically. Every candidate runs on the same representative, versioned workload and is judged against the same gates for task quality, safety, latency and cost. A common decision rule then selects the least expensive candidate that clears every required gate.
>
> What the comparison measures:
>
> - **Task quality:** correctness, groundedness, tool-call success and failure slices, measured on a labeled set drawn from the product's own traffic and rubric.
> - **Safety and policy:** refusal behavior, data handling and provider terms.
> - **Latency:** p50 and p95 at the expected prompt size, output length and concurrency.
> - **Cost per successful task:** input, output and tool usage, plus retries and escalations. A model with a low price per token can still cost more per completed task if it often needs a retry or a human.
> - **Capabilities and operations:** required context length, structured outputs, tools, rate limits and version pinning.
> 
> Public leaderboards help build a shortlist, but they measure a different distribution and rubric. The evidence also expires. A change in traffic, prompts or prices invalidates earlier results, as does a new model version behind a provider alias, so the comparison is rerun when any of these occur.
>
> Sources: [OpenAI evals](https://developers.openai.com/api/docs/guides/evals) · [OpenAI model optimization](https://developers.openai.com/api/docs/guides/model-optimization)

<!-- qard-id: d37397ec-330a-4742-a8ef-22a28b395047 -->
> [!qard]- How do classifier routing and cascading differ when choosing an LLM for each request, and how can they be combined?
> A classifier router predicts which model should handle a request before anything is generated. A cascade generates with a lower-cost model first and escalates to a stronger model only when an observable check on that output fails.
>
> | Aspect | Classifier routing | Cascade |
> |---|---|---|
> | When the decision is made | Before generation, from request features such as task type or predicted difficulty. | After a first generation, from a gate on the output such as schema validation, a groundedness check, calibrated confidence or an explicit unsupported result. |
> | Generations per request | One, so no request pays for a discarded attempt. | One when the gate passes; at least two when the request escalates. |
> | Typical failure | A false “easy” prediction sends a hard request to a weaker model. Quality drops silently unless something downstream checks the answer. | Escalated requests pay for duplicate generation and extra latency, which can dominate p95. If many requests escalate, the cascade can cost more than always using the stronger model. |
> | What it depends on | Predictable difficulty signals, and a classifier evaluated on per-route recall for hard and safety-sensitive requests. | A cheap, reliable gate. A weak gate escalates too often or lets bad answers through. |
>
> **Combining them:** the classifier chooses the starting model, and a cascade gate checks that model's output. Requests predicted to be hard go straight to the stronger model. Requests predicted to be easy start on the cheaper model with the gate behind it. The gate then catches some misroutes that classifier routing alone would serve unnoticed.
>
> The combined policy is judged on end-to-end task success, cost per successful task and tail latency, not on classifier accuracy alone. Managed routers such as Microsoft Foundry Model Router package per-request model selection as a product feature, and they still need the same evaluation on the target workload.
>
> Sources: [FrugalGPT (Chen et al.)](https://arxiv.org/abs/2305.05176) · [Microsoft Foundry Model Router](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/model-router?view=foundry) · [OpenAI evals](https://developers.openai.com/api/docs/guides/evals)

# References

- [LiteLLM](https://docs.litellm.ai/)
