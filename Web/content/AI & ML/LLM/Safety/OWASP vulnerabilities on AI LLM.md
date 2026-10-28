---
publish: true
created: 2026-10-28T12:27:02.660Z
modified: 2026-10-28T12:33:02.629Z
published: 2026-10-28T12:33:02.629Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: The OWASP Top 10 for LLM Applications, the highest-impact security failures in LLM systems.
level:
  - "3"
priority: Medium
status: Done
qard-deck: AI & ML
qard-topic: LLM/Safety/OWASP vulnerabilities on AI LLM
flashcard_uid: c24fd7d3
---

The OWASP Top 10 for LLM Applications (2025 edition) is a risk catalog for systems that embed language models. Its central boundary is awkward: untrusted natural language influences a probabilistic model, and the result may drive deterministic code, retrieval, or tool calls. Prompts can mix data with instructions. Model output is therefore untrusted input to the next component.

The 2025 list keeps Prompt Injection at LLM01, covering direct or indirect input that unexpectedly changes model behavior or output. The input may be malicious or accidental, and multimodal systems widen the possible sources. The list also names System Prompt Leakage, Vector and Embedding Weaknesses, and Misinformation as separate risks. But it is a threat-modeling aid rather than a complete control set. Severity still depends on the data and authority attached to a particular application.

# The 2025 List

| ID | Vulnerability | One-line description |
| --- | --- | --- |
| LLM01 | Prompt Injection | Direct or indirect input unexpectedly alters model behavior or output |
| LLM02 | Sensitive Information Disclosure | Model leaks PII, credentials, or proprietary data in responses |
| LLM03 | Supply Chain | Compromised models, training data, plugins, or dependencies |
| LLM04 | Data and Model Poisoning | Manipulated training or fine-tuning data degrades model behavior |
| LLM05 | Improper Output Handling | LLM output trusted as safe input to downstream systems |
| LLM06 | Excessive Agency | Model granted too many permissions, tools, or autonomy |
| LLM07 | System Prompt Leakage | System prompt exposed through adversarial queries |
| LLM08 | Vector and Embedding Weaknesses | RAG retrieval manipulated via poisoned or adversarial embeddings |
| LLM09 | Misinformation | Model generates false content that passes through without verification |
| LLM10 | Unbounded Consumption | Denial-of-wallet or resource exhaustion via crafted queries |

# Risks That Shape the Architecture

## Prompt Injection (LLM01)

**Mechanism.** Untrusted input changes model behavior or output in an unintended way. It may be a malicious attempt to bypass instructions or an accidental conflict in ordinary content. Direct injection arrives in a user message. Indirect injection comes from material loaded through [[AI & ML/LLM/Context Engineering/RAG/RAG|RAG]], browsing, or another connector. Multimodal systems add images and audio to the same trust problem.

The dangerous step is usually downstream. A manipulated answer most often becomes a data leak or destructive action when the model can reach protected context or invoke an overpowered tool. Downstream code that executes or renders the output without validation is another path.

**Controls.** Clear marking of untrusted content, screening for known attack patterns, and strict tool-call schemas reduce the risk. The real boundary is privilege: retrieval must enforce the caller's authorization, and application code must approve every consequential action.

## Sensitive Information Disclosure (LLM02)

**Mechanism.** Sensitive data may enter a response from training artifacts, prompt assembly, logs, or an overly broad retrieval scope. The model cannot repair an authorization mistake made before context was built.

Samsung's internal-data incident shows the input side of the risk: confidential code was pasted into an external service. RAG creates an output-side version when authorization exists only in the UI and retrieval returns documents the caller should never receive.

**Controls.** Secrets stay out of prompts, retrieval enforces access control, and protected data is redacted at the output boundary. A system-prompt instruction not to reveal credentials is useful guidance, never the enforcement mechanism.

## Excessive Agency (LLM06)

**Mechanism.** The model receives tools with broader permissions than its task requires. Prompt injection can then steer the model into using that borrowed authority.

An assistant with unrestricted production-database access turns a generated mistake into a real write. The same model behind a read-only, tenant-scoped API has a much smaller blast radius.

**Controls.** Tools are scoped per task, reads are separated from writes, and irreversible operations require approval. Rate and budget limits stop a single failure from repeating without bound.

