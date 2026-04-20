# Week 01 — LLM and RAG Foundations
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Next: [[Hackathon - Senior AI Engineering Training Plan - Week 02 - Evaluation-First AI Engineering]]

## Goal

Build the first working slice of the `Support Copilot Platform`: a small, grounded RAG flow that can answer one realistic support question with citations. The week is successful when you understand the pipeline end to end and can explain why each stage exists.

## Weekly Outcome

By the end of the week, you should have a narrow but real RAG slice for the `Support Copilot Platform` that can ingest a small support corpus, retrieve grounded context, answer a support question with citations, and refuse when the evidence is missing. You should also have written artifacts that explain your chunking assumptions, retrieval contract, and first known failure modes.

## Task Checklist

- [ ] Pick one narrow support domain, for example product documentation, support policies, or release notes.
- [ ] Create a corpus manifest with document name, source, version, and intended use.
- [ ] Define 5 to 8 realistic user questions, including at least 1 unsupported question.
- [ ] Document chunking assumptions, including chunk size, overlap, and what counts as a citation boundary.
- [ ] Implement an ingestion path that extracts text and stores retrieval metadata.
- [ ] Generate embeddings for the first corpus and persist document, chunk, and version identifiers.
- [ ] Implement `POST /copilot/ask` with grounded response output.
- [ ] Return citations that point back to document title, section, and version where possible.
- [ ] Save 3 example request and response pairs, one correct answer, one weak retrieval, one refusal.
- [ ] Write a short note on the top 3 failure modes you observed, not the ones you imagine.

## Suggested Session Plan

### Session 1, scope and corpus definition

- Pick the smallest support domain that still feels real.
- Create the initial corpus manifest.
- Write the first question set, including at least one question the system should refuse.
- Decide what counts as a valid citation before you write the answer path.

### Session 2, ingestion and chunking

- Build or refine the ingestion command.
- Normalize document metadata, especially version and source fields.
- Chunk the corpus conservatively and review chunks manually.
- Record why your chunking strategy should work for support content.

### Session 3, retrieval and API slice

- Create embeddings and persist retrieval data.
- Implement the retrieval path and inspect the top results for 3 to 5 queries.
- Add `POST /copilot/ask`.
- Make the response payload include answer text, citations, and a simple confidence or evidence status.

### Session 4, evidence quality and refusal behavior

- Test answerable and unsupported questions.
- Check whether the answer wording stays grounded in the retrieved text.
- Add refusal behavior when the evidence is missing or weak.
- Save example payloads that you can show in a review.

### Session 5, architecture and review

- Draw one request path sketch from API to retrieval to answer generation.
- Write down the top retrieval or chunking failures you saw.
- Do one short system-design rep for the request path.
- Close the week with a demo and a short retrospective.

## Suggested Steps

### Step 1 — Lock scope before coding

- Pick one narrow support domain: product docs, runbooks, release notes, or internal FAQ.
- Limit the initial corpus to something you can inspect manually.
- Define the first question types up front: factual lookup, policy clarification, and "not enough context" refusal.

### Step 2 — Build the first RAG path

- Load documents into one ingestion pipeline.
- Chunk them conservatively; optimize for understandable citations before optimizing for recall.
- Generate embeddings and persist retrieval metadata.
- Implement a single `POST /copilot/ask` path with grounded answer output.

### Step 3 — Add proof, not polish

- Save one request and one successful response with citations.
- Keep logs simple but readable.
- Record what would obviously break next: weak chunks, poor corpus coverage, missing refusal logic.

## Implementation Tasks

Focus the implementation on the `Support Copilot Platform`, not on a generic notebook prototype.

- Create a support corpus manifest file that captures document ID, product area, source URL or path, version, and last-updated date.
- Add an ingestion command that can be rerun safely without duplicating chunks.
- Store chunk metadata that will matter later in debugging, especially document version, section title, and chunk order.
- Define the `POST /copilot/ask` request and response contract, including question text, optional product scope, answer, citations, and refusal reason.
- Add a retrieval inspection mode so you can see the top chunks returned for a query before tuning prompts.
- Write one prompt or answer template that explicitly says to answer only from retrieved evidence.
- Add a refusal branch for missing evidence instead of allowing unsupported synthesis.
- Capture one end-to-end demo request that another engineer could run without extra explanation.

