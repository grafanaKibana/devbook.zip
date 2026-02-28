---
topic:
  - AI & ML
subtopic:
  - Tooling
dg-publish: false
status: Creation
level:
  - '2'
priority: Medium
---

# Intro

In coding agents, hooks are lifecycle callbacks that run custom logic at specific execution points without changing the agent core. They are the control layer for guardrails and automation: validate unsafe actions before they run, format or lint after edits, log operations, and send completion notifications. Mechanically, the agent reaches a hook trigger, pauses, runs the configured command/script (or endpoint), then uses the hook result to continue or abort. In hook systems like Claude Code, exit semantics are explicit: success continues, while blocking exit paths can deny a tool action at pre-execution checkpoints.

## Hook Mechanism

Hooks are bound to defined events (for example, before tool execution or after tool completion). On trigger, the runtime passes event context (tool name, input, cwd, session metadata), runs matching handlers in parallel, and interprets the result. Command hooks are blocking by default unless configured with async execution.

- `PreToolUse`: decision point before side effects; can deny execution.
- `PostToolUse`: reaction point after side effects; ideal for formatting, linting, and telemetry.
- `Notification` and task/session events: non-edit events for operational integration (chat alerts, dashboards, audit streams).

In Claude Code, `PreToolUse` can block tool execution; exit code `2` is a blocking outcome for block-capable events, while post events cannot retroactively undo a completed tool call.

## Hook Types (Claude Code Primary Example)

- **PreToolUse**: run before a tool is invoked; block high-risk actions such as edits to protected files or destructive shell commands.
- **PostToolUse**: run after successful tool execution; apply formatters, run targeted lint/test commands, or append audit logs.
- **Notification hooks**: run on notification events (for example permission prompt or idle prompt); send Slack/Teams messages or emit webhooks.

## Concrete Hook Example

Policy intent (pseudocode only, not Claude Code schema):

```text
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Edit|Write",
      "command": "check-protected-files.sh \"$FILE_PATH\"",
      "description": "Block edits to protected files"
    }],
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "command": "npx prettier --write \"$FILE_PATH\"",
      "description": "Auto-format after edits"
    }]
  }
}
```

Claude Code equivalent (valid config schema):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs -I{} check-protected-files.sh \"{}\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs -I{} npx prettier --write \"{}\""
          }
        ]
      }
    ]
  }
}
```

This pattern creates a two-stage policy: deny invalid writes up front, then normalize accepted writes immediately after execution.

## Related Pattern in Other Tools

Git hooks are the most widespread equivalent lifecycle model in software delivery. `pre-commit` and `commit-msg` enforce standards before history is written; `post-commit` and server-side hooks support notifications and policy checks. Tools without native runtime hooks often still integrate with git hooks to enforce quality gates before code lands.

## Pitfalls

- **Slow hooks stall the agent loop**: heavyweight commands (full test suites on each edit) inflate latency and break flow; mitigate with file-scoped checks and async/background patterns where available.
- **Failure signals can be missed**: if scripts write unclear stderr or swallow non-zero statuses, violations pass silently; mitigate with strict exit handling, explicit error messages, and CI mirrors.
- **Hook-agent edit races**: post hooks that rewrite files the agent is still iterating on can create churn and conflicting diffs; mitigate by limiting rewrites to deterministic formatters and re-reading changed files after hook actions.

## Tradeoffs

| Choice | Option A | Option B | Decision criteria |
|---|---|---|---|
| Validation posture | Strict blocking hooks | Permissive advisory hooks | Strict mode catches policy violations early but increases loop friction and latency; permissive mode is faster but pushes more defects to later stages (CI/review). |
| Hook workload | Broad heavy checks on every trigger | Targeted checks by matcher/event | Broad checks improve coverage but can make agent runs slow and brittle; targeted checks preserve speed while covering highest-risk paths. |

## Questions

> [!QUESTION]- Why should destructive-operation controls live in `PreToolUse` instead of `PostToolUse`?
> - `PreToolUse` is the last decision point before side effects, so it can prevent damage
> - `PostToolUse` runs after execution and cannot reliably undo external side effects
> - Preventive controls produce cleaner failure modes than remediation after the fact
> - A good pattern is deny in pre-hooks, then lint/format/log in post-hooks

> [!QUESTION]- How do you design hook pipelines that improve quality without making the agent unusably slow?
> - Gate only high-risk actions synchronously (writes, destructive commands, protected paths)
> - Keep post hooks deterministic and incremental (format changed files, not the whole repo)
> - Move expensive checks to commit/CI boundaries or async hook paths
> - Track hook duration and failure rate; prune or split hooks that dominate loop time

## References

- [Hooks reference (Claude Code Docs)](https://code.claude.com/docs/en/hooks)
- [Automate workflows with hooks (Claude Code Docs)](https://code.claude.com/docs/en/hooks-guide)
- [Git hooks (git-scm official docs)](https://git-scm.com/docs/githooks)
- [Using hooks with Copilot CLI (GitHub Docs)](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks)
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Tooling/Agent Instructions|Agent Instructions]]
> - [[Software Engineering/11 AI & ML/Tooling/Coding Agents|Coding Agents]]
> - [[Software Engineering/11 AI & ML/Tooling/Plugins|Plugins]]
> - [[Software Engineering/11 AI & ML/Tooling/Skills|Skills]]
<!-- whats-next:end -->