## Improper Output Handling (LLM05)

**Mechanism.** Model output is passed into a shell, SQL statement, HTML renderer, or external API without validation. Classic injection bugs return because attacker-influenced text crosses into an interpreter.

The source looks internal, but the content is still influenced by users and retrieved documents. Trusting it because "our AI" produced it moves the attack one hop without removing it.

**Controls.** Structured responses are parsed, database access is parameterized, and text is encoded for its rendering context. Risky execution belongs in a sandbox with a narrow interface. [[Guardrails]] covers the surrounding runtime checks.

# Remaining Vulnerabilities

## Supply Chain (LLM03)

Compromise can enter through model weights, fine-tuning data, plugins, or ordinary dependencies. The controls are recorded provenance, pinned reviewed versions, and the same handling for a model update as for a code dependency change.

## Data and Model Poisoning (LLM04)

Poisoned training or fine-tuning data changes model behavior at its source. Public and federated data need explicit provenance and quality gates, followed by behavioral evaluation on security-sensitive cases.

## System Prompt Leakage (LLM07)

This risk covers disclosure of system instructions, business rules, and tool descriptions. A sound design assumes the prompt can be observed. Secrets and authorization decisions belong outside it.

## Vector and Embedding Weaknesses (LLM08)

This risk sits in retrieval. Poisoned documents or manipulated representations can make hostile content rank highly. Controls include document provenance validation, enforced tenant boundaries, and tests of the [[AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] pipeline with adversarial corpus entries.

## Misinformation (LLM09)

Plausible false content becomes a security problem when it drives a decision or can be exploited at scale. [[Hallucinations]] covers the correctness mechanism. LLM09 focuses on the harm caused when false output is accepted.

## Unbounded Consumption (LLM10)

Long contexts and repeated tool calls can exhaust money or capacity. Hard token budgets and loop limits must be enforced outside the model.

# What Is New Vs Familiar

| LLM Risk | Traditional Analog | What is Genuinely New |
| --- | --- | --- |
| Prompt Injection | SQL Injection, XSS | Instructions and data share a probabilistic interpretation. Indirect and multimodal vectors |
| Sensitive Info Disclosure | Information Leakage | Model memorization and RAG context windows become exfiltration channels |
| Supply Chain | Dependency Confusion | Model weights and training data add artifacts whose behavior is hard to inspect |
| Improper Output Handling | Output Encoding failures | Teams trust model output they would never trust from users |
| Excessive Agency | Broken Access Control | A probabilistic model triggers deterministic tool actions |
| System Prompt Leakage | Source Code Disclosure | Prompt secrecy cannot serve as an authorization control |
| Vector and Embedding Weaknesses | Search poisoning | Retrieval ranking influences which untrusted content enters the model context |

# Pitfalls

## Prompt Injection Has No Complete Fix

**Failure.** A single input filter is treated as a complete defense.

**Cause.** Natural-language interpretation has no parameterization mechanism equivalent to a prepared SQL statement. Delimiters help, but the model may still follow text inside them.

**Control.** The design assumes bypass is possible. Filtering catches cheap attacks, and privilege separation contains the ones that pass.

## LLM Output Treated as Trusted

**Failure.** Model output reaches shells, SQL, or HTML without validation.

**Cause.** The response is mistaken for trusted internal data even though untrusted prompts and documents shaped it.

**Control.** Model output goes through the same parser, parameterization, and encoding rules used at any external boundary.

## Security by System Prompt Instruction

**Failure.** A prompt sentence such as "never reveal secrets" is expected to enforce policy.

**Cause.** Instruction following is probabilistic, and the prompt itself may be disclosed.

**Control.** Authorization lives in code, and tool permissions stay outside the model's discretion.

# Tradeoffs

| Defense Layer | Coverage | Cost | Risk |
| --- | --- | --- | --- |
| Input/output filtering | Medium for known patterns | Low | Novel phrasing bypasses filters. False positives block valid use |
| Privilege separation (least privilege tools) | High for blast-radius reduction | Medium | Does not stop injection itself |
| Human approval | High for a narrow set of consequential actions | High | Approval fatigue turns the control into ceremony |
| Output sanitization (parameterized queries, encoding) | High for classic injection vectors | Low | Does not catch broader semantic manipulation |
| Monitoring and anomaly detection | Medium for visible abuse | Medium | Detection is reactive and noisy |

Privilege separation is the baseline because it limits harm even when the model is manipulated. Every downstream interpreter still needs ordinary secure coding controls. Filters catch familiar attacks, while human approval is reserved for actions where a mistaken execution is expensive or irreversible.

# Questions

> [!qard]- What is prompt injection, and how does indirect prompt injection differ from direct prompt injection?
> Prompt injection is input that changes a language model's behavior or output in a way the application did not intend. Direct and indirect injection differ in where that input enters the model's context.
>
> | Aspect | Direct injection | Indirect injection |
> |---|---|---|
> | Entry point | The user's own message to the model. | External content that the model processes, such as web pages, files, retrieved documents or tool results. |
> | Who can supply it | The person interacting with the system. | Anyone who can influence that content, without access to the conversation. |
> | Example | A chat message telling the model to ignore its instructions and reveal hidden rules. | A web page with hidden instructions that make a summarizing assistant leak the conversation through a link. |
>
> The input can be deliberate or accidental, because ordinary content can also conflict with instructions. Injected text does not have to be visible to people as long as the model parses it, and multimodal systems can receive it through images or other media. Its impact depends largely on what the manipulated model can reach. Access to protected context, or to tools that act, is what turns a manipulated answer into a data leak or a damaging action.
>
> [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

<!-- qard-id: e41e3af4-2925-4cbe-859c-d58567d74dfb -->

> [!qard]- Why is prompt injection harder to prevent than SQL injection?
> Prompt injection is harder to prevent because SQL has a code/data boundary that the database enforces, and language models have no established equivalent. A model receives its instructions and untrusted text through the same natural-language input, so untrusted text can still act as instructions.
>
> | Aspect | SQL injection | Prompt injection |
> |---|---|---|
> | How code and data reach the interpreter | A parameterized query defines the SQL code first and passes values separately. The database treats each bound value as data, whatever it contains. | System instructions, user messages, retrieved documents and tool results all enter the same model context. No mechanism forces the model to treat any part of that context only as data. |
> | Effect of marking the data | Binding a value stops it from changing the query's structure. | Delimiters, labels on untrusted content and input filters lower the risk. The model may still follow instructions inside the marked content, and new phrasings can slip past filters. |
> | Resulting defense | Prevention: a correctly bound value cannot become SQL code. | Containment: bypass is assumed possible, so controls outside the model limit what a manipulated model can do. These controls include least-privilege tools, validation of model output, authorization of each consequential action and human approval for high-risk actions. |
>
> OWASP's 2025 guidance states that it is unclear whether foolproof prevention methods for prompt injection exist. That statement describes current techniques. It does not prove that a stronger boundary can never be built.
>
> [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) · [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

<!-- qard-id: 4c869882-dbf3-4b42-99ec-760b65df4849 -->

> [!qard]- Why should a system prompt not be treated as a secret or authorization boundary?
> A system prompt can be disclosed, and the model follows its instructions only probabilistically. It therefore cannot keep secrets or reliably decide what a caller is allowed to do.
>
> - **Not a secret:** adversarial queries can reveal the prompt. Any API keys, database credentials or other sensitive data placed in it can leak with it. Revealed internal rules, filtering criteria or role descriptions can also help an attacker plan further attacks.
> - **Not an authorization boundary:** an instruction such as "only administrators may delete records" does not stop a manipulated or mistaken model from requesting a deletion. Enforcement belongs in deterministic code or the downstream service, which checks each requested action against the caller's actual permissions.
>
> Secure designs keep credentials and authorization decisions outside the prompt and assume that the prompt may be exposed. That assumption does not make every prompt harmless to publish. It means that the system stays protected if the prompt leaks.
>
> [OWASP LLM07:2025 System Prompt Leakage](https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/) · [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

# References

- [OWASP Top 10 for LLM Applications 2025: official risk descriptions (OWASP Foundation)](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [Not what you have signed up for: indirect prompt injection (Greshake et al., 2023)](https://arxiv.org/abs/2302.12173)
- [Lessons From Red Teaming 100 Generative AI Products (Microsoft Research)](https://www.microsoft.com/en-us/research/publication/lessons-from-red-teaming-100-generative-ai-products/)
