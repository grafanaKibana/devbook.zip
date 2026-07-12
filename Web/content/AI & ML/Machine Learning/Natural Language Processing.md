---
publish: true
created: 2026-07-11T21:43:50.456Z
modified: 2026-07-11T21:43:50.456Z
published: 2026-07-11T21:43:50.456Z
topic:
  - AI & ML
subtopic:
  - Machine Learning
summary: The AI field enabling computers to understand and generate human language, now dominated by transformers.
level:
  - "1"
priority: Low
status: Done
---

# Intro

Natural Language Processing (NLP) is the field of AI concerned with enabling computers to understand, interpret, and generate human language. NLP powers search engines, chatbots, translation, sentiment analysis, document classification, and the large language models (LLMs) that underpin modern AI assistants. The transformer architecture (2017) fundamentally changed NLP — most modern NLP tasks are now solved by fine-tuning or prompting pre-trained transformer models rather than building task-specific pipelines from scratch. The practical shift: a hand-tuned regex + TF-IDF classification pipeline that takes months of rule engineering is now routinely outperformed by a small fine-tuned transformer (such as DistilBERT) trained on a few thousand labeled examples — and unlike the rules, the model generalizes to inputs the rules never anticipated.

## Core NLP Tasks

### Tokenization

Breaking text into units (tokens) that a model can process. Tokens are not always words — modern tokenizers (BPE, WordPiece) split words into subword units to handle rare words and multiple languages.

```text
Input:  "Unbelievable performance!"
Tokens: ["Un", "##believ", "##able", " performance", "!"]
```

Tokenization is the first step in every NLP pipeline. Token count determines model input length and cost for API-based LLMs.

### Named Entity Recognition (NER)

Identifying and classifying named entities in text: people, organizations, locations, dates, monetary values.

```text
Input:  "Microsoft acquired GitHub for $7.5 billion in 2018."
Output: Microsoft [ORG], GitHub [ORG], $7.5 billion [MONEY], 2018 [DATE]
```

NER is used in document processing, information extraction, and compliance systems (detecting PII).

### Sentiment Analysis

Classifying the emotional tone of text: positive, negative, neutral (or more granular scales).

```text
"The delivery was fast but the product quality was disappointing."
→ Mixed sentiment: positive (delivery), negative (quality)
```

Aspect-based sentiment analysis identifies sentiment per aspect rather than for the whole text.

### Text Classification

Assigning predefined categories to text: spam detection, topic classification, intent detection in chatbots.

### Machine Translation

