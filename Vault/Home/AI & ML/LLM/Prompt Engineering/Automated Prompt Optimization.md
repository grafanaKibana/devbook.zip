---
topic: [AI & ML]
subtopic: [LLM]
level: ["3"]
priority: Low
status: In Progress
publish: true
qard-deck: "AI & ML"
qard-topic: "LLM/Prompt Engineering/Automated Prompt Optimization"
created: "2026-02-28T13:40:02.000Z"
modified: "2026-11-19T19:50:06.148Z"
published: "2026-07-08T13:14:17.480Z"
---

Tuning a prompt by hand works for a few prompts, but each model upgrade, new domain or changed example turns every wording change into another experiment, and the experiments multiply with the prompts. Prompt optimization runs that experiment as a loop: candidates are proposed, each candidate is scored on a fixed set of examples, and the best one is kept.

The loop does not remove judgment, because someone still decides which examples are in the set, what counts as a correct output and what score is good enough to release, so a poor example set selects a poor prompt just as consistently as a good set selects a good one. The techniques differ in what they improve:

- **Meta prompting.** The instruction, by hand. A model drafts one rewrite from failed outputs, and a person decides whether to keep it.
- **Automatic Prompt Engineer (APE).** The instruction, by search. A model proposes many instructions, and a set of examples with known answers picks the winner.
- **Active-Prompt.** The worked examples in the prompt. The questions the model is unsure about are found first, so a person writes examples only for those.
- **Directional Stimulus Prompting (DSP).** A hint for each input. A small trained model writes the hint, which is added to the large model's prompt.

# Meta Prompting

A prompt that keeps failing in the same way is slow to fix by hand, because each wording change is a guess that has to be tried before anyone knows whether it helped. Meta prompting gives a model the current prompt and the outputs that went wrong and asks the model to write a better prompt, so the rewrite starts from the actual failures. The rewriting happens while the prompt is being developed, so it adds no calls per request. The same approach also covers drafting a first prompt from a task description and asking a model to list the weaknesses of an existing prompt.

```text
# Current prompt and the output that went wrong
Summarize this incident report.
Report: "14:02 deploy of the checkout service. 14:05 payments start failing.
14:20 deploy rolled back, payments recover.
Cause: the deploy removed a database column that the payment code still read."

-> Checkout payments failed for a short time after a deploy and were restored by a rollback.
# No times and no cause, although the report has both.

# Meta prompt: the current prompt, the failed output and the requirement go to a model
The prompt "Summarize this incident report." produced the summary below.
Summary: "Checkout payments failed for a short time after a deploy and were restored by a rollback."
The summary must state the timeline, the root cause and the actions taken.
Rewrite the prompt so that the output is JSON with the keys timeline, root_cause, actions.

-> Summarize the incident report as JSON with the keys timeline, root_cause and actions.
   timeline lists each event with its time, root_cause is one sentence,
   actions lists what was done. Return only the JSON.
# The candidate prompt. Each new rule answers something the failed summary lacked.

# Candidate prompt on the same report
-> {"timeline": ["14:02 deploy of the checkout service", "14:05 payments start failing",
                 "14:20 deploy rolled back, payments recover"],
    "root_cause": "The deploy removed a database column that the payment code still read.",
    "actions": ["Rolled back the deploy"]}
```

The rewrite is only a candidate at this point, because it has been tried on the one report it was written for. Meta prompting keeps a person in the revision loop. The automated methods that follow turn the same candidate-and-evaluator idea into a search process that proposes and scores prompt variants without a manual edit at each step.

## Pitfalls

### A rewrite that fixes the failure and breaks other reports

The model that wrote the candidate saw only the failed summary, so the candidate's rules fit that failure and can go wrong on a report that looks different.

```text
# Candidate prompt on a report where the cause is not known yet
Report: "09:10 search returns errors. 09:25 search service restarted, errors stop.
Cause still under investigation."

-> {"timeline": ["09:10 search returns errors", "09:25 search service restarted, errors stop"],
    "root_cause": "The search service ran out of memory.",
    "actions": ["Restarted the search service"]}
# The prompt demands a root cause, so the model made one up.

# Fix: the candidate is scored on reports that were not used for the rewrite,
# including this one. The invented cause shows up there, and the prompt gets one more rule:
Use null for a key when the report does not state the value.

-> {"timeline": ["09:10 search returns errors", "09:25 search service restarted, errors stop"],
    "root_cause": null,
    "actions": ["Restarted the search service"]}
```

