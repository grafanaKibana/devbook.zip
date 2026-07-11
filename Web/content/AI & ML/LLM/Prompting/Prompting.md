---
publish: true
created: 2026-07-11T21:44:29.896Z
modified: 2026-07-11T21:44:29.897Z
published: 2026-07-11T21:44:29.897Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Turning vague intentions into precise, testable model tasks: anatomy, settings, and role prompting."
level:
  - "3"
status: Done
priority: Medium
---

# Intro

Prompt engineering is the practice of turning a vague user intention into a precise model task. It matters because LLMs are probabilistic generators: small wording and setting changes can shift correctness, style, and reliability. In production, a prompt is part of your system interface, so you should treat it like code: explicit, testable, and versioned. This hub covers the foundations, while child pages in this folder go deeper into in-context learning, reasoning, prompt composition, and automated optimization.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Prompting section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Automated Prompt Optimization">Automated Prompt Optimization</span></span></div><p class="db-card-summary">Repeatable loops that generate, evaluate, and select prompt candidates against a validation set.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Prompting/Automated Prompt Optimization.md" data-tooltip-position="top" aria-label="Automated Prompt Optimization">Automated Prompt Optimization</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="In-Context Learning">In-Context Learning</span></span></div><p class="db-card-summary">An LLM adapting to a task from prompt examples without weight updates.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Prompting/In-Context Learning.md" data-tooltip-position="top" aria-label="In-Context Learning">In-Context Learning</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Prompt Composition">Prompt Composition</span></span></div><p class="db-card-summary">Decomposing complex tasks into multiple LLM calls for reliability and debuggability.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Prompting/Prompt Composition.md" data-tooltip-position="top" aria-label="Prompt Composition">Prompt Composition</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Reasoning Techniques">Reasoning Techniques</span></span></div><p class="db-card-summary">Making intermediate reasoning explicit with Chain-of-Thought, Self-Consistency, and Tree of Thoughts.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Prompting/Reasoning Techniques.md" data-tooltip-position="top" aria-label="Reasoning Techniques">Reasoning Techniques</a></span></article></div><style>
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--card-accent, 125, 125, 125));
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}

