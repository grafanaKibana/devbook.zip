---
topic:
  - AI & ML
subtopic:
  - Machine Learning
summary: "Turning language into machine-usable representations for extraction, classification, search, and generation. Transformers are now common."
level:
  - "1"
priority: Low
status: Done
publish: true
---

Natural language processing (NLP) turns text or speech into representations a machine can use, then maps those representations to a task such as search, classification, extraction, translation, or generation. The machine does not "understand" language in the human sense. It learns statistical structure that can be useful enough to operate on language.

Transformers changed the default implementation path. Many systems now start with a pretrained model and adapt it through prompting or fine-tuning. Rules and sparse features still win when the pattern is narrow, stable, and easy to audit. A larger model earns its cost when the input varies enough that hand-written cases become the real maintenance burden.

# Core NLP Tasks

## Tokenization

Tokenization converts text into the integer units accepted by a model. Tokens are not words. BPE and WordPiece vocabularies often split an unfamiliar word into reusable subword pieces, while punctuation and whitespace can become separate units.

```text
Input:  "Unbelievable performance!"
Tokens: ["Un", "##believ", "##able", " performance", "!"]
```

The token list is illustrative rather than the output of one specific tokenizer: WordPiece uses `##` continuation markers, while byte-level BPE token displays often preserve leading spaces. Exact segmentation comes from the tokenizer shipped with the model.

For transformer models, token count controls context usage and often API cost. The count depends on the exact tokenizer, so character or word counts are only rough estimates.

## Named Entity Recognition (NER)

Named entity recognition locates spans and assigns labels such as person, organization, date, or monetary value.

```text
Input:  "Microsoft acquired GitHub for $7.5 billion in 2018."
Output: Microsoft [ORG], GitHub [ORG], $7.5 billion [MONEY], 2018 [DATE]
```

NER supports document indexing and structured extraction. A generic NER label set is not automatically a PII detector. Production compliance work usually needs domain-specific labels, policy rules, and evaluation on the actual documents.

## Sentiment Analysis

Sentiment analysis assigns a polarity or score to text. Whole-document sentiment is often too coarse when one sentence praises delivery and criticizes product quality.

```text
"The delivery was fast but the product quality was disappointing."
→ Mixed sentiment: positive (delivery), negative (quality)
```

Aspect-based models attach sentiment to the thing being discussed, preserving that distinction.

## Text Classification

Text classification maps a document to one or more predefined labels. Spam detection, routing, and intent recognition are common cases. The label policy and ambiguous examples usually matter more than the choice between two similar model architectures.

## Machine Translation

Machine translation maps text between languages while trying to preserve meaning and register. Encoder-decoder transformers are common, but proper nouns, domain terminology, and low-resource languages still need focused evaluation.

## Question Answering and Summarization

Extractive question answering selects an answer span from supplied context. Generative QA writes an answer and can introduce claims absent from that context. Summarization has the same split between compression and generation. Evaluation must therefore cover factual support, not only fluent wording.

# What Transformers Changed

Earlier NLP stacks commonly paired task-specific features with recurrent networks, convolutional models, or conditional random fields. Transformers made large-scale pretraining reusable across tasks. The same base representation can be fine-tuned for classification, extraction, or generation.

That reuse reduced the amount of labeled data needed for many tasks. It did not remove task design. Prompted and fine-tuned models still inherit the limits of their training data, context window, label definition, and evaluation set.

Dense vector representations used by semantic search and RAG are covered in [[Embeddings]].

# NLP in .NET

The .NET implementation choice depends on latency, data policy, and how narrow the task is:

- **Azure AI Language** exposes managed classification and extraction features through a service API.
- **ML.NET** can train or consume local text-classification pipelines when data and inference need to remain inside the application boundary.
- **Microsoft Agent Framework with an LLM provider** fits multi-step language workflows, though simple classification rarely needs an agent loop.