Reports the rewrite never saw are what reveal this before release, because the report that caused the rewrite can only confirm that the old failure is gone. The prompt is versioned together with its evaluator so that a score can be traced to the pair that produced it. A rollback threshold, an error rate in production at which the previous prompt version is restored, limits the damage from regressions the evaluation misses.

# Automatic Prompt Engineer (APE)

Meta prompting yields one rewrite at a time, and a person has to judge that rewrite without a score, so comparing many wordings by hand does not scale. Automatic Prompt Engineer (APE) has a model propose many candidate instructions, runs each candidate on a set of examples with known answers, and keeps the candidate with the highest score, so the example set does the choosing instead of a person's impression.

```text
# Task: sort shop customer messages into refund_request, delivery_question, account_question.

# Example set with known answers (five shown, a real set is larger)
"The headphones arrived broken, I want my money back."   -> refund_request
"Where is my parcel? It was due on Monday."              -> delivery_question
"I cannot log in after changing my email."               -> account_question
"The parcel never came, please return my payment."       -> refund_request
"Can the courier leave the box with a neighbour?"        -> delivery_question

# Step 1: a model proposes candidate instructions. The three labels are added to each.
A: "Classify the message."
B: "Decide what the customer is complaining about and pick a label."
C: "Pick the label for what the customer wants to happen next."

# Step 2: each candidate labels every example, and code counts the correct labels.
A: 3 of 5   # twice answered "complaint", which is not one of the labels
B: 4 of 5   # "parcel never came, return my payment" became delivery_question
C: 5 of 5

# Step 3: C is kept, because the count decided and nobody compared wordings by eye.
```

B and C differ by a few words and still score differently, which is why the search tries many wordings instead of trusting one. The search costs one model call per candidate per example, 15 calls here, and the winner belongs to the model and the task it was scored on, so the search is rerun when either changes.

## Pitfalls

### A small example set rewards luck

A candidate can win the search because of one or two messages, so a win on a small set may not hold on other messages.

```text
# Search set: the five messages above
B: 4 of 5
C: 5 of 5        # C wins by a single message

# Test set: 200 other messages that the search never used
B: 176 of 200
C: 171 of 200    # the lead is gone

# Fix: the winner of the search is confirmed on the separate test set before release.
```

The search set and the final test set stay separate because a candidate picked for its score on one set has already been fitted to that set, so only messages the search never used can confirm the win. A set that is small, or that leaves out kinds of messages production receives, rewards noise in the same way. No fixed number of examples is enough for every case, because the number depends on the metric, on how small a difference between candidates still matters, and on how much error is acceptable.

### A benchmark win that is not a product win

An instruction that raises the score on a public benchmark may do nothing, or harm, on the task the product runs.

```text
# Two instruction endings, scored on a public math benchmark (numbers are illustrative)
"Answer directly."                      61 of 100
"Work through the problem in steps."    78 of 100

# The same two endings on 100 shop messages
"Answer directly."                      93 of 100
"Work through the problem in steps."    90 of 100   # the label is sometimes buried in the explanation

# Fix: candidates are scored on messages shaped like production traffic.
```

The math benchmark rewards step-by-step arithmetic, which sorting customer messages does not need, so the gain does not carry over. Public benchmarks compare methods under controlled conditions, while a release decision needs examples that look like production traffic and a metric tied to what a wrong label costs.

# Active-Prompt

A worked example, a question with its reasoning written out as described in [[Reasoning Techniques]], is expensive because a person has to write it, and the effort is wasted on questions the model already gets right. Active-Prompt has the model answer each question several times and treats disagreement between those answers as a sign that the model is unsure, so a person writes worked examples only for the questions where the answers split.

```text
# Each shop message is labelled five times by the model, with no worked examples in the prompt.

"Where is my parcel? It was due on Monday."
-> delivery_question x5
# All five agree, so a worked example here would teach the model nothing new. Skipped.

"I cannot log in after changing my email."
-> account_question x5
# Skipped for the same reason.

"The parcel never came, please return my payment."
-> refund_request x3, delivery_question x2
# The answers split, so the model is unsure. This message goes to a person.

# The person writes the worked example, which is added to the prompt:
Message: "The parcel never came, please return my payment."
Reasoning: The missing parcel is the cause, but the customer asks for the payment back, so the request is a refund.
Label: refund_request
```

A person still writes every worked example, so the method only decides where that effort goes. The selection costs several model calls per message, five here, across the whole pool of messages, and the pool needs no known answers because the disagreement is measured between the model's own answers.

