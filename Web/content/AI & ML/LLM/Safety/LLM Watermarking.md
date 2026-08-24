---
publish: true
created: 2026-08-23T17:59:45.849Z
modified: 2026-08-24T13:55:09.085Z
published: 2026-08-24T13:55:09.085Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Embedding and detecting a keyed statistical pattern in LLM token choices without adding visible markers.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

LLM text watermarking leaves a keyed statistical pattern in the token choices made during generation. Nothing visible is added to the response: there are no hidden characters, metadata fields, or extra tokens. The detector instead asks whether the sequence of choices is unusually consistent with the sampling decisions produced by a particular watermark key.

This makes a watermark different from a general AI-text classifier. A classifier looks for learned traits of machine-written text and may be applied to any passage. A watermark detector checks for a signal deliberately introduced by a cooperating model provider. A positive result is evidence that the corresponding model was involved; it is not proof of who wrote the text, who owns it, or whether every word came from the model.

# How Generative Watermarking Works

[[AI & ML/LLM/Generation|Generation]] normally samples each next token from a probability distribution conditioned on the preceding text. A generative watermark changes how randomness is used inside that sampling step:

1. The model produces its next-token distribution after controls such as temperature and top-p have been applied.
2. A pseudorandom seed is derived from a secret watermark key and the recent token context.
3. The sampler uses that seed to prefer particular candidates while staying within choices the model already considers plausible.
4. Repeating this process creates a correlation between the key, the context, and the emitted tokens.
5. A detector reconstructs the keyed scores from the finished text and compares their aggregate with a decision threshold.

SynthID-Text implements this with **Tournament sampling**. It samples several candidate tokens from the model distribution, pairs them, and lets keyed pseudorandom scoring functions select the winner of each round. The final token therefore tends to score highly under those functions. Detection averages the same scores across the passage:

$$
\operatorname{Score}(x)=\frac{1}{mT}\sum_{t=1}^{T}\sum_{\ell=1}^{m}g_\ell(x_t,r_t)
$$

Here, $T$ is the number of scored tokens, $m$ is the number of tournament layers, $r_t$ is the context-and-key-derived seed, and $g_\ell$ is a keyed scoring function. Watermarked text should accumulate a higher score than unwatermarked text, but the result remains statistical rather than absolute.

# Quality and Detectability

Watermark strength competes with output quality and diversity. A **non-distortionary** configuration preserves the model's output distribution at a defined scope when averaged over watermark seeds. SynthID-Text's production configuration was designed to preserve response quality while accepting some reduction in diversity between repeated responses. A stronger, distortionary configuration makes detection easier by changing the distribution more aggressively, at the cost of some quality.

The SynthID-Text study found no statistically significant quality difference between watermarked and unwatermarked outputs in standard evaluations, a controlled human preference study, or feedback from approximately 20 million live Gemini responses. Its measured sampling overhead was also small relative to model inference. These results establish production feasibility for the evaluated configurations; they do not make every watermarking method quality-neutral.

Detection improves with two sources of evidence:

- **Longer text.** More model-selected tokens provide more observations, so the score separates more reliably from chance.
- **Higher-entropy choices.** When several next tokens are plausible, the sampler has room to encode the keyed preference without choosing an implausible token.

The signal is therefore weak in short passages and low-entropy output. Exact facts, constrained code, and light proofreading leave few interchangeable choices. Translations and original prose provide more opportunities because the model chooses most of the wording.

# Limits

- **Absence is inconclusive.** A missing or weak signal may mean the text is human-written, produced by another model, too short, heavily constrained, lightly edited, or scrubbed through rewriting.
- **Presence provides limited evidence.** Detection cannot distinguish original generation from substantial model editing, and it carries no user, organization, or conversation identity.
- **Editing removes evidence.** Light edits may leave enough signal to detect, while paraphrasing and complete rewrites progressively destroy the keyed correlations.
- **Coverage requires cooperation.** Providers must apply a watermark during generation. Models or deployments that do not participate remain outside that detector's coverage.
- **Errors still need policy.** A threshold trades false positives against false negatives. High-stakes uses need calibrated thresholds and an abstention result when the evidence is uncertain.
- **The mechanism is attackable.** Stealing, spoofing, and scrubbing watermarks remain active research problems, especially for openly distributed models.

A watermark is therefore an attribution signal, not a universal AI detector or an authorship verdict. It is most useful alongside provenance records, content credentials for file formats that support them, and process-level disclosure rather than as the sole basis for punishment or access decisions.

# References

- [How Claude's text watermark works](https://www.anthropic.com/news/claude-text-watermark)
- [Scalable watermarking for identifying large language model outputs](https://www.nature.com/articles/s41586-024-08025-4)
