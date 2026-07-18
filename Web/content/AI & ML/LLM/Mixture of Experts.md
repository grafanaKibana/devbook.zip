---
publish: true
created: 2026-07-16T18:35:15.037Z
modified: 2026-07-16T18:35:15.038Z
published: 2026-07-16T18:35:15.038Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Sparse transformer layers that route each token through a subset of expert feed-forward networks.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

A sparse mixture-of-experts (MoE) model replaces some dense feed-forward layers with several expert networks and a learned router. For each token, the router activates only a small subset of experts and combines their outputs. This increases total parameter capacity without evaluating every expert for every token. It is internal model architecture, not the application-level decision to send a request to one model or another in [[Model Selection and Routing]].

## Token routing

```text
token hidden state
    → router scores experts
    → select top-k experts
    → dispatch token to those experts
    → combine weighted expert outputs
```

The router is trained with the model. If many tokens choose the same expert, that device becomes a bottleneck while other experts sit idle. Implementations therefore use capacity limits, load-balancing objectives or biases, token dropping or rerouting policies, and careful expert placement.

## What sparse activation saves

Sparse activation reduces feed-forward arithmetic relative to evaluating every expert. It does not remove the rest of the transformer, and it does not make total parameters disappear from deployment.

Distinguish three measurements:

- **Total parameters** affect checkpoint storage and how expert weights are placed across device memory.
- **Active parameters per token** approximate part of the arithmetic executed for a token.
- **Measured throughput and latency** include router work, token dispatch, all-to-all communication, batching, precision, kernels, and load imbalance.

A dense model can outperform a sparse model with a similar advertised active count when expert traffic is communication-bound. A well-placed MoE can deliver more learned capacity at manageable per-token compute. Neither conclusion follows from parameter counts alone.

## Capacity and communication

An expert capacity factor reserves room for more than the average token share. Too little capacity can drop or reroute tokens; too much wastes memory and compute. During distributed training or serving, tokens cross device boundaries to reach experts, making interconnect topology and expert placement part of model latency.

Batch shape matters. A large batch can distribute tokens more efficiently across experts, while low-latency small batches expose imbalance and communication overhead. Measure the exact serving regime rather than extrapolating from training throughput.

## DeepSeek architecture boundary

The DeepSeek-V3 report describes routed experts, shared experts, and an auxiliary-loss-free load-balancing strategy. DeepSeek-R1 uses that base architecture, while [[GRPO]] is part of its post-training process. Token routing and policy optimization solve different problems and should not be collapsed into one feature.

Use the primary technical report for architecture claims. Undated API prices, GPU totals, and benchmark tables from secondary comparisons mix different hardware, precision, prompts, and model versions and do not establish an MoE design tradeoff.

## Questions

> [!QUESTION]- Why is active parameter count not an inference-cost measurement?
> It omits dense layers, memory traffic, token dispatch, interconnect communication, batching, and expert imbalance. Measure throughput and latency on the target serving stack.

> [!QUESTION]- What failure does load balancing prevent?
> It prevents a few popular experts from exceeding capacity and becoming stragglers while other experts are underused. The balancing mechanism itself can trade specialization against even utilization.

## References

- [Switch Transformers](https://jmlr.org/papers/v23/21-0998.html) — primary sparse-expert work detailing routing, expert capacity, load balancing, and distributed cost.
- [GShard](https://arxiv.org/abs/2006.16668) — primary work on scaling sparsely gated MoE layers across devices.
- [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437) — primary report for routed and shared experts and its load-balancing design.
- [ByteByteGo source snapshot: DeepSeek one-pager](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/deepseek-1-pager.md) — the pinned secondary summary reconciled here by separating sparse architecture from GRPO and excluding incomparable product claims.
