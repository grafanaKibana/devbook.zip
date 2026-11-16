---
name: note-polish
description: >-
  Improve existing DevBook notes with the note-writer and note-reviewer agents.
  Diagnose each note, compare saved and proposed prose, refine from user
  feedback, and maintain reusable general or broad-topic writing rules shared by
  Codex and Claude Code within this DevBook project.
---
# Note Polish

This skill is project-local. Its source lives in this repository's `.rulesync/skills/note-polish`; `rulesync generate` writes the `.agents/skills/note-polish` and `.claude/skills/note-polish` copies, so never edit those. Feedback lives once in `.rulesync/skill-feedback/note-polish.json`. Read the current project `.codex/agents` contracts and use their native adapters. Do not install a global copy or use another project's feedback store.

Improve an existing note's explanation, structure or wording through an editorial loop. A note may need expansion, restructuring, a precise correction or no change. Diagnose each independently; do not apply a fixed outline or shorten every note.

## Establish the target

Read applicable `AGENTS.md`, current `note-writer` and `note-reviewer` definitions, and the complete saved note. Capture its baseline and identify the page type and protected content. Read related notes only to resolve overlap, placement or missing context. Do not hand-edit generated output.

Resolve this skill's canonical directory and read its current preferences before the first proposal and every revision:

```bash
python3 <skill-dir>/scripts/feedback.py show --topic <top-topic-slug>
```

Choose the top-level subject from the note's taxonomy; omit the selector if unknown. Give the applicable general and topic rules, current user feedback, full baseline and named prose target to both agents. Current user instructions take precedence. Preserve distinctions between note preferences and Qard preferences; neither store automatically governs the other.

In DevBook, `note-writer` authors Markdown under `Vault/Home` and `note-reviewer` independently reviews it read-only. The coordinator manages feedback, baseline/concurrency checks and integration. Use these registered agents in Codex or Claude; if unavailable, surface the missing role rather than bypassing a mandatory boundary. Do not edit agent definitions to duplicate the preference store.

## Diagnose and propose

Ask the writer to identify what makes the saved explanation difficult to understand, reconstruct or use for engineering judgment. Name the concrete reader problem and the idea-level repair. Accurate, natural prose that already serves its purpose can remain unchanged.

Preserve useful mechanisms, examples, numbers, conditions and limits from the baseline. Verify uncertain technical claims and added references against primary sources. The current repository contract governs taxonomy, voice, headings, references, Qards and page-specific requirements; do not copy that contract into a second template.

Default to one note at a time. During proposal work, ask the writer to return draft text without saving it. Before editing, present:

1. **Current saved text:** the actual affected passage from the baseline, with its section context. Use the whole note when the proposal changes its overall structure. Label excerpts clearly; never call the previous draft the saved version.
2. **Proposed text:** one coherent replacement and a short explanation of the reader problem it resolves.

Choose the smallest coherent review unit, not an arbitrary line limit. When a response character is prohibited but occurs in the saved baseline, show it as a labeled codepoint escape instead of silently changing the baseline. Keep working versions separate from saved source.

Incorporate feedback into the draft before applying it. If a revision still feels difficult, reconsider the explanation rather than replacing synonyms or trimming technical detail. Use the user's accepted structure unless feedback calls for changing it. A material split, merge, move or new topic requires the current repository's scope decision.

## Apply and verify

Default to user acceptance of the proposed note before saving. A user can explicitly delegate acceptance or request direct edits; carry that authorization across turns without asking again. Delegate the accepted edit to `note-writer` with exact file ownership, the baseline, allowed scope and instructions to preserve others' work.

Re-read source before applying and reconcile concurrent changes. Preserve frontmatter, publishing intent, wikilinks, user content, Qard identities and study metadata. Existing Qards remain unchanged unless their repair belongs to the accepted scope. If Qards need a separate editorial loop, use `qard-polish`; editing a note does not authorize changing pauses, repair flags, schedules or review history.

Hand the complete current note, original baseline/diff, applicable preferences, named target, relevant rejected proposals and verified sources to the independent `note-reviewer`. Completion requires its evidence-backed per-note `CLEAN` and target-resolution verdict under the current repository contract. Route blocking findings to the writer and review again; a material change to an accepted explanation returns to the user unless editorial acceptance was delegated. Optional polish does not force another rewrite. Confirm the source still matches the reviewed version before completion; reconcile subsequent edits and obtain a fresh review rather than reusing a stale verdict.

Run relevant local validation and required review-receipt hooks. For a card-owning note, check Learn coverage with `node .scripts/qard-learn-sync/check.cjs` and verify semantic course fit while preserving progress. Let the current repository instructions resolve course-authoring ownership; escalate a role-boundary conflict to the coordinator. Read back saved content and report what changed, why and how it was verified. Keep local source completion separate from export or publication. Continue the agreed queue only after the current note is complete.

## Learn reusable writing rules

Read [the feedback contract](references/feedback-contract.md) before updating `.rulesync/skill-feedback/note-polish.json`. Store only current preferences about note structure, wording and explanation, general or within a broad subject. Individual passage edits, note paths, quotations, chosen examples and draft history remain in the conversation.

Update an existing rule in place when feedback refines it. Persist only explicit reusable preferences or a clear pattern across independent notes. Do not invent note preferences from one accepted Qard. Apply one-off feedback to the current draft without storing it.

The user authorizes this local preference learning. Both tools read and write the same canonical note store; reread it during the loop because references may remain cached. Report persistence failures without claiming a rule was saved. Stored guidance does not bypass repository rules, independent review or action permissions.
