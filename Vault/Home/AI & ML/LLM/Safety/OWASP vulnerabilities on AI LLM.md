---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "The OWASP Top 10 for LLM Applications, the highest-impact security failures in LLM systems."
level:
  - "3"
priority: Medium
status: Done
publish: true
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

**Mechanism.** Untrusted input changes model behavior or output in an unintended way. It may be a malicious attempt to bypass instructions or an accidental conflict in ordinary content. Direct injection arrives in a user message. Indirect injection comes from material loaded through [[Home/AI & ML/LLM/Context Engineering/RAG/RAG|RAG]], browsing, or another connector. Multimodal systems add images and audio to the same trust problem.

The dangerous step is usually downstream. A manipulated answer becomes a data leak or destructive action only when the model can reach protected context or invoke an overpowered tool.

**Controls.** Mark untrusted content clearly, screen known attack patterns, and constrain tool calls with strict schemas. The real boundary is privilege: retrieval must enforce the caller's authorization, and application code must approve every consequential action.

## Sensitive Information Disclosure (LLM02)

**Mechanism.** Sensitive data may enter a response from training artifacts, prompt assembly, logs, or an overly broad retrieval scope. The model cannot repair an authorization mistake made before context was built.

Samsung's internal-data incident shows the input side of the risk: confidential code was pasted into an external service. RAG creates an output-side version when authorization exists only in the UI and retrieval returns documents the caller should never receive.

**Controls.** Keep secrets out of prompts, enforce access control during retrieval, and redact protected data at the output boundary. A system-prompt instruction not to reveal credentials is useful guidance, never the enforcement mechanism.

## Excessive Agency (LLM06)

**Mechanism.** The model receives tools with broader permissions than its task requires. Prompt injection can then steer the model into using that borrowed authority.

An assistant with unrestricted production-database access turns a generated mistake into a real write. The same model behind a read-only, tenant-scoped API has a much smaller blast radius.

**Controls.** Scope tools per task, separate reads from writes, and require approval for irreversible operations. Rate and budget limits stop a single failure from repeating without bound.

## Improper Output Handling (LLM05)

**Mechanism.** Model output is passed into a shell, SQL statement, HTML renderer, or external API without validation. Classic injection bugs return because attacker-influenced text crosses into an interpreter.

The source looks internal, but the content is still influenced by users and retrieved documents. Trusting it because "our AI" produced it moves the attack one hop without removing it.

**Controls.** Parse structured responses, parameterize database access, and encode text for its rendering context. Risky execution belongs in a sandbox with a narrow interface. [[Guardrails]] covers the surrounding runtime checks.

# Remaining Vulnerabilities

## Supply Chain (LLM03)

Compromise can enter through model weights, fine-tuning data, plugins, or ordinary dependencies. Record provenance, pin reviewed versions, and treat a model update like a code dependency change.

## Data and Model Poisoning (LLM04)

Poisoned training or fine-tuning data changes model behavior at its source. Public and federated data need explicit provenance and quality gates, followed by behavioral evaluation on security-sensitive cases.

## System Prompt Leakage (LLM07)

This risk covers disclosure of system instructions, business rules, and tool descriptions. Assume the prompt can be observed. Secrets and authorization decisions belong outside it.

## Vector and Embedding Weaknesses (LLM08)

This risk sits in retrieval. Poisoned documents or manipulated representations can make hostile content rank highly. Validate document provenance, enforce tenant boundaries, and test the [[Home/AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] pipeline with adversarial corpus entries.

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

**Control.** Assume bypass is possible. Use filtering to catch cheap attacks and privilege separation to contain the ones that pass.

## LLM Output Treated as Trusted

**Failure.** Model output reaches shells, SQL, or HTML without validation.

**Cause.** The response is mistaken for trusted internal data even though untrusted prompts and documents shaped it.

**Control.** Apply the same parser, parameterization, and encoding rules used at any external boundary.

## Security by System Prompt Instruction

**Failure.** A prompt sentence such as "never reveal secrets" is expected to enforce policy.

**Cause.** Instruction following is probabilistic, and the prompt itself may be disclosed.

**Control.** Put authorization in code and keep tool permissions outside the model's discretion.

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

> [!QUESTION]- Why is prompt injection fundamentally harder to prevent than SQL injection?
> Parameterized SQL gives the database a deterministic split between code and data. A language model interprets both through the same learned behavior, so a delimiter cannot provide the same guarantee. The practical defense contains successful injections with narrow permissions and validated downstream operations.

> [!QUESTION]- Why should system prompts be treated as public rather than secret?
> Prompt extraction cannot be ruled out, so secrecy is an unsafe dependency. A disclosed prompt should reveal no credential and grant no permission. RBAC and tool authorization remain effective even when every instruction is known.

# References

- [OWASP Top 10 for LLM Applications 2025: official risk descriptions (OWASP Foundation)](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [Not what you have signed up for: indirect prompt injection (Greshake et al., 2023)](https://arxiv.org/abs/2302.12173)
- [Lessons From Red Teaming 100 Generative AI Products (Microsoft Research)](https://www.microsoft.com/en-us/research/publication/lessons-from-red-teaming-100-generative-ai-products/)
