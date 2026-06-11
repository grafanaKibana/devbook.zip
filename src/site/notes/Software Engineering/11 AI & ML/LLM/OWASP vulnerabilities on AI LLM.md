---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/owasp-vulnerabilities-on-ai-llm/","dg-note-properties":{"topic":["AI & ML"],"subtopic":["LLM"],"level":["3"],"priority":"Medium","status":"Done"}}
---


# Intro

The OWASP Top 10 for LLM Applications (2025 edition) catalogs the highest-impact security failures in systems that integrate large language models. Unlike the classic OWASP Top 10, this list focuses on a mixed boundary: natural-language inputs interpreted probabilistically by a model, then translated into deterministic actions like tool calls, retrieval, and API execution. This matters because prompts can act as both data and instructions, model outputs are untrusted by default, and agent architectures often grant implicit authority over tools and data. The 2025 refresh keeps Prompt Injection as the top risk and expands it to multimodal vectors. It also adds System Prompt Leakage (LLM07), Vector and Embedding Weaknesses (LLM08), and Misinformation (LLM09) to reflect production incidents and modern RAG and agent behavior.

## The 2025 List

| ID | Vulnerability | One-line description |
| --- | --- | --- |
| LLM01 | Prompt Injection | Attacker-crafted input overrides system instructions |
| LLM02 | Sensitive Information Disclosure | Model leaks PII, credentials, or proprietary data in responses |
| LLM03 | Supply Chain Vulnerabilities | Compromised models, training data, plugins, or dependencies |
| LLM04 | Data and Model Poisoning | Manipulated training or fine-tuning data degrades model behavior |
| LLM05 | Improper Output Handling | LLM output trusted as safe input to downstream systems |
| LLM06 | Excessive Agency | Model granted too many permissions, tools, or autonomy |
| LLM07 | System Prompt Leakage | System prompt exposed through adversarial queries |
| LLM08 | Vector and Embedding Weaknesses | RAG retrieval manipulated via poisoned or adversarial embeddings |
| LLM09 | Misinformation | Model generates false content that passes through without verification |
| LLM10 | Unbounded Consumption | Denial-of-wallet or resource exhaustion via crafted queries |

## Critical Vulnerabilities

### Prompt Injection (LLM01)

**Mechanism**: The model receives attacker instructions in the same natural-language channel as legitimate instructions, so it may follow malicious text even when system guidance says not to. **Direct injection** is the obvious case (`Ignore previous instructions and ...`) entered in a user prompt. **Indirect injection** is more dangerous in production: the attacker plants instructions in content that gets retrieved through [[Software Engineering/11 AI & ML/LLM/RAG/RAG\|RAG]] or browsing. **Multimodal injection** (new in 2025) extends this to hidden instructions in images or audio that multimodal models process.

**Concrete examples**: Slack AI indirect injection was used to extract private channel data, and Microsoft Copilot retrieved poisoned SharePoint documents containing embedded instructions. Both cases show why retrieval pathways become execution pathways when trust boundaries are unclear.

**Mitigations**: use input and output filtering, enforce privilege separation so the LLM cannot access unnecessary data, apply Spotlighting-style delimiting between trusted instructions and untrusted content, and constrain tool invocation through strict structured schemas.

### Sensitive Information Disclosure (LLM02)

**Mechanism**: LLM systems can disclose sensitive data through memorized training artifacts, unsafe prompt and context assembly, or overly broad retrieval scope. Leaks include PII, credentials, and proprietary internal material.

**Concrete examples**: Samsung engineers pasted proprietary source code into ChatGPT, creating a real production disclosure event. In RAG systems, retrieval can expose documents a user should not see when access control is applied only at the UI layer instead of the retrieval layer.

**Mitigations**: add output filtering and redaction for sensitive entities, use differential privacy during training where applicable, enforce strict RBAC at retrieval time, and instruct the system prompt to never echo credentials.

### Excessive Agency (LLM06)

**Mechanism**: The model is connected to tools (email, databases, files, APIs) with broader permissions than required. Prompt injection then becomes an authority escalation path because the attacker effectively acts through the model's permissions.

**Concrete example**: An assistant with write access to a production database can be prompt-injected into destructive operations like dropping tables or data exfiltration.

**Mitigations**: apply least privilege to every tool, separate read and write tools, require human approval for destructive actions, and rate-limit tool invocation to reduce automation abuse.

### Improper Output Handling (LLM05)

**Mechanism**: Teams trust model output and pass it directly into shells, SQL, HTML rendering, or external APIs without sanitization. This recreates classic injection classes (XSS, SQLi, command injection), but now the immediate source is model output rather than direct user text.

**Concrete pattern**: teams that correctly sanitize user input still skip validation for LLM output because it appears to come from "our AI." That assumption collapses once attackers influence output via injection or adversarial retrieval.

