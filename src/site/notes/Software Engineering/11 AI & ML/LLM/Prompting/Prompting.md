---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/prompting/prompting/","tags":["FolderNote"],"noteIcon":"1"}
---


# Intro

Prompts play a key role in generating useful and accurate information from AI language models. Learning how to write better prompts — "Prompt Engineering" — unlocks the full potential of these models by guiding their behavior, improving output quality, and reducing inaccuracies.

## Deeper Explanation

### Mental Model

Think of prompting as defining a small contract:

- input: what context the model sees
- task: what you want it to do
- constraints: what it must not do
- output schema: how the answer is shaped
- evaluation: how you decide whether it is good

For production use, prompts are part of an interface, so version them, test them, and monitor failures.

## Why Prompting Matters

- **Guiding Model Behavior** — Without prompts, a model generates content aimlessly. A well-crafted prompt steers the model toward useful, relevant results.
- **Improving Quality and Relevance** — Clear and concise prompts encourage the model to produce text that meets the required quality and closely matches the user's intent.
- **Eliciting Specific Output** — Prompts can be engineered to summarize text, suggest alternate phrasings, create storylines, analyse sentiment, or extract data — harnessing the model's flexibility.
- **Aligning AI and Human Intent** — Effective prompting minimizes the understanding gap between the AI and the user's actual needs and preferences.
- **Reducing Inaccuracies and Ambiguity** — A clear, complete prompt prevents the model from making unfounded assumptions or providing unclear information.

## Instruction Prompting

Instruction prompting is one of the simplest and most effective techniques — you directly tell the model what to do in natural language. The key is being specific about the task, the expected format, and any constraints.

```mermaid
graph LR
    A["Write the word 'funny'<br>backwards"] --> B["ynnuf"]
```

### Name Parsing

A common problem when collecting name data is that different people format their names differently. Some might include **`Mrs.`** or **`Jr.`**, and the first and last name could be out of order. Instruction prompting automates this cleanup.

> **Prompt**
> 
> ```
> A user has input their first and last name into a form. 
> We don't know in which order their first name and last name are, 
> but we need it to be in this format '<Last name>, <First name>'.
> 
> Please convert the following name in the expected format: Nikita Reshetnik
> ```

> **Output**
> 
> ```
> Reshetnik, Nikita
> ```

### Personally Identifiable Information Removal

Before releasing private documents, corporations or governments may need to redact PII. Instruction prompting can automate this entirely.

> **Prompt**
> 
> ```
> Read the following sales email. Remove any personally identifiable information (PII),
> and replace it with the appropriate placeholder. For example, replace the name "John Doe"
> with "[NAME]".
> 
> Hi John,
> 
> I'm writing to you because I noticed you recently purchased a new car. I'm a salesperson
> at a local dealership (Cheap Dealz), and I wanted to let you know that we have a great deal on a new
> car. If you're interested, please let me know.
> 
> Thanks,
> 
> Jimmy Smith
> 
> Phone: 410-805-2345
> Email: sales@email.com
> ```

> **Output**
> 
> ```
> Hi [NAME],
> 
> I'm writing to you because I noticed you recently purchased a new car. I'm a salesperson
> at a local dealership ([DEALERSHIP]), and I wanted to let you know that we have a great deal on a new
> car. If you're interested, please let me know.
> 
> Thanks,
> 
> [SALESPERSON]
> 
> Phone: [PHONE NUMBER]
> Email: [EMAIL ADDRESS]
> ```

### Essay Evaluation and Feedback

Gen AI can evaluate essays against complex criteria like grammar, clarity, coherence, and argument quality — providing structured, scored feedback.

> **Prompt**
> 
> ```
> Read the following excerpt from an essay and provide feedback based on the following criteria: 
> grammar, clarity, coherence, argument quality, and use of evidence. 
> Provide a score from 1-10 for each attribute, along with reasoning for your score.
> 
> "Despite the popular belief, there's no solid evidence supporting the idea that video games lead to violent behavior. 
> Research on the topic is often contradictory and inconclusive. 
> Some studies found a correlation, but correlation don't imply causation. 
> So, it's premature to blame video games for violence in society."
> ```

> **Output**
> 
> ```
> Attribute: Grammar
> Score: 9
> Reasoning: The essay is mostly grammatically correct, but there is a minor 
> error - 'correlation don't imply causation' should be 'correlation doesn't imply causation'.
> 
> Attribute: Clarity
> Score: 8
> Reasoning: The essay is generally clear, but could provide more detail or explanation 
> about the contradictory and inconclusive nature of the research.
> 
> Attribute: Coherence
> Score: 8
> Reasoning: The arguments are coherent and related, but the transition between them could be smoother.
> 
> Attribute: Argument Quality
> Score: 7
> Reasoning: The argument presented is logical and well-reasoned, but it could be strengthened 
> with a clearer statement of the writer's position on the issue.
> ```

## Questions

> [!QUESTION]- What is Prompting?
> Prompts play a key role in generating useful and accurate information from AI language models. Learning how to write better prompts — "Prompt Engineering" — unlocks the full potential of these models by guiding their behavior, improving output quality, and reducing inaccuracies.

> [!QUESTION]- Which prompt-level controls reduce prompt-injection risk for an internal assistant that reads company documents?
> Separate system instructions from user content and never allow user text to override system rules.
> Constrain outputs (schema or explicit format), avoid tool access unless necessary, and add deterministic checks.
> Treat retrieval content as untrusted input and apply allowlists for tools.


## Links

- [OpenAI Platform](https://platform.openai.com/docs/guides/prompt-engineering/strategy-write-clear-instructions)
- [Learn Prompting: Your Guide to Communicating with AI](https://learnprompting.org/docs/basics/introduction)
- [Prompt Engineering Guide – Nextra](https://www.promptingguide.ai/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM\|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Role Prompting\|Role Prompting]]
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Showing Examples\|Showing Examples]]
<!-- whats-next:end -->
