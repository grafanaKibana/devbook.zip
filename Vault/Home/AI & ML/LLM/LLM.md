---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "A transformer network trained on vast text to predict the next token, treated here as an engineering platform steered by prompting, grounding, and evaluation rather than a knowledge database."
tags:
  - FolderNote
publish: true
level:
  - '3'
priority: High
status: Done
---

# Intro

A large language model (LLM) is a transformer neural network trained on vast text corpora to predict the next token in a sequence. That single objective — next-token prediction at scale — is what produces the capabilities the rest of this section builds on: answering questions, summarizing, translating, writing code, and calling tools. Virtually all modern generative LLMs (GPT, Claude, Llama, Gemini) are **decoder-only** transformers: self-attention lets every token attend to all earlier tokens, so the model builds contextual meaning across the whole input before predicting what comes next. (Encoder-only transformers like BERT and encoder-decoder models like T5 exist, but they serve classification, [[Embeddings|embedding]], and translation workloads rather than open-ended generation.)

The engineering consequence: an LLM is not a knowledge database with retrieval semantics. It is a probability distribution over token sequences, shaped by training data and steered at inference time by the prompt. That is why grounding, [[Home/AI & ML/LLM/Prompting/Prompting|Prompting]], and [[Home/AI & ML/LLM/Evaluation/Evaluation|evaluation]] are engineering disciplines rather than nice-to-haves — see [[Hallucinations]] for what happens when fluent prediction is mistaken for factual recall.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## How LLMs Are Built

![07 AI & ML-LLM-20260705173634102.png](11%20AI%20&%20ML-LLM-20260705173634102.png)

Training a modern LLM is a three-stage pipeline. Each stage changes what the model is good at:

1. **Pretraining** — the model learns next-token prediction over trillions of tokens of web text, books, and code. The output is a **base model**: a powerful autocompleter that continues text plausibly but does not reliably follow instructions. Pretraining consumes the overwhelming majority of the compute budget. The result is a file of parameters (weights) that capture everything the model learned, loadable by any inference runtime.
2. **Supervised fine-tuning (SFT / instruction tuning)** — the base model is further trained on curated example conversations: instructions paired with high-quality responses. This teaches the model to behave as an assistant — to answer the question rather than continue the text. Ask a base model "What are LLMs?" and it may generate more questions in the same style; ask an instruction-tuned model and it answers.
3. **Preference alignment (RLHF / DPO)** — human raters compare candidate responses, and the model is optimized toward preferred outputs using Reinforcement Learning from Human Feedback or, increasingly, direct preference optimization methods. This stage shapes helpfulness, tone, and refusal behavior — and has a known failure mode: optimizing for human approval can reward confident, agreeable answers over accurate ones (see [[Hallucinations]] on sycophancy).

```text
Base model  =  pretraining (next-token prediction at scale)
Instruction-tuned model  =  base model + SFT + preference alignment (RLHF/DPO)
```

## Dictionary

Core terms used throughout this section, each linked to the note that covers it in depth:

- **Token** — the unit an LLM reads and produces; subword pieces, not words. Token counts determine context usage and API cost — a 1,000-word English text is typically 1,300+ tokens, and non-Latin scripts can need 2–3× more (see [[Natural Language Processing]] on tokenization).
- **Context window** — the maximum number of tokens the model can attend to in one request: system prompt, conversation history, retrieved evidence, and the response all share this budget. How models use long contexts unevenly is covered in [[Generation]].
- **Inference and sampling** — generating output token by token from the model's probability distribution; temperature, top-p, and the other knobs are covered in [[Generation]].
- **Embedding** — a dense vector representation of text where semantic similarity becomes geometric proximity; the foundation of semantic search and RAG. Covered in [[Embeddings]].
- **Base model vs instruction-tuned model** — a base model continues text; an instruction-tuned model follows instructions. Production systems almost always use instruction-tuned models.
- **Causal language model (CLM)** — a model trained to predict the *next* token from left-to-right context only. This is the GPT/Claude/Llama family — every generative LLM in this section.
- **Masked language model (MLM)** — a model trained to predict *masked-out* tokens using context from both directions (BERT-style encoders). MLMs power classification and embedding models, not open-ended generation — they cannot autoregressively produce text the way causal LMs do.
- **RLHF** — Reinforcement Learning from Human Feedback: optimizing a model against human preference comparisons. The standard third stage of LLM training, and the source of both improved helpfulness and the sycophancy failure mode.
- **Hallucination** — fluent, confident output unsupported by evidence or reality. Mechanisms, detection, and mitigation are covered in [[Hallucinations]].
- **NLP** — [[Natural Language Processing]], the broader field; LLMs are its current dominant tool.

## Questions

> [!QUESTION]- Why does "the model just predicts the next token" matter for system design?
> - Everything an LLM outputs is a high-probability continuation, not a fact lookup — fluency and truth are uncorrelated by default
> - This is why grounding (RAG, citations), output validation, and evaluation pipelines exist: they add the correctness guarantees that next-token prediction does not provide
> - It also explains prompt sensitivity: the prompt is not a query against a database, it is the conditioning context that reshapes the entire output distribution
> - Design rule: treat model output as untrusted, probabilistic input to the rest of the system — validate structure with schemas and content with checks

> [!QUESTION]- What is the practical difference between a base model and an instruction-tuned model?
> - A base model is an autocompleter: given "What are some famous social networks?" it may continue with more questions in the same style rather than answering
> - An instruction-tuned model has been trained on instruction-response pairs (SFT) and aligned with human preferences (RLHF/DPO), so it interprets input as a task to perform
> - Base models are used for further fine-tuning and research; instruction-tuned models are what APIs serve and products build on
> - The distinction matters when reading benchmarks and papers: results on base models do not transfer directly to chat-tuned variants

> [!QUESTION]- How do you decide between prompting, RAG, and fine-tuning to adapt an LLM?
> Climb the ladder cheapest-first. Start with prompting — zero-shot or few-shot — because it needs no training and you iterate in seconds; most tasks never need more. Reach for RAG when the model lacks the *knowledge*: facts that change faster than you can retrain, or answers that must cite sources. Reach for fine-tuning when the problem is *behavior*, not knowledge — the model has the right information but won't hold a format, tone, or policy after you've exhausted prompting. The classic trap is fine-tuning to inject facts: it bakes in a snapshot that starts aging immediately and gives no traceability. The mature setup often combines them — fine-tune for behavior, RAG for current facts.

## References

- [Attention Is All You Need (Vaswani et al., 2017)](https://arxiv.org/abs/1706.03762) — the transformer paper; the architecture every modern LLM builds on.
- [Language Models are Few-Shot Learners (Brown et al., 2020)](https://arxiv.org/abs/2005.14165) — the GPT-3 paper; established that scale produces in-context learning.
- [Training language models to follow instructions with human feedback (Ouyang et al., 2022)](https://arxiv.org/abs/2203.02155) — the InstructGPT paper; the SFT + RLHF recipe that turned base models into assistants.
- [What are Large Language Models? (AWS)](https://aws.amazon.com/what-is/large-language-model/) — accessible vendor-neutral overview of LLM concepts and use cases.
- [Intro to Large Language Models (Andrej Karpathy)](https://www.youtube.com/watch?v=zjkBMFhNj_g) — the best single-hour explanation of how LLMs are trained and why they behave the way they do.
