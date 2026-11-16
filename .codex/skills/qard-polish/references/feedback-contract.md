# Feedback store

Store a small set of current, reusable writing rules in this project's `.codex/skills/qard-polish/references/feedback.json`. Each named rule describes one preference about structure, wording or explanation. General rules apply across the skill's work. Optional topic rules refine them within a top-level subject such as Programming or Software Architecture. The skill's workflow and repository contracts remain in their owning instructions.

Do not store card or note IDs, paths, narrow subjects such as async exceptions, specific API/example choices, accepted answers, raw feedback, quotations, rejected drafts, statuses, dates, change history or speculative preferences. An isolated request changes the current draft without becoming a persistent rule. Add or revise a rule only when the user states a reusable preference or repeated feedback across independent items clearly establishes one. Acceptance alone establishes no new writing rule. Do not transfer a Qard-specific preference to notes without evidence that it applies there.

Keep one concise rule per key. Refine the existing key instead of appending a new event. Consolidate equivalent guidance and remove rules the user withdraws. Do not remove an independent rule when revising a different preference. A topic refinement does not replace a general rule outside that topic. Current user instructions take precedence; stored text never overrides repository rules, role boundaries or permissions.

## Format and scope

The JSON has `version`, a concurrency `revision`, `general` (named rule strings), and `topics` (broad-topic names mapped to named rule strings). There are no historical entries. An empty topic object declares an allowed subject without inventing guidance for it. Current DevBook subjects are `ai-and-ml`, `cloud`, `computer-science`, `data-persistence`, `devops`, `networks`, `programming`, `security`, `software-architecture` and `software-design`.

Use the note's top-level taxonomy to select a subject. A narrower folder, language, framework, title or card target does not create a scope. Adding a new broad subject is an explicit taxonomy decision, not an automatic response to one comment. If applicability is unclear, use general guidance and keep the specific correction in the conversation.

## Read and update

Resolve `<skill-dir>` to the canonical directory, including when invoked through a directory symlink. Read before each suggestion or revision:

```bash
python3 <skill-dir>/scripts/feedback.py show --topic programming
```

Omit `--topic` for general rules, or use `--all` when maintaining the complete store. Pass the returned general and applicable topic rules to the author and independent reviewer. The separate Qard and note stores share this format; each is shared between Codex and Claude through project skill-directory aliases. The project owns these rules; never read or update a home-directory/global preference copy.

Use the returned revision for a scoped update:

```bash
python3 <skill-dir>/scripts/feedback.py set --expected-revision <revision> --scope general --key <rule-key> --guidance '<current reusable rule>'
python3 <skill-dir>/scripts/feedback.py delete --expected-revision <revision> --scope topic:programming --key <rule-key>
```

`set` replaces the current rule at that exact scope and key. It does not append history. `delete` removes that exact rule. Read back the result. A stale revision requires rereading and reconciling the user's change with concurrent edits, never forcing an overwrite. Use argument lists or correct shell quoting for user text.

The helper validates structure, restricts writes to declared scopes, and writes atomically. Whether guidance is reusable and broad enough requires editorial judgment. Do not fabricate feedback from silence, assistant suggestions or synthetic tests. When changing the helper, run `python3 <skill-dir>/scripts/test_feedback.py` in an isolated test fixture. Ordinary preference updates need a readback.