Translating text between languages. Modern translation uses encoder-decoder transformer models (e.g., Helsinki-NLP models on Hugging Face, Google Translate's neural MT).

### Question Answering and Summarization

Extracting answers from a context passage (extractive QA) or generating answers (generative QA). Summarization condenses long documents into shorter versions. Both are now dominated by LLMs.

## The Transformer Impact

Before transformers (2017), NLP tasks required separate models for each task (LSTM for translation, CNN for classification, CRF for NER). Transformers enabled **transfer learning**: pre-train a large model on massive text corpora, then fine-tune on a small task-specific dataset.

The result: BERT (2018) achieved state-of-the-art on 11 NLP benchmarks simultaneously. GPT-3/4 showed that large enough models can perform NLP tasks with zero or few examples (zero-shot, few-shot prompting).

For embeddings — the dense vector representations that power semantic search and RAG — see [[Embeddings]].

## NLP in .NET

For production NLP in .NET, the primary options are:

- **Azure AI Language** (cloud): sentiment analysis, NER, key phrase extraction, language detection via REST API.
- **ML.NET**: on-device text classification and sentiment analysis using pre-trained models.
- **Microsoft Agent Framework / Azure OpenAI**: LLM-based NLP for complex tasks (summarization, QA, classification via prompting).

```csharp
// Azure AI Language: sentiment analysis
var client = new TextAnalyticsClient(endpoint, new AzureKeyCredential(key));
var result = await client.AnalyzeSentimentAsync("The product quality was excellent.");
Console.WriteLine($"Sentiment: {result.Value.Sentiment}");  // Positive
Console.WriteLine($"Confidence: {result.Value.ConfidenceScores.Positive:P}");
```

## Pitfalls

### Treating Token Count as Word Count

**What goes wrong**: estimating LLM costs or context window usage based on word count. A 1,000-word English document may be 1,200–1,500 tokens depending on vocabulary, but the same content in Japanese or Korean can require 2–3× more tokens because CJK characters split into more subword units. A cost budget estimated from English token counts can therefore be off by a factor of 2–3 once multilingual traffic arrives.

**Why it happens**: "token" and "word" are used interchangeably in casual conversation.

**Mitigation**: use the model's tokenizer to count tokens before sending to the API. OpenAI's `tiktoken` library and Azure's token counting APIs provide exact counts. For multilingual applications, benchmark token counts per language during cost estimation.

### Language Bias in Pre-Trained Models

**What goes wrong**: a model trained primarily on English performs poorly on other languages — lower accuracy, higher hallucination rate, worse NER.

**Why it happens**: most large pre-trained models are English-dominant. Multilingual models (mBERT, XLM-R) exist but have lower per-language performance than monolingual models.

**Mitigation**: use language-specific models for non-English tasks when accuracy matters. Evaluate on your target language explicitly.

## Tradeoffs

### NLP Approach Selection

| Approach | Accuracy | Cost | Latency | Customization | Use when |
|----------|---------|------|---------|--------------|----------|
| Rule-based (regex, keyword) | Low | Near zero | Microseconds | High | Simple extraction with known patterns; no training data needed |
| Fine-tuned small model (BERT, DistilBERT) | High | Medium (training) | Low (on-device) | High | Production NLP at scale; latency-sensitive; data available |
| LLM via prompting (GPT-4, Claude) | Very high | High (per-call) | High (seconds) | Low | Complex tasks; no training data; rapid prototyping |
| Azure AI Language (managed) | High | Medium (per-call) | Medium | Low | Standard tasks (sentiment, NER, key phrases) without ML expertise |

**Decision rule**: use rule-based approaches for simple, high-volume extraction where patterns are stable. Use fine-tuned small models for production NLP tasks where latency and cost matter. Use LLMs for complex tasks (summarization, QA, multi-step reasoning) or when you lack training data. Use managed services (Azure AI Language) when you need standard NLP tasks without ML infrastructure.

### Monolingual vs Multilingual Models

| Model type | Per-language accuracy | Languages | Model size | Use when |
|-----------|---------------------|-----------|-----------|----------|
| Monolingual (e.g., English BERT) | Highest | 1 | Smaller | Single-language product; accuracy is critical |
| Multilingual (mBERT, XLM-R) | Lower per language | 100+ | Larger | Multi-language product; training data per language is scarce |
| LLM (GPT-4, Claude) | High across languages | Many | Very large | Complex tasks; language coverage matters more than latency |

**Decision rule**: use monolingual models when your product serves one language and accuracy is critical. Use multilingual models when you need coverage across many languages and per-language accuracy can be slightly lower. Use LLMs when the task complexity outweighs the cost of per-call API pricing.

## Questions

> [!QUESTION]- When should you fine-tune a small model instead of prompting an LLM for an NLP task?
>
> - Fine-tune when you have labeled training data and the task is well-defined (classification, NER, sentiment).
> - Fine-tuned small models (BERT, DistilBERT) run at millisecond latency on-device vs seconds for LLM API calls.
> - Per-request cost is near zero for on-device inference vs $0.01–$0.10+ per LLM call at scale.
> - LLMs win when the task is complex (multi-step reasoning, summarization), training data is scarce, or rapid iteration matters more than unit cost.
> - Fine-tuning costs you labeled data and training effort upfront, then pays it back as millisecond latency and near-zero per-request cost at scale; prototype with an LLM, then check whether production volume justifies the fine-tune.

> [!QUESTION]- Why do multilingual NLP models underperform monolingual ones, and when is that acceptable?
>
> - Multilingual models split their capacity across 100+ languages, so per-language representation quality is lower.
> - Monolingual models concentrate all parameters on one language, achieving higher accuracy on that language's benchmarks.
> - Multilingual models are acceptable when you need coverage across many languages and per-language accuracy can be slightly lower.
> - For high-stakes tasks (medical NER, legal classification), the accuracy gap may be unacceptable — use language-specific models.
> - Multilingual models trade per-language accuracy for breadth of coverage; accept that when you serve many languages on limited ML infrastructure, but validate explicitly on the languages you actually care about.

## References

- [Hugging Face NLP Course](https://huggingface.co/learn/nlp-course/chapter1/1) — free, comprehensive course covering tokenization, transformers, fine-tuning, and all major NLP tasks with code examples.
- [Attention Is All You Need (Vaswani et al., 2017)](https://arxiv.org/abs/1706.03762) — the original transformer paper; introduced the self-attention mechanism that replaced RNNs and enabled modern NLP.
- [Azure AI Language documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/ai-services/language-service/) — official docs for Azure's managed NLP services: sentiment analysis, NER, key phrase extraction, and custom text classification.