.folder-structure-map {
\--card-accent: 16, 185, 129;
\--map-gap: 0.75rem;
width: 100%;
box-sizing: border-box;
margin: 0.5rem 0 0.75rem;
container-name: folder-map;
container-type: inline-size;
}
.folder-map-children {
/\* Flex (not grid) so each card sizes to its own title — a long title widens
its card and pushes to another row instead of being truncated, and rows
grow to fill the width with no empty tracks when there are few cards. _/
display: flex;
flex-wrap: wrap;
gap: var(--map-gap);
}
.folder-map-node {
/_ No overflow:hidden on a flex item whose min-width:auto collapses to 0: that
would let the card shrink below its title + note-count and clip them.
Without it the card's min size is its content, so long titles widen the card
(and wrap to another row) instead of being cut off. The shared ::before
accent uses border-radius:inherit to stay inside the rounded corners. _/
flex: 1 1 12rem;
min-height: 2.75rem;
\--db-card-pad: 0.5rem 0.75rem;
}
.folder-map-node .db-card-body {
min-height: 2.75rem;
justify-content: center;
}
.folder-map-node-heading {
display: flex;
align-items: center;
justify-content: space-between;
gap: 0.75rem;
}
.folder-map-node-title-group {
display: flex;
align-items: center;
gap: 0.5rem;
}
.folder-map-node .db-card-title {
white-space: nowrap;
}
.folder-map-node-count {
display: block;
flex: 0 0 auto;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
white-space: nowrap;
}
.folder-map-node .db-card-summary {
display: none;
}
/_ Empty-section placeholder: reuses the full .db-card chrome (border, accent
glow gradient, background) so it reads as a regular sub-folder card. It only
differs in being non-interactive — no pointer cursor, no hover lift — with the
text centered in the card. _/
.folder-map-node-empty {
cursor: default;
}
.folder-map-node-empty:hover,
.folder-map-node-empty:focus-within {
border-color: var(--background-modifier-border, var(--lightgray, #d8dee9));
background-color: var(--background-primary, var(--light, #ffffff));
box-shadow: 0 0 0 rgba(0, 0, 0, 0);
transform: none;
}
.folder-map-node-empty:hover::before,
.folder-map-node-empty:focus-within::before { opacity: 0.78; }
/_ Higher specificity than the @container .folder-map-node .db-card-body
rules below so the placeholder stays vertically centered at every width. \*/
.folder-structure-map .folder-map-node-empty .db-card-body {
justify-content: center;
align-items: center;
text-align: center;
}
.folder-map-empty-text {
color: var(--text-normal, var(--dark, #1f2937));
font-size: 1rem;
font-weight: 400;
font-style: normal;
line-height: 1.25;
}
@container folder-map (min-width: 40rem) {
.folder-map-node {
min-height: 6rem;
\--db-card-pad: 0.85rem 0.9rem;
}
.folder-map-node .db-card-body {
min-height: 6rem;
justify-content: flex-start;
}
.folder-map-node .db-card-summary { display: block; }
}
@container folder-map (min-width: 64rem) {
.folder-map-node,
.folder-map-node .db-card-body { min-height: 6.75rem; }
} </style></nav>

## Prompt Anatomy

Most effective prompts combine four elements:

- **Instruction**: the exact task to perform.
- **Context**: domain facts, constraints, or audience details.
- **Input data**: the concrete content to process now.
- **Output indicator**: the required structure for the answer.

Example with all four elements:

```text
Instruction: Extract security risks from the incident note.
Context: You are helping a SOC analyst. Keep findings actionable and concise.
Input data: "API keys were stored in plain text logs for 3 days in staging."
Output indicator: Return JSON with fields risk, impact, mitigation.
```

Mechanically, each element removes uncertainty: instruction narrows behavior, context biases interpretation, input anchors the specific case, and output indicator constrains format.

## LLM Settings

Prompt text controls intent, while generation settings control sampling behavior and output boundaries.

- **Temperature**: higher values increase randomness; lower values make outputs more deterministic.
- **Top-p**: limits candidate tokens to a probability mass (nucleus); lower values are more conservative.
- **Max tokens**: hard cap on generated length, useful for cost and latency control.
- **Stop sequences**: explicit strings that terminate output, useful for schemas and multi-part protocols.

Starting ranges below are heuristics, not universal defaults. Validate them with task-specific evals for your chosen model before using them in production.

| Task type | Temperature | Top-p | Max tokens | Stop sequences |
|---|---:|---:|---:|---|
| Creative writing | 0.8-1.0 | 0.9-1.0 | 600-1200 | Optional section markers |
| Classification | 0.0-0.2 | 0.1-0.4 | 20-80 | Label boundary, newline |
| Code generation | 0.1-0.3 | 0.8-1.0 | 200-800 | \`\`\` or custom delimiter |

Practical rule: tune `temperature` first, keep `top-p` near default unless you have a measured reason to change both.

## Instruction Prompting

Instruction prompting is direct natural-language control: tell the model exactly what to do, how to do it, and how to format the result. It works best when instructions are specific, observable, and testable.

Good instruction pattern:

- Task verb first: classify, extract, summarize, transform.
- Explicit format: JSON schema, bullet count, table columns, or label set.
- Constraints: length, forbidden content, confidence threshold, tone.

Example 1 (name normalization):

```text
Convert the person name to this format: <Last name>, <First name>.
If suffix exists, keep it after first name.
Input: "Nikita Reshetnik"
Output:
```

Example 2 (PII redaction):

```text
Redact all personal data from the email.
Replace names with [NAME], phones with [PHONE], and emails with [EMAIL].
Return only redacted text.
Input: "Hi John, call me at 410-805-2345."
```

If outputs drift, tighten the output indicator before adding complexity.

## Role Prompting

Role prompting assigns a perspective that shapes style, depth, and framing. It does not replace task instructions; it modifies how the model executes them.

- Use role prompting when voice or audience matters.
- Pair role with boundaries so style does not override accuracy.
- Prefer concrete roles over vague ones.

Illustrative contrast:

```text
Standard: Write a review of this pizza place.
Role-based: You are a food critic writing for a city newspaper. Write a review of this pizza place in 120-150 words, focusing on crust texture, sauce balance, and service.
```

The role-based version typically yields richer domain vocabulary and better evaluative structure because the model has a clearer perspective prior.

## Choosing a Technique

Use this quick decision flow for first-pass prompt design:

```mermaid
flowchart TD
    A[Start with task goal] --> B{Simple direct task}
    B -->|Yes| C[Use instruction or zero shot]
    B -->|No| D{Need strict output shape}
    D -->|Yes| E[Use few shot examples]
    D -->|No| F{Needs deeper reasoning}
    F -->|Yes| G[Use reasoning scaffolding plus verification]
    F -->|No| H{Multiple dependent steps}
    H -->|Yes| I[Use prompt chaining]
    H -->|No| J[Use role plus instruction]
    C --> K[Iterate with meta prompting]
    E --> K
    G --> K
    I --> K
    J --> K
```

For deeper implementation patterns, use targeted follow-ups such as [[In-Context Learning]] when format consistency is weak and [[Prompt Composition]] when one prompt is not enough. Prefer verifiable outputs over eliciting hidden reasoning traces.

## Pitfalls

- **Indirect prompt injection from retrieved content**: if documents, web pages, or tool results include malicious instructions, the model may treat them as higher-priority guidance and perform unsafe actions. This happens when instruction and data channels are mixed. Mitigate by isolating trusted instructions, treating retrieved text as untrusted input, and enforcing tool allowlists and output validation.
- **Valid-looking but wrong structured output**: an answer can match your JSON or table format while containing incorrect fields or invented values. This happens because structure constraints do not guarantee factual correctness. Mitigate with schema validation plus semantic checks (required fields, value ranges, and source-grounded assertions).
- **Token budget collapse in multi-step prompts**: long context plus verbose generations can truncate critical instructions or examples, causing silent quality drops. This happens when `max tokens` and context size are not managed together. Mitigate by trimming context, using stop sequences, and monitoring completion length and truncation rate.

## Questions

> [!QUESTION]- Why do prompt anatomy and model settings have to be designed together?
>
> - Prompt text defines intent and constraints, settings define sampling behavior.
> - A precise prompt can still fail with overly random settings.
> - Conservative settings can still produce poor output if instructions are ambiguous.
> - Reliable systems tune both and evaluate with task-specific metrics.

> [!QUESTION]- When should you prefer few-shot prompting over pure instruction prompting?
>
> - When output format is strict or hard to describe in words.
> - When label boundaries are subtle and examples clarify decision edges.
> - When consistency matters more than novelty.
> - Start with minimal examples, then add edge cases.

> [!QUESTION]- How would you debug a prompt that is accurate but too verbose and expensive?
>
> - Tighten output indicator with length limits and schema.
> - Lower `max tokens` and add stop sequences.
> - Keep `temperature` low for deterministic concise tasks.
> - Evaluate token usage and failure rate after each change.

## References

- [Prompt Engineering Guide - Basics](https://www.promptingguide.ai/introduction/basics)
- [Prompt Engineering Guide - Prompt Elements](https://www.promptingguide.ai/introduction/elements)
- [Prompt Engineering Guide - Model Settings](https://www.promptingguide.ai/introduction/settings)
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic Prompt Engineering Overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [Simon Willison - Delimiters won't save you from prompt injection](https://simonwillison.net/2023/May/11/delimiters-wont-save-you/)
