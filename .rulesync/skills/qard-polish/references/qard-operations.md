# Qard operations

Read this reference when inventorying marked cards, applying accepted changes or updating study flags. Installed Qard internals can change; inspect the current version rather than copying minified function names or assuming an old schema.

## Inventory and source identity

Prefer the running plugin's index for the current card set and source mapping. In an Obsidian CLI `eval`, the installed plugin has exposed `app.plugins.plugins.qard`, an `index.getSnapshot()` with cards/issues/loading, and `reviews.getSnapshot()` with states/history/sessions. Verify these capabilities before use.

Explicit repair flags have been stored as `states[id].needsFixing`. The visible repair filter can also include Often forgotten cards. A reviewed implementation counted scheduled Again ratings on at least five distinct local calendar days after `repairSince`; confirm the current rule before claiming the whole filter is empty.

Match IDs to actual current indexed cards. Historical flags with no current source are a separate set. Do not invent mappings, restore deleted cards or delete study history to make a count reach zero. When only a file snapshot is available, say that live index status is unverified.

Read and write note content with file tools as required locally. Use the Obsidian CLI for current indexing and approved plugin operations. A sandboxed CLI saying the app is unavailable can reflect an execution boundary; try the supported authorized access path before asking the user to perform ordinary recovery. Do not start a study session to refresh the index.

## Accepted edits and state changes

Preserve hidden `qard-id` comments and any note/card location overrides. A split keeps the original ID on its original primary task; new cards stay ID-less until the host's stock identity flow assigns IDs. A user-authorized whole-card removal can remove that card's adjacent ID, with no reuse and no historical-state deletion.

After the required note review, verify that the current live index contains exactly one target and its front/back Markdown match the accepted source. Stop a stale edit or state operation when the source no longer matches.

Current installed native methods have included:

```javascript
await app.plugins.plugins.qard.reviews.markFixed(cardId);
await app.plugins.plugins.qard.reviews.setPaused(cardId, false);
```

These are installed implementation details, not a promised public API. Inspect their current signatures and behavior. `markFixed` has cleared `needsFixing` and set `repairSince`; unpausing has cleared `paused`. Use only actions already authorized by the user. Do not replace the entire plugin data file while the app is running.

For each state operation, snapshot before/after and compare structurally. Expected changes on the target have been limited to `needsFixing`, `repairSince`, `paused` and `flagsAt`. Scheduling fields, review history, saved sessions, other cards and other settings must retain their owners. If unrelated changes occur concurrently, report and reread rather than restoring an old whole-state snapshot.

Read back both the live result and persisted target flags. For removal, verify index absence and retained historical state/reviews rather than pretending the removed source was rewritten and unpaused. Finish with a global current-card queue check and identify historical orphan flags separately.

If live operations are unavailable, accepted source work can still proceed under its own authorization. Report state updates as unfinished; do not silently rewrite JSON, reset a schedule, infer mastery, or claim an index/flag operation succeeded.

## DevBook integration

Apply these only in a DevBook checkout with the corresponding current contracts:

- Read `AGENTS.md` and the current note-writer/note-reviewer definitions. Use the registered roles in the active tool. Do not copy stale agent rules into this skill or bypass the role boundary when a role is unavailable.
- Author Qards in their existing owning notes under `Vault/Home`. Do not hand-edit generated `Web/content`. Preserve current frontmatter, folder tags, child maps and generated-navigation ownership.
- Run `node .scripts/qard-learn-sync/check.cjs` after authoring, and read the linked course objective for semantic fit. Preserve objective IDs, prerequisites, progress, dates and evidence.
- Honor the mandatory full-note independent `CLEAN` gate and any current review-receipt hook. A hash or validator alone does not establish prose quality.
- Read the local Obsidian Markdown and CLI skills when applicable. Follow the current Microsoft conventions source for C# examples and code verification. Keep examples in disposable test locations, with no live-vault study mutations.

Do not turn a one-card editorial loop into a new planning interview, goal or team workflow by default. An explicitly invoked surrounding workflow still owns its own gates. Keep source/card outcome claims separate from workflow tracking or publication claims.
