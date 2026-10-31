# Automatic updates for existing Learn topics

DevBook Learn Sync is a local companion plugin. It watches the source notes already linked by the ten hidden Qard courses and records which objectives have changed material. It leaves Qard itself unchanged and makes no AI calls.

| Source event | Automatic behavior |
| --- | --- |
| A card is added, removed or edited in a linked note | Update that objective's source revision and last-change date |
| Linked note content or its summary changes | Record the source change against its existing objectives |
| A source file or folder is renamed while the plugin is running | Maintain the explicit source links |
| A source disappears | Report the missing source and retain its objective and progress |
| A new topic appears outside existing objective links | Leave the course unchanged |

The plugin does not create objectives or tests, rewrite learning targets, infer prerequisites, or change states, due dates or assessment evidence. Card schedules, review history, note statuses and Qard settings remain under their existing owners. Unrelated metadata, including stock Qard identity bookkeeping, does not trigger a source-content update.

## Daily use

Source changes are collected after a short debounce while Obsidian is open. Startup reconciliation detects content changes made while closed. The installation baseline also detects changes made before the plugin's first load. Baselines do not mark material as learned or create due reviews.

The status bar shows **Learn: N source update(s)** when linked material has changed. Click it or run **DevBook Learn Sync: Show Learn source changes** to see the affected objectives. Revisit the linked material and use Teach or Check from the existing Learn objective as appropriate. Existing generated lessons/checks are not rewritten; use fresh material when evaluating a changed explanation.

Run **DevBook Learn Sync: Acknowledge Learn source changes** to clear the source-update indicators after addressing them. Acknowledgement only clears those indicators; it does not record a passing answer or change mastery. **Sync existing Learn sources now** performs an immediate reconciliation.

## Storage and preservation

Course records stay under `Assets/Qard/Courses`, hidden by the existing navigation/search settings and outside the Quartz source tree. The sync adds **Source revision** and **Source updated** columns to their tables. Qard preserves these additional columns when it writes assessment progress.

The companion's installation baseline, acknowledgement state and pending rename events live in its ignored `.obsidian/plugins/devbook-learn-sync/data.json`. It does not use a visible metadata note. The first live course writes happen through Obsidian's public `Vault.process()` API, merging against current contents so an assessment completed during the scan is retained. Course tables are validated before writing; malformed tables are reported and left intact.

File renames require an actual vault rename event. Moves made while Obsidian is closed cannot be safely inferred from a matching filename and are reported as missing links. Obsidian's per-file atomic updates do not replace cross-device sync conflict resolution.

## Installation and verification

The bundled plugin is installed and listed among the vault's enabled plugins. It begins running when Obsidian loads it. Native verification passed on 31 October 2026 in real Obsidian 1.15.0 with Qard 0.6.2, using a disposable copy of the vault and an isolated application profile. Qard's own create/edit paths triggered the companion automatically: a new card increased the native index from 383 to 384, and an edited stable-ID card flagged its linked objective. All 310 Learn objectives retained their states, due dates, evidence, prerequisites and source links; copied card-review progress also remained unchanged. The test included mastered and partly learned fixture objectives with nonempty evidence. Temporary content was restored and the native index returned to 383. All 422 protected live source/course files remained byte-identical, and live review states, ratings, statistics, sessions and plans matched the copied baseline. The running personal Qard instance updated its elapsed-time accounting; that runtime bookkeeping was left intact.

The status bar displayed two source updates. Acknowledgement cleared those indicators without grading or changing progress, and Obsidian reported no captured errors. The simulated public-API host additionally covers concurrent assessment writes, offline edits, renames, missing sources, failed persistence and unload safety. Generated lessons/checks and provider calls were not exercised by this native test.

The repository includes source and a prebuilt bundle. Rebuild with the existing locked Web dependencies:

```sh
node .scripts/qard-learn-sync/build.cjs
node .scripts/qard-learn-sync/install.cjs
node .scripts/qard-learn-sync/install.cjs --apply
```

The installer defaults to a dry run. Applying captures source baselines and enables the companion; it does not write course tables or modify Qard data. Existing companion state is left byte-for-byte intact on repeated runs. Disable **DevBook Learn Sync** in Community plugins to stop synchronization; existing courses and all study progress remain usable.

```sh
node --test .scripts/tests/qard-learn-sync*.test.cjs
dotnet run --file .scripts/DevBook.Tooling/Scripts/ValidateVault.cs -- --all --repo-root .
```

The current native Qard table contract was checked against version 0.6.2. Public API references: [Vault operations and atomic processing](https://docs.obsidian.md/Plugins/Vault), [registered events](https://docs.obsidian.md/Plugins/Events), and [startup timing](https://docs.obsidian.md/plugins/guides/load-time).
