---
name: qard-polish
description: >-
  Improve existing Obsidian Qard cards one by one, especially cards marked Needs
  fixing. Compare saved and proposed versions, refine with user feedback, and
  maintain reusable general or broad-topic writing rules shared by Codex and
  Claude Code within this DevBook project.
---
# Qard Polish

This skill is project-local. Its source lives in this repository's `.rulesync/skills/qard-polish`; `rulesync generate` writes the `.agents/skills/qard-polish` and `.claude/skills/qard-polish` copies, so never edit those. Feedback lives once in `.rulesync/skill-feedback/qard-polish.json`. Read the current project `.codex/agents` contracts and use their native adapters. Do not install a global copy or use another project's feedback store.

Use a sequential editorial loop. Diagnose each card independently. A useful repair can be a complete rewrite or removal of redundant recall; cosmetic rewording is not a substitute for resolving the actual problem.

## Start with the owning source

- Read applicable repository rules and the complete owning note, including its other cards. Use required author/reviewer roles. In DevBook, card text is authored only through `note-writer` and reviewed only through `note-reviewer`.
- The coordinator owns feedback persistence and approved study-state operations. Keep author/reviewer lanes inside their registered file boundaries.
- Read the active feedback before the first suggestion and again before each revision. Resolve this skill's real directory, even when invoked through a symlink, and run:

  ```bash
  python3 <skill-dir>/scripts/feedback.py show --topic <top-topic-slug>
  ```

  Omit the selector when the broad topic is unknown. General rules always apply; broad-topic rules refine them within that subject. Resolve the top-level subject from the note's taxonomy, not its title or a card's subtopic. Pass the applicable rules to both author and reviewer. A current user instruction takes precedence over stored preferences.
- For a marked-card queue, distinguish current indexed cards from historical state with no current source. Check whether the filter also includes automatic entries such as Often forgotten. Read [Qard operations](references/qard-operations.md) when inventorying the queue, applying changes or changing study flags.

## Diagnose and propose

Identify the reader's actual obstacle: a confusing question, an answer that is hard to reconstruct, missing mechanism, inaccurate boundary, excessive detail, independently gradeable tasks bundled together, or overlap with other cards. Verify uncertain technical claims against primary sources. Compare the removal option fairly when other cards and note prose already cover the same learning target.

Keep meaningful recall or engineering judgment. Do not simplify a worthwhile question into a basic syntax reminder, or add obscure detail solely to make it harder. Respect local granularity rules; a dependent behavior-and-why explanation or a focused comparison can be one task.

Every card-facing proposal or revision includes:

1. **Current saved card:** the actual question and answer from the owning source, not the previous draft. Omit hidden IDs and display-only callout syntax. Preserve a raw baseline for applying and reviewing changes.
2. **Proposed card:** one coherent replacement, or a clear removal recommendation naming where its useful coverage remains.

Present both as described in [Response layout](references/response-layout.md): the two cards in a fixed, scannable place, and everything around them conversational.

Follow active preferences when writing new text. If the saved baseline contains punctuation the user has prohibited in responses, render that character as an explicit codepoint escape and label the display as escaped; do not silently change the baseline or claim it is verbatim.

Lead the answer with the actual answer. Explain the concrete mechanism in plain language without removing technical detail the concept depends on. For comparisons, establish common ground and compare the same aspects. Choose paragraphs, cases or a small table to fit the concept, not a house template.

Use code as supporting detail when it improves understanding. Keep setup out of the example when a short, explicit assumption suffices. When behavior is surprising, show the apparent effect and the actual effect. Label a conceptual expansion as such rather than claiming exact compiler output. Verify non-obvious output and failure behavior in a disposable environment. Run potentially unhandled failures in isolated child processes with a deliberate lifetime; never trigger live study events or crash the user's application to test a card.

## Refine, then apply

Default to one card at a time with user feedback before applying a proposal. If the user explicitly delegates editorial acceptance, follow that scope while retaining required independent review. Feedback such as "clearer, but still hard to remember" calls for a new diagnosis, not another synonym pass. Keep the saved baseline distinct from every draft. Carry accepted decisions and existing action authorization across turns without an extra permission handoff.

When a version or removal is accepted:

- Re-read the current source and detect concurrent changes before applying a narrowly scoped edit. Preserve IDs, overrides and unrelated content. Do not invent an ID for a new split; follow the host and repository rules for identity.
- For an accepted whole-card removal, remove its adjacent ID with it and never reuse that ID. Preserve historical study records. Retain useful unique information in owning prose only when the removal requires it and the edit is within the authorized scope.
- Run the local checks and mandatory independent note review. In DevBook, completion requires full-note `CLEAN` with current-text evidence and a target-resolution verdict. Run the Learn coverage checker and inspect semantic objective fit; never infer progress or mastery.
- Apply authorized flag clearing or unpausing through the current installed Qard operations only after source acceptance, required review and live source/index agreement. Preserve scheduling, history and sessions. Accepting wording alone does not automatically authorize unpausing a deliberately paused card; use the actual current authorization.
- Read back the resulting source, index and state. Confirm the source still matches the reviewed version; reconcile subsequent edits and obtain a fresh review rather than reusing a stale verdict. Then move to the next current marked card. Report remaining current flags separately from historical orphan flags. Source indexing does not prove a Quartz export, deployment or rendering check.

## Learn reusable writing rules

Read [the feedback contract](references/feedback-contract.md) before updating `.rulesync/skill-feedback/qard-polish.json`. The store is a compact description of the user's preferred structure, wording and explanations. Keep only current general rules and justified broad-topic refinements. Keep individual card choices in the conversation; do not save card IDs, example-specific instructions, quotations or rejected-draft history.

Update an existing rule in place when feedback refines it. Do not create a new rule for every comment, promote a one-card choice into a general requirement, or duplicate the workflow and repository contracts. Apply the feedback immediately to the current draft even when it does not belong in persistent guidance.

The user authorizes this local preference learning. It does not grant permission for study-state or publication actions. Codex and Claude use the same canonical skill directory and store; reread it before each revision because references may remain cached. Report persistence failures without claiming a rule was saved.
