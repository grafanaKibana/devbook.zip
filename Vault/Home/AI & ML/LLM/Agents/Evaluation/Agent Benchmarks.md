---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Public task suites scoring multi-step tool use. Useful to shortlist models, not to decide."
level:
  - "3"
priority: Medium
status: Done
publish: true
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

- **Hold the scaffold constant.** Planning, retries, tool descriptions, and context management can move the score as much as the base model. Cross-system results are comparable only when those parts are controlled.
- **Read the reliability metric.** `pass@1` reports average success across attempts. `pass^k` requires the task to succeed on every one of `k` attempts, so it exposes intermittent failures that an average hides.
- **Check the age and curation of the set.** Scores on an old public suite may rise because examples or solutions entered training data. Human verification improves issue and test quality; it does not isolate public tasks from training. Treat public suites such as SWE-bench Verified as potentially contaminated for frontier comparisons, and use fresh private or rolling held-out tasks to control that risk.
- **Account for the missing operating metrics.** Leaderboards often omit token cost, wall-clock latency, and tool-call count. A winning system that spends several dollars and forty calls per task may be the wrong production choice. Those measurements belong in [[Home/AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]].

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
A reports neither, and the systems use different scaffolds. Run both on the
same repos, scaffold, and budget with repeated trials before choosing.
```

The example exposes missing evidence rather than a winner. System B reports repeated-run reliability and cost. System A does not. Its `48%` cannot be called lucky or unreliable from one aggregate alone. A reliability comparison requires repeated trials for both systems under the same scaffold.

# Questions

> [!QUESTION]- Why can one base model produce very different results on the same benchmark?
> The benchmark runs a model-plus-scaffold system. Planning logic, retry limits, prompts, tool descriptions, and context handling all affect the outcome. Scores from different scaffolds cannot isolate model quality. A fair model comparison keeps the scaffold fixed, then reruns the candidates on the same tasks.

# References

- [SWE-bench -- can language models resolve real-world GitHub issues (Jimenez et al., 2023)](https://arxiv.org/abs/2310.06770)
- [GAIA -- a benchmark for general AI assistants (Mialon et al., 2023)](https://arxiv.org/abs/2311.12983)
- [WebArena -- a realistic web environment for autonomous agents (Zhou et al., 2023)](https://arxiv.org/abs/2307.13854)
- [tau-bench -- tool-agent-user interaction with pass^k reliability (Yao et al., Sierra, 2024)](https://arxiv.org/abs/2406.12045)
- [Berkeley Function-Calling Leaderboard -- tool selection and argument accuracy (Gorilla, UC Berkeley)](https://gorilla.cs.berkeley.edu/blogs/8_berkeley_function_calling_leaderboard.html)
