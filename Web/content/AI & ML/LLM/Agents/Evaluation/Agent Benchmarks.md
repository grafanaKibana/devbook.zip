---
publish: true
created: 2026-07-11T21:45:42.524Z
modified: 2026-07-18T11:30:02.113Z
published: 2026-07-18T11:30:02.113Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Public task suites scoring multi-step tool use; useful to shortlist models, not to decide.
level:
  - "3"
priority: Medium
status: Done
---

Agent benchmarks are public, fixed task suites that score how well a model-plus-scaffold completes multi-step, tool-using tasks — resolving a GitHub issue, navigating a website, answering a question that needs browsing and a calculator. They matter for two decisions: picking a base model for an agent, and sanity-checking your own harness against a known bar. But a leaderboard number is the most over-trusted signal in agent engineering — it conflates the model with the scaffold, it can be contaminated, and it is measured on a distribution that is almost never yours. This page is an orientation: what the major benchmarks actually measure, how to read their scores, and why you still have to build your own task set (the general technique is [[Building an Evaluation Set]]).

# The major benchmarks

| Benchmark | Domain | Task | Headline metric | What it stresses |
| --- | --- | --- | --- | --- |
| SWE-bench (and Verified) | Software engineering | Resolve a real GitHub issue so the repo's hidden tests pass | % issues resolved | Long-horizon code navigation and editing; verifiable end state |
| tau-bench | Customer-service tools | Complete a transaction under a domain policy, with a simulated user | pass^1 and pass^k | Tool use, policy adherence, reliability across repeated runs |
| GAIA | General assistant | Answer real-world questions needing browsing, files, and reasoning | % correct (exact-match) | Multi-tool, multi-step reasoning; easy for humans, hard for models |
| WebArena | Web navigation | Accomplish goals in self-hosted real web apps | task success rate | Grounded web interaction over long action sequences |
| AgentBench | 8 environments | Interactive tasks across OS, DB, web, games | per-environment success | Breadth of agentic ability in one harness |
| BFCL | Function calling | Select and fill the correct function call(s) | AST / executable accuracy | Tool selection and argument correctness, incl. "no call needed" |

Use them by _what they stress_, not by the top score: BFCL for tool-call quality (the unit of [[Tool-Call Evaluation]]), SWE-bench Verified for long-horizon coding, τ-bench when reliability and policy adherence matter, GAIA/WebArena for browsing agents.

# How to read an agent leaderboard

- **The scaffold is half the score.** The same model scores very differently under different agent harnesses (planning, retries, tool design). A SWE-bench number is a model-plus-scaffold result; you cannot transfer it to your own agent. Compare systems only when the scaffold is held constant.
- **pass@1 ≠ pass^k.** Mean success over independent attempts (pass@1) hides variance. τ-bench's pass^k — solving a task on _all_ k tries — exposes the reliability gap that production users feel, and it is usually far below pass@1. Always prefer the reliability-aware number when it exists.
- **Contamination.** Public benchmarks leak into training data over time, so a rising score can reflect memorization, not capability. Treat recent jumps on old benchmarks skeptically; prefer human-verified or freshly held-out variants (SWE-bench Verified exists partly for this reason).
- **Cost and latency are usually unreported.** A system that tops a leaderboard at 40 tool calls and several dollars per task may be unusable in production. The efficiency metrics in [[AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]] are not on the leaderboard; you have to measure them.

# Why public scores underpredict your domain

A benchmark measures a fixed distribution of tasks, tools, and policies that is almost never yours — the same reason general embedding leaderboards (MTEB, BEIR) fail to predict retrieval quality on a specific corpus. A model can top GAIA and still fail on your internal tools because your tool descriptions, error formats, and edge cases were never in the benchmark. Public benchmarks are a _filter_ for the shortlist, not the decision. Make the decision on your own task set, built from real traffic and your real tools, scored with [[Tool-Call Evaluation|tool-call]] and [[Trajectory Evaluation|trajectory]] metrics.

# Example

Two coding agents reported on SWE-bench Verified:

```text
System A: 48% resolved, single attempt (pass@1), scaffold X, cost unreported
System B: 45% resolved, but pass^3 = 41% and $0.30/task, scaffold Y

Naive read: A wins (48 > 45).
Engineering read: B is more reliable (41% solved on all 3 of 3 tries) and has
a known cost. A's 48% is one lucky attempt under a different scaffold — not
comparable. Decide on your own repos, same scaffold, with cost and pass^k.
```

# Questions

> [!QUESTION]- Why can the same model post very different scores on the same agent benchmark?
>
> - Agent benchmarks score a model _plus its scaffold_ — planning loop, retries, tool design, prompt — and the scaffold contributes a large share of the result
> - Two teams running the same base model with different harnesses get different SWE-bench numbers, so cross-paper comparisons are unreliable unless the scaffold is held constant
> - Contamination and harness-specific prompt tuning add further variance over time
> - The takeaway: use leaderboards to shortlist models, then re-evaluate candidates under _your_ scaffold on _your_ tasks
> - Holding the scaffold constant for a fair comparison costs engineering setup, but without it the numbers don't mean what they appear to

> [!QUESTION]- Why is pass^k a more honest agent metric than pass@1, and when does it matter most?
>
> - pass@1 averages success over independent attempts and hides variance; an agent that solves a task 6/10 times looks similar to one that solves it 10/10
> - pass^k credits a task only if solved on all k tries, directly measuring reliability — the property production users actually experience
> - It matters most for high-stakes or unattended tasks (payments, code merges) where one failure in k is unacceptable
> - pass^k is typically well below pass@1, so reporting only pass@1 overstates production readiness
> - Measuring pass^k costs k× the eval runs, so spend it on the tasks where variance is intolerable and use cheaper mean success for low-stakes breadth

# References

- [SWE-bench -- can language models resolve real-world GitHub issues (Jimenez et al., 2023)](https://arxiv.org/abs/2310.06770) — the canonical verifiable coding-agent benchmark; SWE-bench Verified is the human-validated subset.
- [GAIA -- a benchmark for general AI assistants (Mialon et al., 2023)](https://arxiv.org/abs/2311.12983) — real-world questions easy for humans, hard for agents, needing browsing and tools.
- [WebArena -- a realistic web environment for autonomous agents (Zhou et al., 2023)](https://arxiv.org/abs/2307.13854) — self-hosted real web apps for grounded, long-horizon web tasks.
- [tau-bench -- tool-agent-user interaction with pass^k reliability (Yao et al., Sierra, 2024)](https://arxiv.org/abs/2406.12045) — the benchmark that popularized reporting reliability across repeated runs.
- [Berkeley Function-Calling Leaderboard -- tool selection and argument accuracy (Gorilla, UC Berkeley)](https://gorilla.cs.berkeley.edu/blogs/8_berkeley_function_calling_leaderboard.html) — the standard function-calling benchmark and live leaderboard.
