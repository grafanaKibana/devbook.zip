---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Keeping an LLM system safe, secure, and truthful — the cross-cutting concern of guardrails, security threats, and hallucination."
tags:
  - FolderNote
publish: true
level:
  - '3'
priority: Medium
status: Done
---

# Intro

Safety is the concern of keeping an LLM system safe, secure, and truthful — and unlike [[Home/AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]], [[Context Engineering]], [[Harness Engineering]], and [[Loop Engineering]], it is not a rung on the steering ladder but a lens applied across all of them. Every rung introduces its own failure surface (an injected instruction in the prompt, poisoned evidence in the context, an over-powered tool in the harness, an unbounded action in the loop), so safety is designed in at each layer rather than bolted on at the end. Like [[Home/AI & ML/LLM/Evaluation/Evaluation|Evaluation]], it spans the whole section.

The three notes in this folder are three faces of one problem, split along a **security-versus-reliability** line:

- [[Guardrails]] — the **defensive controls**: layered checks across input, context, output, and runtime that prevent unsafe actions, bound data exposure, and make failures detectable and recoverable.
- [[OWASP vulnerabilities on AI LLM|OWASP LLM Top 10]] — the **threat taxonomy** those controls answer to: the highest-impact *adversarial* failures, from prompt injection to excessive agency.
- [[Hallucinations]] — the **reliability failure mode** that exists with no attacker at all: fluent, confident output unsupported by evidence, because the model optimizes likelihood, not truth.

The distinction matters for design. Security failures have an adversary and are bounded by controls and least privilege; reliability failures are intrinsic to how the model generates and are bounded by grounding, verification, and evaluation. A complete system needs both.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Where Safety Attaches to the Ladder

Safety is not enforced in one place — each rung owns part of it, which is why the concern is cross-cutting rather than a single note:

- **Prompt and context** — prompt-injection defense lives where instructions and untrusted data meet: keep trusted instructions structurally separated from retrieved or tool-returned content ([[Home/AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]], [[Context Engineering]]). Grounding via [[Home/AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] is also the first-line mitigation for [[Hallucinations]].
- **Harness** — the deterministic controls live here: sandboxing, permission gating, and least-privilege credentials sit in code and infrastructure, not in the prompt ([[Harness Engineering]]).
- **Loop** — human-approval boundaries and the escape hatches for actions the system cannot safely verify are a runtime decision ([[Loop Engineering]]).
- **Measurement** — whether any of it works is answered by [[Home/AI & ML/LLM/Evaluation/Evaluation|Evaluation]]; safety controls are only as good as the tests that exercise them.

## Defense in Depth

The organizing principle across all three children is defense in depth: no single filter is sufficient, and critical controls are enforced in code and infrastructure rather than by asking the model to behave. A prompt-level rule ("do not reveal the system prompt", "never call `delete`") is advisory — it fails under [[OWASP vulnerabilities on AI LLM|prompt injection]] or a poisoned tool description. The durable controls are structural: validate inputs, isolate untrusted content, gate privileged actions, check outputs before they reach downstream systems, and assume any single layer can be bypassed. The goal is not a perfect system but one whose failures are bounded, detectable, and recoverable.

## Questions

> [!QUESTION]- How do security failures and reliability failures differ, and why does the distinction matter?
> - Security failures ([[OWASP vulnerabilities on AI LLM|OWASP Top 10]]) have an adversary crafting input — prompt injection, data exfiltration, excessive agency; they are bounded by controls, isolation, and least privilege
> - Reliability failures ([[Hallucinations]]) have no attacker — the model produces confident but unsupported output because it optimizes likelihood, not truth; they are bounded by grounding, verification, and evaluation
> - The mitigations barely overlap: a perfect content filter does nothing for hallucination, and RAG grounding does nothing for an injection attack — a complete system needs both tracks

> [!QUESTION]- Why are prompt-level guardrails insufficient on their own?
> - A model instruction is advisory: it can be overridden by a higher-priority injected instruction or a poisoned tool/retrieved description (the instruction-vs-data confusion at the heart of prompt injection)
> - Durable controls are structural and live outside the model — input validation, content isolation, permission gates, sandboxed execution, and output checking in code/infrastructure
> - Defense in depth: assume any single layer can be bypassed, so critical actions are gated where the model cannot talk its way past them (see [[Harness Engineering]])

> [!QUESTION]- How does the safety concern map onto the four steering rungs?
> - Prompt/Context: separate trusted instructions from untrusted data to blunt injection; ground with [[Home/AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] to reduce hallucination
> - Harness: enforce sandboxing, least privilege, and permission gates in code, not the prompt
> - Loop: place human-approval boundaries around irreversible or low-confidence actions
> - Safety is orthogonal — it is designed into every rung and measured by [[Home/AI & ML/LLM/Evaluation/Evaluation|Evaluation]], not handled at one step

## References

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) — the canonical threat taxonomy for LLM systems; the source for the [[OWASP vulnerabilities on AI LLM|OWASP LLM Top 10]] child.
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) — practical, layered controls for the top-ranked risk.
- [Azure AI Content Safety (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview) — a managed service implementing several input/output guardrails out of the box.
