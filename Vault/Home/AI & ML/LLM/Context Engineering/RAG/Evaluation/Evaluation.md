---
title: RAG Evaluation
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Decomposes into retrieval, generation, and end-to-end layers so regressions isolate to one layer."
level:
  - "2"
priority: High
tags: [FolderNote]
publish: true
status: Done
qard-deck: "AI & ML"
qard-topic: "LLM/Context Engineering/RAG/Evaluation/Evaluation"
flashcard_uid: "4c492fb9"
---

RAG can fail before generation starts. It can also retrieve the right evidence and still produce a bad answer. Evaluation therefore separates retrieval from generation, then checks the finished system against the user's task. One blended quality score cannot show which part needs repair.

Retrieval metrics ask whether relevant chunks reached the model and whether they were ranked well. Generation metrics check that the answer uses those chunks faithfully. End-to-end evaluation looks at the actual outcome. The distinction matters because prompt changes cannot recover a document that retrieval never found, while another embedding model will not fix a generator that ignores clear evidence already in context.

```mermaid
flowchart LR
    Q[Query + Ground Truth] --> RM[Retrieval Metrics]
    Q --> GM[Generation Metrics]
    Q --> EM[End-to-End Metrics]
    RM --> D1[Did the right chunks arrive]
    GM --> D2[Is the answer faithful and correct]
    EM --> D3[Did the user task get solved]
```

A support bot may retrieve the correct policy and still misread its date constraint. Retrieval passes. Generation fails. Without separate scores, that defect looks like a search problem and sends work toward the wrong component.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: 03a585b9-616f-472a-a294-ac7bac300cb4 -->
> [!qard]- What do retrieval, response, and end-to-end evaluations each show about a RAG system?
> Each evaluation answers a different question, so separate results show where a RAG system failed rather than only that it failed.
> 
> | Evaluation | Question it answers | A failure points toward | What it cannot show |
> |---|---|---|---|
> | Retrieval | Was relevant evidence found, ranked well and selected for the context? | Indexing, chunking, query handling, search or ranking | Whether the answer then used good evidence correctly |
> | Response | Given the supplied evidence, is the answer grounded in it, relevant to the question and, when a reference exists, correct? | The prompt or the generator's use of the evidence | Whether better evidence existed and was missed |
> | End-to-end | Did the complete system meet the task's outcome criteria? | A user-visible miss somewhere in the pipeline | Which stage caused the miss |
> 
> Combined, the results localize a likely cause. A grounded answer built on poor or incomplete context points upstream to retrieval. Good context paired with a wrong answer points to generation.
> 
> Example: a support bot retrieves the correct policy but misreads its date constraint. Retrieval passes and the response check fails, so more search tuning cannot fix that answer.
> 
> Sources:
> - [RAG evaluators (Microsoft Foundry)](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators?view=foundry)

<!-- qard-id: c73e80bf-ab77-4bfc-b246-be9e3d11ce10 -->
> [!qard]- Which evaluation concerns are specific to RAG, and which can reuse general LLM evaluation methods?
> RAG adds retrieval to evaluation: whether relevant evidence was found, ranked well and supplied in sufficient quantity. Retrieval metrics that score against labeled relevance judgments need relevance labels that other LLM tasks do not. Reference-free retrieval evaluation does not use such labels. Answer-quality checks and the evaluation methods themselves are largely reusable.
> 
> | Aspect | Specific to RAG | Reusable from general LLM evaluation |
> |---|---|---|
> | What is measured | Retrieval relevance, ranking quality and whether the context covers the evidence an answer needs | Correctness, relevance to the question, safety and format. Groundedness also applies to any answer constrained by supplied text, such as a summary of a given document. |
> | Ground truth | For label-based retrieval metrics, relevance labels per query, which must allow several acceptable chunks or require a set of complementary ones | Reference answers and rubrics, built as for any task |
> | Methods | Ranked-retrieval metrics, such as Recall@k or nDCG, over those labels | Golden datasets, deterministic checks, LLM judges, human review and online evaluation of production traces |
> 
> Any evaluator must match the claim being measured. Its limits need checking, as do any labels it uses. A judge reused from another task is not automatically valid for a new one.
> 
> Sources:
> - [Built-in evaluators (Microsoft Foundry)](https://learn.microsoft.com/en-us/azure/foundry/concepts/built-in-evaluators)
> - [RAGAS: Automated Evaluation of Retrieval Augmented Generation (EACL 2024)](https://aclanthology.org/2024.eacl-demo.16.pdf)
> - [Evaluation types (LangSmith)](https://docs.langchain.com/langsmith/evaluation-types)

# References

- [RAGAS metrics reference](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)
- [RAG evaluators in Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/evaluation-evaluators/rag-evaluators)
