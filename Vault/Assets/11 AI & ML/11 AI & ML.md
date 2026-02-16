# AI & ML (Assets Entry Point)

This folder is for attachments. The actual notes live under `Vault/Software Engineering/11 AI & ML/`.

## Reading Path: ML Infrastructure

- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Infrastructure|Infrastructure]]
- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Online inference system design|Online inference system design]]
- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Latency and performance tuning for inference|Latency and performance tuning for inference]]
- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Model serving stack|Model serving stack]]
- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Deploying models and safe rollouts|Deploying models and safe rollouts]]
- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Online features and feature stores|Online features and feature stores]]
- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Observability for ML inference|Observability for ML inference]]
- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Capacity planning and autoscaling|Capacity planning and autoscaling]]
- [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Security and privacy for ML inference|Security and privacy for ML inference]]
- (Optional) [[Software Engineering/11 AI & ML/Machine Learning/Infrastructure/Vector search and RAG serving|Vector search and RAG serving]]

## Example

If you get asked: "Design an AI system that serves predictions under 100ms at scale", use this as a skeleton:

1. Define SLO (p95/p99), RPS, payload, regions, and timeouts
2. Draw the online path: API -> feature fetch -> model server -> policy
3. Allocate a latency budget per stage
4. Pick serving runtime (CPU/GPU, batching)
5. Plan rollouts (shadow + canary + rollback)
6. Add observability (tracing + p95 histograms + ML drift signals)

## Links

- [The Tail at Scale (paper)](https://research.google/pubs/pub40801/)