**Mitigations**: treat every LLM response as untrusted input; parameterize database access, encode output for rendering context, and run risky execution paths in sandboxed environments. See [[Software Engineering/11 AI & ML/LLM/Guardrails\|Guardrails]].

## Remaining Vulnerabilities

### Supply Chain Vulnerabilities (LLM03)

Compromise can occur in base models, fine-tuning datasets, plugins, or other dependencies that feed model behavior. Treat model and plugin provenance as a first-class security control: verify origin, pin versions, and audit third-party extensions.

### Data and Model Poisoning (LLM04)

Adversaries can inject biased or malicious data during training or fine-tuning so model behavior degrades or shifts over time. Federated learning and public datasets are particularly exposed because trust and data quality boundaries are weak; monitor post-training behavior drift.

### System Prompt Leakage (LLM07)

New in 2025, this risk captures adversarial extraction of the system prompt itself, including business rules, guardrail logic, and tool definitions. Treat system prompts as discoverable artifacts, not hidden secrets.

### Vector and Embedding Weaknesses (LLM08)

New in 2025, this risk targets retrieval layers: poisoned corpus documents and adversarial embeddings can make irrelevant or malicious content rank highly. Monitor embedding distribution drift, validate document provenance, and harden [[Software Engineering/11 AI & ML/LLM/RAG/RAG\|RAG]] ingestion pipelines.

### Misinformation (LLM09)

New in 2025, this frames plausible false generation as a security issue when adversaries exploit model confidence to spread false claims. This overlaps with [[Software Engineering/11 AI & ML/LLM/Hallucinations\|Hallucinations]], but the emphasis here is exploitability and downstream impact.

### Unbounded Consumption (LLM10)

Adversaries can trigger denial-of-wallet by forcing high token usage, oversized contexts, or tool-call loops. Apply hard budget caps, per-request token limits, and agent-loop circuit breakers.

## What Is New vs Familiar

| LLM Risk | Traditional Analog | What is Genuinely New |
| --- | --- | --- |
| Prompt Injection | SQL Injection, XSS | Input is natural language with no strict syntax delimiter; indirect and multimodal vectors |
| Sensitive Info Disclosure | Information Leakage | Model memorization and RAG context windows become exfiltration channels |
| Supply Chain | Dependency Confusion | Model weights are opaque binaries and can be poisoned during fine-tuning |
| Improper Output Handling | Output Encoding failures | Teams trust model output they would never trust from users |
| Excessive Agency | Broken Access Control | A probabilistic model triggers deterministic tool actions |
| System Prompt Leakage | Source Code Disclosure | Reliable prevention of extraction is not realistic; assume discoverability |
| Vector and Embedding Weaknesses | No direct analog | Retrieval ranking becomes a new attack surface in RAG architectures |

## Pitfalls

### Prompt Injection Has No Complete Fix

**What goes wrong**: teams deploy a single control, such as input filtering, and declare prompt injection solved.

**Why it happens**: unlike SQL injection, there is no deterministic code-data separator in natural language; the model cannot perfectly distinguish instruction from data.

**How to avoid it**: design layered defenses as a baseline: filtering for known patterns, privilege separation to limit blast radius, and monitoring for exploit behavior.

### LLM Output Treated as Trusted

**What goes wrong**: model output is passed directly into shells, SQL, or HTML contexts without sanitization.

**Why it happens**: teams mentally classify LLM responses as internal system output instead of attacker-influenceable input.

**How to avoid it**: enforce the same controls used for external input: parameterized queries, context-appropriate encoding, and sandboxed execution.

### Security by System Prompt Instruction

**What goes wrong**: critical controls are delegated to natural-language instructions such as "never reveal secrets" or "never perform unauthorized actions."

**Why it happens**: instruction-following is probabilistic and system prompts are extractable; prompt text is guidance, not enforcement.

**How to avoid it**: move enforcement to deterministic code paths: RBAC, tool permission boundaries, and output filtering.

## Tradeoffs

| Defense Layer | Coverage | Cost | Risk |
| --- | --- | --- | --- |
| Input/output filtering | Medium — catches known patterns | Low — regex or classifier controls | Novel phrasings bypass filters; false positives block valid use |
| Privilege separation (least privilege tools) | High — limits blast radius | Medium — architecture and permission redesign | Does not stop injection itself; limits post-compromise impact |
| Human-in-the-loop | High — catches novel and high-risk actions | High — added latency and operational overhead | Approval fatigue and poor scalability |
| Output sanitization (parameterized queries, encoding) | High for classic injection vectors | Low — standard secure coding practice | Covers code injection, not broader semantic manipulation |
| Monitoring and anomaly detection | Medium — detects active exploitation | Medium — telemetry and alerting infrastructure | Reactive control with alert fatigue risk |