## Pitfalls

### Disagreement caused by an unclear question

The answers can also split because the message itself is unclear, and a worked example for such a message would teach the model a guess.

```text
"It still has not worked."
-> account_question x2, delivery_question x2, refund_request x1
# The message does not say what "it" is, so no label is clearly right.

# Fix: the person marks the message as unclear and removes it from the pool
# instead of writing a worked example for it.
```

# Directional Stimulus Prompting

A large model usually cannot be retrained for one task, and a fixed instruction says the same thing for every input, so it cannot name what matters in one particular input. Directional Stimulus Prompting (DSP) trains a small model to write a short hint for each input, and the hint is added to the large model's prompt.

```text
# Input: a support conversation
Customer: My order 1234 came with broken headphones.
Agent: Sorry about that. A replacement can ship tomorrow, or the payment can be returned.
Customer: Replacement please, but to my office address, not home.
Agent: Done. It ships tomorrow to the office address.

# Without a hint
Summarize the conversation in one sentence.
-> The customer reported broken headphones and the agent resolved the issue.
# True, but what was agreed is missing.

# With a hint: the small model reads the conversation and writes a few keywords.
Summarize the conversation in one sentence.
Hint: replacement, ships tomorrow, office address
-> The broken headphones from order 1234 will be replaced, shipping tomorrow to the office address.
# The hint line is the only difference between the two prompts.
```

The small model learns which hints lead to good summaries from example conversations with good summaries, so DSP needs training data and a training run, and a hint model trained for summaries does not write useful hints for another task. The small model also runs on every request, which makes DSP the one technique in this note that adds a model call per request instead of work during development only.

# Tradeoffs

| Technique | What it improves | What it needs | What it costs |
| --- | --- | --- | --- |
| Meta prompting | The instruction, one rewrite at a time. | Failed outputs and a person to review the rewrite. | A person's time per rewrite. The rewrite has no score until it is tried on other inputs. |
| APE | The instruction, picked from many candidates. | Examples with known answers and a separate test set. | One model call per candidate per example. |
| Active-Prompt | The worked examples in the prompt. | A pool of questions and a person to write the examples. | Several model calls per question, then the writing time. |
| DSP | A hint for each input. | Training data and a trained small model. | One extra model call on every request. |

Hand tuning stays cheaper for a few stable prompts, while automation pays off when prompts are retuned often and quality can be scored reliably enough to guide a search, because a search is only as good as the score it follows.

# Questions

<!-- qard-id: 637042dc-8641-4fbe-9f1a-25620b16a717 -->
> [!qard]- What is meta prompting?
> Meta prompting is using a model to write or improve a prompt. It fits when a prompt keeps failing in the same way and the failed outputs are at hand, or when a first prompt has to be drafted from a task description, while one obvious wording fix is quicker by hand. The work happens during prompt development, so it adds no calls per request.
>
> The model receives the current prompt, the outputs that went wrong and the requirement, and returns a rewrite whose new rules answer those failures, which replaces guessing at wording by hand. The rewrite is only a candidate, because the model saw only the failures, so the rewrite is scored on inputs it was not written from before a person lets it replace the current prompt.
>
> For example, the prompt of a support bot, "Answer customer questions about orders", is rewritten and tried again until the bot's replies on the trial conversations are acceptable. Along the way a rewrite that forbade refund promises made the bot refuse to explain the refund policy, so that reply went back to the model and the rule was narrowed to explain the policy without promising a refund.
>
> ```mermaid
> flowchart LR
>   A["Bot promises refunds it cannot grant"] -->|"prompt and failed replies"| B["Model rewrites the prompt"]
>   B --> C["Try on other conversations"]
>   C --> D{"All replies acceptable?"}
>   D -->|"no: new failed replies go back"| B
>   D -->|"yes"| E["New prompt replaces the old one"]
> ```
>
> Sources: [OpenAI model optimization](https://developers.openai.com/api/docs/guides/model-optimization) · [OpenAI evals](https://developers.openai.com/api/docs/guides/evals)

# References

- [Zhou et al. 2022 - Large Language Models Are Human-Level Prompt Engineers (APE)](https://arxiv.org/abs/2211.01910)
- [Diao et al. 2023 - Active Prompting with Chain-of-Thought for Large Language Models](https://arxiv.org/abs/2302.12246)
- [Li et al. 2023 - Directional Stimulus Prompting](https://arxiv.org/abs/2302.11520)