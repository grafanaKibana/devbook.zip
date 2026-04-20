# Week 08 — Security, Guardrails, and Reliability
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 07 - Product-Oriented Backend Architecture]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 09 - End-to-End AI System Design Drill]]

## Goal

Make the Support Copilot Platform safe enough to trust around real support workflows. This week is about concrete failure modes, deterministic enforcement, and reducing blast radius when the model or retrieved content behaves badly.

## Weekly Outcome

By the end of the week, the platform should have a concrete failure-mode table, deterministic validation at key system boundaries, explicit refusal behavior, and a small red-team pack that tests whether those controls hold. The goal is not to claim the system is safe in the abstract. The goal is to know which failures matter most, how you detect them, and what stops them from becoming tenant-impacting incidents.

## Suggested Weekly Flow

1. Choose the highest-risk failure modes.
2. Map each risk to one detection and one control.
3. Add deterministic guardrails where the system boundary demands them.
4. Run a small red-team pass.
5. Save a failure-mode table and one guardrail architecture view.

## Suggested Steps

### Step 1 — Name the real failures

- prompt injection from retrieved content
- unsupported answers that still sound confident
- cross-tenant retrieval or cache leakage
- unsafe tool invocation or excessive action scope

### Step 2 — Add concrete controls

- citation-or-abstain rule
- allowlisted tool actions
- output validation
- retrieval authorization checks
- refusal path for unsupported or unsafe requests

## Task Checklist

- [ ] Identify the top failure modes for the Support Copilot Platform across prompt injection, hallucination, tenant isolation, tool misuse, and reliability.
- [ ] Rank those risks by blast radius, likelihood, and detectability.
- [ ] Build a failure-mode table with one detection signal and one mitigation for every high-risk item.
- [ ] Add deterministic retrieval authorization checks so cross-tenant content can never enter the answer path.
- [ ] Add citation-or-abstain rules for answer generation, including what counts as insufficient support.
- [ ] Add output validation for structured responses, unsafe claims, and unsupported action requests.
- [ ] Add allowlisted tool permissions with tenant, user-role, and operation-scope validation.
- [ ] Define refusal and fallback behavior for unsupported, unsafe, or low-confidence requests.
- [ ] Run a small red-team pass with at least 10 adversarial prompts or retrieved-content attacks.
- [ ] Write a review note covering what failed, what was blocked, and what still needs follow-up.

## Suggested Session Plan

### Session 1 — Build the risk map

- Name the concrete failures you actually care about, not generic AI fears.
- Start with prompt injection from retrieved content, unsupported confident answers, tenant leakage, and unsafe tool execution.
- Rank them by user harm, operational harm, and how hard they are to detect after the fact.

### Session 2 — Add deterministic boundaries

- Put authorization checks on retrieval before content ever reaches the model.
- Define citation-or-abstain rules so unsupported answers fail closed instead of sounding polished.
- Add response validation for structured outputs, policy-sensitive answers, and tool requests.

### Session 3 — Lock down tools and actions

- Create an allowlist for tool actions, arguments, and scope.
- Validate tool calls against tenant, role, action, and argument schema before execution.
- Decide which actions require human confirmation or are blocked entirely.

### Session 4 — Run the red-team pack

- Test direct prompt injection, indirect prompt injection through retrieved content, unsupported policy questions, and cross-tenant data attempts.
- Record whether the system blocked, abstained, or failed silently.
- Update the failure-mode table with real observations, not assumptions.

### Session 5 — Review reliability and incident readiness

- Confirm what gets logged, who would investigate an incident, and what evidence is retained.
- Finalize the guardrail architecture view and the validation checklist.
- Write down the next highest-risk gap so safety work stays iterative instead of ceremonial.

## Resource Pack

### Internal notes

- [[Software Engineering/11 AI & ML/LLM/Guardrails|Guardrails]], system-level safety controls beyond prompt wording.
- [[Software Engineering/11 AI & ML/LLM/Hallucinations|Hallucinations]], why unsupported answers need system treatment.
- [[Software Engineering/11 AI & ML/LLM/OWASP vulnerabilities on AI LLM|OWASP vulnerabilities on AI LLM]], the risk taxonomy to map against real failures.
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]], where rules beat model judgment.

### External docs

- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/), the clearest baseline for common LLM system risks.
- [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html), concrete mitigations for direct and indirect injection.
- [ASP.NET Core authorization policies](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies), useful for deterministic policy checks in .NET services.
- [Azure Well-Architected Framework, security design review checklist](https://learn.microsoft.com/en-us/azure/well-architected/security/checklist), a practical checklist for reviewing system boundaries and logging.

## Implementation Tasks

Concrete Support Copilot Platform tasks for this week:

1. Build a failure-mode table with at least these rows:

| Failure mode | Attack or trigger | Detection | Deterministic control | Residual risk |
|---|---|---|---|---|
| Prompt injection through retrieved content | malicious instructions embedded in knowledge source | prompt-injection test case or suspicious instruction patterns in citations | isolate retrieved text from system instructions, citation-only answer mode, content trust labels | medium |
| Unsupported confident answer | low-evidence answer still sounds certain | low citation count or citation mismatch | citation-or-abstain rule, answer validator | medium |
| Cross-tenant retrieval leakage | filter omission or cache-scope bug | tenant mismatch in cited source metadata | authz checks before retrieval and tenant-safe cache keys | low if enforced before model |
| Unsafe tool invocation | model requests unapproved action | tool request validation failure | allowlisted actions plus schema and role validation | low to medium |
| Reliability collapse during dependency issues | model or search dependency slows or fails | timeout and circuit-breaker metrics | fallback path, timeout budget, degraded-mode response | medium |

2. Add a validation pipeline that checks, in order:
   - request authorization and tenant context
   - retrieval authorization
   - tool call allowlist and argument schema
   - answer support, citations, and refusal conditions
3. Define concrete refusal rules, for example:
   - no answer when no authorized citation supports the claim
   - no tool execution without allowlisted action and validated arguments
   - no cross-tenant fallback content even in degraded mode
4. Create a red-team prompt pack with categories:
   - retrieved prompt injection
   - policy bypass attempts
   - cross-tenant data exfiltration attempts
   - unsafe or over-scoped tool requests
   - unsupported troubleshooting requests that tempt hallucination
5. Add structured incident logging fields, including tenant, user, requested action, retrieval source IDs, refusal reason, validator that failed, and correlation ID.
6. Write a short runbook for three scenarios:
   - suspicious answer with unsupported citation
   - suspected cross-tenant exposure
   - blocked tool request from a privileged user flow
7. Add a decision note that explains where deterministic controls end and model judgment begins.

## Deep Study

- Read [[Software Engineering/11 AI & ML/LLM/Guardrails|Guardrails]].
- Read [[Software Engineering/11 AI & ML/LLM/Hallucinations|Hallucinations]].
- Read [[Software Engineering/11 AI & ML/LLM/OWASP vulnerabilities on AI LLM|OWASP vulnerabilities on AI LLM]].
- Read [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]].

## Build Plan

- Add deterministic answer validation.
- Add refusal or fallback behavior.
- Add tool permission boundaries.
- Record attack/failure, blast radius, detection, and mitigation in one table.

Concrete outputs for the week:

- failure-mode table
- deterministic validation checklist
- guardrail architecture diagram
- short red-team summary

## System Design Drill

Walk the request path and point to:

- input filtering
- retrieval authz
- output checks
- tool permission controls
- incident logging and review points

Guideline: explain safety as a sequence of boundaries. Show where user input is screened, where retrieval is authorized, where model output is validated, where tool calls are constrained, and where incidents become visible to operators. If any control exists only inside a prompt, it is probably too weak.

## DSA Plan

- Solve 1 string/pattern problem.
- Solve 1 state-machine or validation problem.
- Map them back to input screening and rule enforcement.

## Best Practices

- Tie every safety claim to a system control.
- Prefer deterministic boundaries over hidden prompt instructions.
- Treat multi-tenant safety as a first-class design concern.
- Make refusal behavior explicit and testable.

## Common Mistakes

- Writing “be safe” prompts and calling that a guardrail.
- Treating hallucinations as only a model problem instead of a system problem.
- Allowing tool permissions to stay fuzzy.
- Red-teaming without recording outcomes and follow-up actions.

## Review and Checkpoint

Use these prompts at the end of the week:

- Which failure modes have the largest blast radius, and what exact control contains each one?
- Can unauthorized content reach the model context at any point in the retrieval path?
- What causes the system to abstain instead of answer, and is that rule testable?
- Which tool actions are allowed, who can trigger them, and how is scope validated?
- What did the red-team pack reveal that your original design missed?
- If a safety incident happened tomorrow, what logs and identifiers would let you reconstruct the path?

## Useful Links

- [[Software Engineering/11 AI & ML/LLM/Guardrails|Guardrails]]
- [[Software Engineering/11 AI & ML/LLM/Hallucinations|Hallucinations]]
- [[Software Engineering/11 AI & ML/LLM/OWASP vulnerabilities on AI LLM|OWASP vulnerabilities on AI LLM]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]]
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/)
- [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [ASP.NET Core authorization policies](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies)
- [Azure Well-Architected Framework, security design review checklist](https://learn.microsoft.com/en-us/azure/well-architected/security/checklist)

## Definition of Done

- The highest-risk failures are named and controlled.
- Deterministic guardrails exist at key boundaries.
- The Support Copilot Platform has a defensible refusal path.
- You can explain how guardrails, hallucination control, and tenant safety connect.