**Decision rule**: Start with privilege separation as a non-negotiable baseline. Add output sanitization on every downstream interface. Layer filtering for known attack patterns. Use human approval only for high-stakes destructive actions. Monitor all tool and retrieval pathways for exploit signals.

## Questions

> [!QUESTION]- Why is prompt injection fundamentally harder to prevent than SQL injection?
  > - SQL injection is mainly a syntax boundary problem, and parameterized queries create a deterministic code-data split.
  > - Prompt injection is a semantic boundary problem where instructions and data coexist in natural language.
  > - There is no universally reliable delimiter the model can always respect across direct, indirect, and multimodal inputs.
  > - The practical defense model is layered and probabilistic: filtering, monitoring, privilege separation, and output sanitization.
  > - **Tradeoff**: stronger defense adds latency and engineering complexity, so depth of controls should match expected blast radius.

> [!QUESTION]- How does Excessive Agency (LLM06) compound with Prompt Injection (LLM01)?
  > - Prompt injection gives an attacker influence over model decisions.
  > - Excessive agency converts that influence into real actions through tools and permissions.
  > - Combined, the attacker effectively operates with the model's authority boundary.
  > - Mitigation must address both sides: reduce injection success rate and reduce available authority after compromise.
  > - **Tradeoff**: tighter permissions reduce automation convenience and user experience, but align capabilities with trust boundaries.

> [!QUESTION]- Why should system prompts be treated as public rather than secret?
  > - Adversarial prompting and jailbreak techniques can extract hidden instructions in real systems.
  > - Security that depends on prompt secrecy is obscurity, not enforceable control.
  > - System prompts should be written as if attackers can read them.
  > - Deterministic enforcement belongs in RBAC, output filtering, and tool permission architecture.
  > - **Tradeoff**: this shifts effort from prompt design to code controls, but produces more auditable and durable security.

## References

- [OWASP Top 10 for LLM Applications 2025 — official project page with full vulnerability descriptions and mitigations (OWASP Foundation)](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [Not what you have signed up for — indirect prompt injection attacks on LLM-integrated applications (Greshake et al., 2023)](https://arxiv.org/abs/2302.12173) — foundational paper that demonstrates indirect injection through retrieved documents.
- [Prompt injection and jailbreaking — taxonomy of attack vectors and defenses (OWASP LLM01 entry)](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — detailed attack and mitigation reference for LLM01.
- [Spotlighting — Microsoft approach to prompt injection defense by delimiting data and instructions (Microsoft)](https://www.microsoft.com/en-us/security/blog/2024/06/26/mitigating-skeleton-key-a-new-type-of-generative-ai-jailbreak-technique/) — practical delimiter-based hardening approach for mixed-trust prompt content.
- [Embrace the Red — lessons from red-teaming over 100 generative AI products at Microsoft (Microsoft AI Red Team)](https://www.microsoft.com/en-us/security/blog/2025/02/04/embrace-the-red-top-10-lessons-from-red-teaming-over-100-generative-ai-products-at-microsoft/) — practitioner-focused lessons on recurring production failure modes.
- [LLM AI Security and Governance Checklist — operational security controls for LLM deployment (OWASP)](https://genai.owasp.org/resource/llm-ai-security-governance-checklist/) — deployment-oriented control checklist.
- [Samsung employees leak proprietary data via ChatGPT — real-world information disclosure incident (TechCrunch, 2023)](https://techcrunch.com/2023/05/02/samsung-bans-use-of-generative-ai-tools-like-chatgpt-after-internal-data-leak/) — concrete LLM02 incident in an enterprise setting.
- [AI supply chain security risks — compromised models, plugins, and training data (OWASP LLM03 entry)](https://genai.owasp.org/llmrisk/llm03-supply-chain/) — supply-chain attack surface specific to LLM systems.
- [Reduce hallucinations — grounding, citations, and abstention patterns (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) — practical implementation guidance for grounded, validated responses.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML\|11 AI & ML]]
>
> **Topics**
> - [[Software Engineering/11 AI & ML/LLM/Agents/Agents\|Agents]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation\|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Prompting\|Prompting]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG\|RAG]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Context Engineering\|Context Engineering]]
> - [[Software Engineering/11 AI & ML/LLM/Embeddings\|Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/Fine-tuning\|Fine-tuning]]
> - [[Software Engineering/11 AI & ML/LLM/Generation\|Generation]]
> - [[Software Engineering/11 AI & ML/LLM/Guardrails\|Guardrails]]
> - [[Software Engineering/11 AI & ML/LLM/Hallucinations\|Hallucinations]]
> - [[Software Engineering/11 AI & ML/LLM/Model Selection and Routing\|Model Selection and Routing]]
<!-- whats-next:end -->