```csharp
// Azure AI Language: sentiment analysis
var client = new TextAnalyticsClient(endpoint, new AzureKeyCredential(key));
var result = await client.AnalyzeSentimentAsync("The product quality was excellent.");
Console.WriteLine($"Sentiment: {result.Value.Sentiment}");  // Positive
Console.WriteLine($"Confidence: {result.Value.ConfidenceScores.Positive:P}");
```

# Pitfalls

## Estimating Tokens from Words

Word counts hide tokenizer and language effects. A budget derived from English prose can fail on code, identifiers, or another language because the same visible length may produce many more tokens.

Count with the tokenizer for the deployed model. Cost and truncation tests should include the actual language mix and representative long inputs.

## Language Bias in Pre-Trained Models

Multilingual support in a model card does not guarantee equal quality. Training mix, tokenizer coverage, and benchmark availability vary by language. Evaluate each supported language and the code-switching patterns seen in production. A language-specific model may be the better fit when one language carries most of the traffic or the task is high stakes.

# Tradeoffs

## NLP Approach Selection

| Approach | Accuracy | Cost | Latency | Customization | Use when |
|----------|---------|------|---------|--------------|----------|
| Rule-based (regex, keyword) | Narrow but predictable | Near zero | Usually lowest | Direct | Stable formats and explicit patterns |
| Fine-tuned small model (BERT, DistilBERT) | Task-dependent | Training + hosting | Often low | Training data and model | Repeated classification or extraction at scale |
| LLM via prompting | Task-dependent | Per call | Usually highest | Prompt, tools, retrieval | Variable inputs and generative work |
| Azure AI Language (managed) | Task-dependent | Per call | Network-bound | Service configuration | Standard managed language features |

Start with rules when the pattern is explicit. A small fine-tuned model suits a stable, repeated task once labeled data exists and unit cost matters. Prompted LLMs are useful for variable or generative work, but they bring network latency and a broader failure surface. Managed language APIs trade model control for less infrastructure.

## Monolingual Vs Multilingual Models

| Model type | Per-language accuracy | Languages | Model size | Use when |
|-----------|---------------------|-----------|-----------|----------|
| Monolingual (e.g., English BERT) | Often strongest in its language | 1 | Usually smaller | One-language product with enough data |
| Multilingual (mBERT, XLM-R) | Varies by language | Many | Usually larger | Shared model across several languages |
| General-purpose LLM | Varies by model and language | Many | Hosted or very large | Generative tasks where broad coverage offsets cost |

Benchmark the actual languages before choosing. A multilingual model simplifies operations, while separate monolingual models can improve quality at the cost of several training and deployment paths. General-purpose LLMs add broad coverage, but their latency and data boundary may decide the issue before benchmark accuracy does.

# Questions

> [!QUESTION]- When is fine-tuning a small model preferable to prompting an LLM for an NLP task?
> Fine-tuning fits a stable label space, enough representative examples, and volume that rewards predictable local inference. Prompting avoids an up-front training set and handles generative or changing tasks more easily. A fixed estimate such as $0.01–$0.10+ ages quickly. The comparison needs current provider pricing, representative token counts, and the full cost of local training and hosting.

> [!QUESTION]- Why might a multilingual NLP model underperform a monolingual one, and when is that acceptable?
> A multilingual model shares vocabulary and capacity across languages whose training coverage can differ sharply. That may reduce per-language quality, though it can also help related low-resource languages through transfer. The shared model is attractive when one deployment must cover many languages. High-stakes extraction still needs per-language evidence, and a language-specific model may be justified where the shared model misses material cases.

# References

- [Hugging Face NLP Course](https://huggingface.co/learn/nlp-course/chapter1/1) — explains tokenization, transformer models, fine-tuning, and common NLP task pipelines with executable examples.
- [Attention Is All You Need (Vaswani et al., 2017)](https://arxiv.org/abs/1706.03762) — introduces the Transformer architecture built around attention rather than recurrence or convolution.
- [Azure AI Language documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/ai-services/language-service/) — official docs for Azure's managed NLP services: sentiment analysis, NER, key phrase extraction, and custom text classification.
