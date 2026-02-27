---
topic:
  - AI & ML
subtopic:
  - LLM
tags:
  - FolderNote
dg-publish: true
status: Creation
level:
  - '3'
priority: High
---

# Intro

Large language models, also known as LLMs, are very large [deep learning](https://aws.amazon.com/what-is/deep-learning/) models that are pre-trained on vast amounts of data. The underlying transformer is a set of [neural networks](https://aws.amazon.com/what-is/neural-network/) that consist of an encoder and a decoder with self-attention capabilities. The encoder and decoder extract meanings from a sequence of text and understand the relationships between words and phrases in it.

![11 AI & ML-LLM-20260211012223477.png](11%20AI%20&%20ML-LLM-20260211012223477.png)

## Deeper Explanation

## How are LLMs built?

On a high level, training an LLM model involves three steps i.e. data collection, training and evaluation.

- **Data Collection** The first step is to collect the data that will be used to train the model. The data can be collected from various sources such as Wikipedia, news articles, books, websites etc.
- **Training**: The data then goes through a training pipeline where it is cleaned and preprocessed before being fed into the model for training. The training process usually takes a long time and requires a lot of computational power.
- **Evaluation**: The final step is to evaluate the performance of the model to see how well it performs on various tasks such as question answering, summarization, translation etc.

The output from the training Pipeline is an LLM model which is simply the parameters or weights which capture the knowledge learned during the training process. These parameters or weights are typically serialized and stored in a file, which can then be loaded into any application that requires language processing capabilities e.g. text generation, question answering, language processing etc.

Once trained, LLMs can be readily adapted to perform multiple tasks using relatively small sets of supervised data, a process known as fine tuning.

Three common learning models exist:

- Zero-shot learning; Base LLMs can respond to a broad range of requests without explicit training, often through prompts, although answer accuracy varies.
- Few-shot learning: By providing a few relevant training examples, base model performance significantly improves in that specific area.
- Fine-tuning: This is an extension of few-shot learning in that data scientists train a base model to adjust its parameters with additional data relevant to the specific application.

## Types of LLMs

Instruction Tuned LLMs, instead of trying to autocomplete your text, try to follow the given instructions using the data that they have been trained on. For example, if you input the sentence “What are LLMs?” it will use the data that it is trained on and try to answer the question. Similarly, if you input “What are some famous social networks?” it will try to answer the question instead of giving you a random answer.

Instruction Tuned LLMs are built on top of Base LLMs:

```
Instruction Tuned LLMs = Base LLMs + Further Tuning + RLHF
```

To build an Instruction Tuned LLM, a Base LLM is taken and is further trained using a large dataset covering sample “Instructions” and how the model should perform as a result of those instructions. The model is then fine-tuned using a technique called “Reinforcement Learning with Human Feedback” (RLHF) which allows the model to learn from human feedback and improve its performance over time.

## Dictionary

When working with LLMs, you will come across a lot of new terms. This section will help you understand the meaning of these terms and how they are used in the context of LLMs.

- **[[Machine Learning]] (ML)** — ML is a field of study that focuses on algorithms that can learn from data. ML is a subfield of AI.
- **“Model” vs. “AI” vs. “LLM”** — These terms are used somewhat interchangeably throughout this course, but they do not always mean the same thing. LLMs are a type of AI, as noted above, but not all AIs are LLMs. When we mentioned models in this course, we are referring to AI models. As such, in this course, you can consider the terms “model” and “AI” to be interchangeable.
- **LLM** — Large language model. A large language model is a type of artificial intelligence that can understand and generate human-like text based on the input it receives. These models have been trained on vast amounts of text data and can perform a wide range of language-related tasks, such as answering questions, carrying out conversations, summarizing text, translating languages, and much more.
- **MLM** — Masked language model. A masked language model is a type of language model that is trained to predict the next word in a sequence of words. It is typically trained on a large corpus of text data and can be used for a variety of tasks, such as machine translation, sentiment analysis, summarization, and more.
- **NLP** — [[Natural Language Processing]]. Natural language processing is a branch of artificial intelligence that deals with the interaction between computers and human languages. It is used to analyze, understand, and generate human language.
- **Label** — Labels are just possibilities for the classification of a given text. For example, if you have a text that says “I love you”, then the labels could be “positive”, “negative”, or “neutral”. The model will try to predict which label is most likely to be correct based on the input text.
- **Label Space** — The label space is the set of all possible labels that can be assigned to a given text. For example, if you have a text that says “I love you”, then the label space could be “positive”, “negative”, or “neutral”.
- **Label Distribution** — The label distribution is the probability distribution over the label space. For example, if you have a text that says “I love you”, then the label distribution could be [0.8, 0.1, 0.1]. This means that the model thinks there is an 80% chance that the text is positive, a 10% chance that it is negative, and a 10% chance that it is neutral.
- **Sentiment Analysis** — Sentiment analysis is the process of determining the emotional tone behind a series of words, used to gain an understanding of the attitudes, opinions and emotions expressed within an online mention. Sentiment analysis is also known as opinion mining, deriving the opinion or attitude of a speaker.
- **Verbalizer** — In the classification setting, verbalizers are mappings from labels to words in a language model’s vocabulary. For example, consider performing sentiment classification with the following prompt:
    
    ```
    Tweet: "I love hotpockets"What is the sentiment of this tweet? Say 'pos' or 'neg'.
    ```
    
    Here, the verbalizer is the mapping from the conceptual labels of **`positive`** and **`negative`** to the tokens **`pos`** and **`neg`**.
    
- **Reinforcement Learning from Human Feedback (RLHF)** — RLHF is a technique for training a model to perform a task by providing it with human feedback. The model is trained to maximize the amount of positive feedback it receives from humans, while minimizing the amount of negative feedback it receives.

## Questions

> [!QUESTION]- What is LLM?
> A large language model (LLM) is a neural network trained on large corpora of text to predict the next token. Once trained, it can be adapted to tasks like answering questions, summarizing, writing, and tool use by conditioning on instructions and context.

## Links

[What are Large Language Models? - LLM AI Explained - AWS](https://aws.amazon.com/what-is/large-language-model/?nc1=h_ls)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
>
> **Topics**
> - [[Software Engineering/11 AI & ML/LLM/Agents/Agents|Agents]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Prompting|Prompting]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG|RAG]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Generation Parameters|Generation Parameters]]
> - [[Software Engineering/11 AI & ML/LLM/Guardrails|Guardrails]]
> - [[Software Engineering/11 AI & ML/LLM/Hallucinations|Hallucinations]]
> - [[Software Engineering/11 AI & ML/LLM/OWASP vulnerabilities on AI LLM|OWASP vulnerabilities on AI LLM]]
<!-- whats-next:end -->
