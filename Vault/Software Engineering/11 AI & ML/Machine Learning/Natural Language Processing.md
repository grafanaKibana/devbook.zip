---
topic:
  - AI & ML
subtopic:
  - Machine Learning
level:
  - "1"
priority: Low
status: Creation
dg-publish: true
---

# Natural Language Processing

Natural Language Processing (NLP) is the field of AI concerned with enabling computers to understand, interpret, and generate human language. NLP powers search engines, chatbots, translation, sentiment analysis, document classification, and the large language models (LLMs) that underpin modern AI assistants. The transformer architecture (2017) fundamentally changed NLP — most modern NLP tasks are now solved by fine-tuning or prompting pre-trained transformer models rather than building task-specific pipelines from scratch.

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

For embeddings — the dense vector representations that power semantic search and RAG — see [[Software Engineering/11 AI & ML/LLM/Embeddings|Embeddings]].

## NLP in .NET

For production NLP in .NET, the primary options are:

- **Azure AI Language** (cloud): sentiment analysis, NER, key phrase extraction, language detection via REST API.
- **ML.NET**: on-device text classification and sentiment analysis using pre-trained models.
- **Semantic Kernel / Azure OpenAI**: LLM-based NLP for complex tasks (summarization, QA, classification via prompting).

```csharp
// Azure AI Language: sentiment analysis
var client = new TextAnalyticsClient(endpoint, new AzureKeyCredential(key));
var result = await client.AnalyzeSentimentAsync("The product quality was excellent.");
Console.WriteLine($"Sentiment: {result.Value.Sentiment}");  // Positive
Console.WriteLine($"Confidence: {result.Value.ConfidenceScores.Positive:P}");
```

## Pitfalls

### Treating Token Count as Word Count

**What goes wrong**: estimating LLM costs or context window usage based on word count. A 1,000-word document may be 1,200–1,500 tokens depending on vocabulary and language.

**Why it happens**: "token" and "word" are used interchangeably in casual conversation.

**Mitigation**: use the model's tokenizer to count tokens before sending to the API. OpenAI's `tiktoken` library and Azure's token counting APIs provide exact counts.

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


## References

- [Hugging Face NLP Course](https://huggingface.co/learn/nlp-course/chapter1/1) — free, comprehensive course covering tokenization, transformers, fine-tuning, and all major NLP tasks with code examples.
- [Attention Is All You Need (Vaswani et al., 2017)](https://arxiv.org/abs/1706.03762) — the original transformer paper; introduced the self-attention mechanism that replaced RNNs and enabled modern NLP.
- [Azure AI Language documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/ai-services/language-service/) — official docs for Azure's managed NLP services: sentiment analysis, NER, key phrase extraction, and custom text classification.
- [[Software Engineering/11 AI & ML/LLM/Embeddings|Embeddings]] — dense vector representations of text; the foundation of semantic search, RAG, and similarity-based NLP tasks.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
>
> **Topics**
> - [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Types|Types]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Data Drift|Data Drift]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Spectrum Of Automations|Spectrum Of Automations]]
<!-- whats-next:end -->
