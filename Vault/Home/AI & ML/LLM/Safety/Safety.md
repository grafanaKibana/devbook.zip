---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Applying guardrails across an LLM system to limit security threats and unsupported output."
tags: [FolderNote]
publish: true
level:
  - "3"
priority: Medium
status: Done
qard-deck: "AI & ML"
qard-topic: "LLM/Safety/Safety"
flashcard_uid: "920e124b"
---

Safety cuts across the whole LLM system. [[Home/AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] can expose an instruction boundary, while [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] can admit poisoned evidence. [[Home/AI & ML/LLM/Harness Engineering/Harness Engineering|Harness Engineering]] may expose an overpowered tool, and [[Home/AI & ML/LLM/Loop Engineering/Loop Engineering|Loop Engineering]] can let a bad action repeat. Safety belongs in every layer, much like [[Home/AI & ML/LLM/Evaluation/Evaluation|Evaluation]].

The folder divides the problem along a security-versus-reliability boundary:

- [[Guardrails]] describes the defensive controls applied around inputs, outputs, and runtime actions.
- [[OWASP vulnerabilities on AI LLM|OWASP LLM Top 10]] organizes adversarial failures such as prompt injection and excessive agency.
- [[Hallucinations]] covers unsupported output that appears without an attacker because the model predicts likely tokens rather than verifying truth.

The distinction changes the response. Security threat modeling considers how an adversary could exploit the system, so it calls for isolation, policy, and least privilege. Those controls also contain accidents such as an overpowered agent disclosing data without malicious input. Reliability failures arise from generation itself and need grounding plus verification. The categories can overlap, and one set of controls cannot replace the other.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Where Safety Attaches to the Ladder

Each runtime layer owns a different part of the safety boundary:

- **Prompt and context** keep trusted instructions separate from retrieved or tool-returned content ([[Home/AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]], [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]]). Grounding through [[Home/AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] also reduces some [[Hallucinations]].
- **Harness** enforces deterministic controls such as sandboxing, permission gates, and least-privilege credentials in code ([[Home/AI & ML/LLM/Harness Engineering/Harness Engineering|Harness Engineering]]).
- **Loop** pauses for human approval when an action is irreversible or cannot be checked safely ([[Home/AI & ML/LLM/Loop Engineering/Loop Engineering|Loop Engineering]]).
- **Measurement** uses the offline cases, release gates, and production signals in [[Home/AI & ML/LLM/Evaluation/Evaluation|Evaluation]]. An untested safety control is only an assumption.

# Defense in Depth

Defense in depth assumes that any single control can fail. A prompt rule such as "never call `delete`" is advisory and may collapse under [[OWASP vulnerabilities on AI LLM|prompt injection]] or a poisoned tool description. Structural controls hold outside the model: validate inputs, isolate untrusted content, gate privileged actions, and check outputs before downstream systems consume them.

Perfection is the wrong target. The practical target is a system where failures have a limited blast radius and produce evidence that makes recovery possible.

# Questions

> [!qard]- How do security failures and reliability failures differ, and why does the distinction matter?
> Security failures include unauthorized disclosure, access, or actions, whether triggered by malicious input or an ordinary model mistake. Reliability failures concern incorrect or unsupported output. One incident can be both: a hallucinated tool request can cause an unauthorized action. Least privilege, authorization, and isolation limit security impact; grounding, claim checks, and evaluation address answer support. [OWASP LLM06: Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) · [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

> [!qard]- Why are prompt-level guardrails insufficient on their own?
> A prompt can guide behavior, but it cannot enforce permissions or safely validate every generated value. The executor must validate output for its destination and authorize each action in code or the downstream service. Least privilege and sandboxing limit impact; require human approval when the action’s consequences justify it. [OWASP LLM05: Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/) · [OWASP LLM06: Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

# References

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
