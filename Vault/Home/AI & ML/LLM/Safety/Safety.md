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

<!-- qard-id: 025fc250-bb7e-45c2-978e-cb3b569c5e6b -->
> [!qard]- How do security failures and reliability failures differ, and why does the distinction matter?
> A security failure breaks a protection boundary: data is disclosed, or an access or action happens that should not be allowed. An attacker can cause it, and so can an ordinary model mistake. A reliability failure is incorrect or unsupported output, and it can occur with no attacker at all. The distinction matters because each type of failure is limited by different controls, and neither set of controls replaces the other.
> 
> | Aspect | Security failure | Reliability failure |
> |---|---|---|
> | What goes wrong | Unauthorized disclosure, access or action. | An incorrect, unsupported or confabulated answer. |
> | Typical cause | Prompt injection or other hostile input, or a model error in a system that gives the model too much authority. | Generation itself; no adversary is needed. |
> | Controls | Least privilege, authorization enforced outside the model, and isolation. They limit the damage whatever produced the bad request. | Grounding in evidence, checking claims against sources, and evaluating answer quality. |
> | What those controls do not fix | A tightly permissioned system can still give a wrong answer. | Grounding and claim checks do not stop a manipulated or mistaken request from running a privileged action. |
> 
> One incident can be both. A hallucinated tool call is a reliability failure. It also becomes a security incident when an overprivileged agent executes it and the result is unauthorized disclosure or access, or a damaging action. If the agent lacked permission for that action, enforcement outside the model would refuse the call, and the error would stay a reliability failure.
> 
> [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) · [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

<!-- qard-id: 5ff9fec5-3943-4ab8-9715-3337c068516c -->
> [!qard]- Why are prompt-level guardrails insufficient on their own?
> Prompt-level guardrails are insufficient on their own because a prompt only influences what the model generates. The prompt cannot enforce anything at the point where that output is used. The model also follows instructions probabilistically, so prompt injection or an ordinary model error can make it ignore a rule such as "never call `delete`".
> 
> Enforcement therefore happens in deterministic code at the points where model output takes effect:
> 
> - **Output handling:** the code that consumes model output treats it as untrusted input. It validates or encodes the output for its destination, for example with parameterized SQL, context-aware HTML encoding or schema checks on tool arguments.
> - **Authorization:** application code or the downstream service checks each requested action against the caller's permissions. The model does not make that decision.
> - **Impact limits:** least-privilege tools and isolation such as sandboxing limit the damage when a bad request passes the other checks.
> - **Human approval:** reserved for actions whose consequences justify the delay, such as irreversible operations.
> 
> Prompt instructions still help by guiding normal behavior and reducing mistakes. They are a useful layer, not an enforcement mechanism.
> 
> [OWASP LLM05:2025 Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/) · [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

# References

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
