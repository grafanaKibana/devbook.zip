---
publish: true
created: 2026-06-12T18:50:14.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-28T20:52:55.133Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Public task suites scoring multi-step tool use. Useful to shortlist models, not to decide.
level:
  - "3"
priority: Medium
status: Done
qard-deck: AI & ML
qard-topic: LLM/Agents/Evaluation/Agent Benchmarks
flashcard_uid: f16dc5d5
---

Agent benchmarks run a model and its scaffold against a fixed public task suite. The tasks usually require several actions: edit a repository until hidden tests pass, operate a website, or combine browsing with calculation. These suites are useful for narrowing a model shortlist and checking whether an evaluation harness produces plausible results.

A leaderboard score cannot make the final selection. It measures the model, prompt, tools, retry policy, and agent loop as one system. Public tasks may also leak into training data, and their distribution rarely resembles a production workload. A private [[Building an Evaluation Set]] must replay the actual tools, tasks, and failure costs before one candidate is selected.

# The Major Benchmarks

| Benchmark | Domain | Task | Headline metric | What it stresses |
| --- | --- | --- | --- | --- |
| SWE-bench (and Verified) | Software engineering | Resolve a real GitHub issue so the repo's hidden tests pass | % issues resolved | Long-horizon code navigation and editing. Verifiable end state |
| tau-bench | Customer-service tools | Complete a transaction under a domain policy, with a simulated user | pass^1 and pass^k | Tool use, policy adherence, reliability across repeated runs |
| GAIA | General assistant | Answer real-world questions needing browsing, files, and reasoning | % correct (exact-match) | Multi-tool, multi-step reasoning. Easy for humans, hard for models |
| WebArena | Web navigation | Accomplish goals in self-hosted real web apps | task success rate | Grounded web interaction over long action sequences |
| AgentBench | 8 environments | Interactive tasks across OS, DB, web, games | per-environment success | Breadth of agentic ability in one harness |
| BFCL | Function calling | Select and fill the correct function call(s) | AST / executable accuracy | Tool selection and argument correctness, incl. "no call needed" |

The useful comparison starts with task shape. BFCL isolates the unit measured by [[Tool-Call Evaluation]]. SWE-bench Verified tests long-running coding work with an executable end state. τ-bench exposes reliability under policy constraints, while GAIA and WebArena cover browsing-heavy agents. A high score on the wrong task shape says little.

# How to Read an Agent Leaderboard

- **A fixed scaffold isolates the base model.** Planning, retries, tool descriptions, and context management can move the score as much as the base model. A score difference can be attributed to the model only when those parts are held constant. Complete systems with different scaffolds can still be compared as systems when they run the same tasks under the same attempt and cost budgets and report their run conditions, but that comparison does not isolate the model.
- **Reliability needs its own metric.** `pass@1` reports average success across attempts. `pass^k` requires the task to succeed on every one of `k` attempts, so it exposes intermittent failures that an average hides.
- **The age and curation of the set affect scores.** Scores on an old public suite may rise because examples or solutions entered training data. Human verification improves issue and test quality; it does not isolate public tasks from training. Public suites such as SWE-bench Verified are therefore potentially contaminated for frontier comparisons, and fresh private or rolling held-out tasks reduce that risk.
- **Operating metrics may be absent.** Leaderboards often omit token cost, wall-clock latency, and tool-call count. A winning system that spends several dollars and forty calls per task may be the wrong production choice. Those measurements belong in [[AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]].

# Why Public Scores Miss Internal Workloads

A benchmark samples one task distribution with its own tools, policies, and error formats. Internal agents face another. A model can lead GAIA and still mishandle a company-specific tool whose description is ambiguous or whose failures require recovery.

Public scores therefore filter candidates. Private evaluations decide between them. That private set should replay representative work through the real scaffold and score both individual [[Tool-Call Evaluation|tool-call]] decisions and the full [[Trajectory Evaluation|trajectory]]. Cost and repeated-run reliability belong beside task success.

# Example

Two coding agents reported on SWE-bench Verified:

```text
System A: 48% resolved, single attempt (pass@1), scaffold X, cost unreported
System B: 45% resolved, but pass^3 = 41% and $0.30/task, scaffold Y

Naive read: A wins (48 > 45).
Engineering read: reliability is not comparable. B reports pass^3 and cost;
A reports neither, and the systems use different scaffolds. A system choice
requires running each with its own scaffold on the same repos, attempt count,
and budget, with repeated trials.
```

The example exposes missing evidence rather than a winner. System B reports repeated-run reliability and cost. System A does not. Its `48%` cannot be called lucky or unreliable from one aggregate alone. Comparing the two complete systems requires repeated trials for both on the same tasks, attempt count, and budget, with each keeping its own scaffold. A shared scaffold is required only to isolate the base model, which is a separate question from choosing between the systems.

# Questions

<!-- qard-id: 0d0c25bd-07f5-4f8d-a204-f23e5016b1ad -->

> [!qard]- Why can one base model produce very different results on the same agent benchmark?
> Because an agent benchmark scores a whole system, not the model alone. The result reflects the model together with its scaffold: prompts and policies, tool descriptions, planning and retry logic, context management, and the loop that runs it. Changing the scaffold can move the score even when the base model stays the same.
>
> Run conditions also matter. An agent can solve a task on one attempt and fail it on the next. τ-bench reports `pass^k`, the chance that all `k` trials of a task succeed, which exposes inconsistency that a single-attempt score hides.
>
> A fair model comparison therefore holds the task set, scaffold and run conditions constant and varies only the model. Comparing scaffolds is a separate experiment with the model held fixed. A leaderboard score describes one benchmark setup, not intrinsic model quality.
>
> [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/html/2406.12045)

# References

- [SWE-bench -- can language models resolve real-world GitHub issues (Jimenez et al., 2023)](https://arxiv.org/abs/2310.06770)
- [GAIA -- a benchmark for general AI assistants (Mialon et al., 2023)](https://arxiv.org/abs/2311.12983)
- [WebArena -- a realistic web environment for autonomous agents (Zhou et al., 2023)](https://arxiv.org/abs/2307.13854)
- [tau-bench -- tool-agent-user interaction with pass^k reliability (Yao et al., Sierra, 2024)](https://arxiv.org/abs/2406.12045)
- [Berkeley Function-Calling Leaderboard -- tool selection and argument accuracy (Gorilla, UC Berkeley)](https://gorilla.cs.berkeley.edu/blogs/8_berkeley_function_calling_leaderboard.html)