## Deep Study

- Read [[Software Engineering/11 AI & ML/LLM/RAG/RAG|RAG]] for the full pipeline shape.
- Use [[Software Engineering/11 AI & ML/LLM/Embeddings|Embeddings]] to reason about what the retriever can and cannot match.
- If chunking becomes the first failure mode, skim [[Software Engineering/11 AI & ML/LLM/RAG/Chunking|Chunking]].

## Resource Pack

### Internal notes

- [[Software Engineering/11 AI & ML/LLM/RAG/RAG|RAG]]
- [[Software Engineering/11 AI & ML/LLM/Embeddings|Embeddings]]
- [[Software Engineering/11 AI & ML/LLM/RAG/Chunking|Chunking]]

### External docs

- [Azure advanced RAG guidance](https://learn.microsoft.com/en-us/azure/developer/ai/advanced-retrieval-augmented-generation), practical guidance on chunking, alignment, update strategy, and retrieval design.
- [OpenAI embeddings guide](https://platform.openai.com/docs/guides/embeddings), reference for embedding usage, similarity workflows, and implementation constraints.
- [Azure AI Search vector relevance overview](https://learn.microsoft.com/en-us/azure/search/vector-search-ranking), useful for understanding how vector retrieval quality and ranking behavior affect grounded support answers.

## Build Plan

- Create one small corpus manifest.
- Implement one ingestion command or job.
- Implement one retrieval path.
- Return citations in the response payload.
- Save one README section explaining the pipeline in plain English.

Concrete outputs for the week:

- API contract for `POST /copilot/ask`
- corpus manifest
- one architecture sketch
- one successful grounded demo request

## System Design Drill

Use a 45-90 minute drill with this exact frame:

- Input: a user asks a support question.
- Path: API → retrieval → answer generation → citations.
- Failure cases: no relevant docs, wrong doc version, too much context, no clear citation.
- Tradeoff to explain: simple synchronous ingestion now versus more complex async indexing later.

## DSA Plan

- Solve 1 hash map / set problem.
- Solve 1 binary search or interval problem.
- After each one, write a 2-3 line note on where the pattern appears in the Support Copilot Platform.

## Best Practices

- Optimize for explainability before quality tuning.
- Keep the first corpus intentionally small.
- Treat citations as a product requirement, not an optional embellishment.
- Prefer one clean happy path over premature support for many edge cases.
- Review retrieved chunks manually before changing prompts.
- Keep document versioning visible from day one, stale support guidance is worse than no answer.

## Common Mistakes

- Starting with too much data.
- Tuning prompts before you understand retrieval quality.
- Hiding missing evidence behind overconfident answer wording.
- Treating week 1 like a benchmark competition instead of a pipeline bootstrap.

## Useful Links

- [[Software Engineering/11 AI & ML/LLM/RAG/RAG|RAG]]
- [[Software Engineering/11 AI & ML/LLM/Embeddings|Embeddings]]
- [[Software Engineering/11 AI & ML/LLM/RAG/Chunking|Chunking]]
- [Azure RAG guidance](https://learn.microsoft.com/en-us/azure/developer/ai/advanced-retrieval-augmented-generation)
- [OpenAI embeddings guide](https://platform.openai.com/docs/guides/embeddings)

## Review and Checkpoint

Use these prompts at the end of the week:

- Can I explain why each stage exists, ingestion, chunking, embeddings, retrieval, answer generation, citations?
- Which 2 to 3 queries retrieved the wrong chunks, and what exactly caused the miss?
- If a support answer is wrong, can I tell whether the root cause was bad corpus coverage, bad chunking, bad retrieval, or bad answer generation?
- Are the citations specific enough that a support engineer could verify them quickly?
- Does the system refuse when evidence is weak, or does it still sound confident?
- If I had one extra day, would I improve corpus quality, chunking, or retrieval inspection first, and why?

## Definition of Done

- You can demo one grounded ask flow.
- The answer includes citations.
- You can explain ingestion, chunking, embeddings, retrieval, and answer generation without hand-waving.
- You saved one artifact another engineer could review quickly.
