# Qard readiness after a note changes

A polished note is finished only when Qard can use it without repair: its cards are indexed under the right deck and topic, its Learn objective still links to it, and saved lessons and checks still resolve their sources. This document owns that procedure for the `note-polish` and `qard-polish` skills and for any agent that moves, renames, splits, merges or deletes a note under `Vault/Home`.

## What points at a note

| Record | Points at the note by | Updated by a live vault rename | Left for the author |
| --- | --- | --- | --- |
| Card schedule, history, flags in the Qard plugin data | Card ID | Not needed; the ID travels with the card | Nothing. Never edit these |
| Qard card index | Source path | Qard | Confirm the cards are indexed at the new path |
| `Qard/Source links.json` | Source path | Qard | Offline move: replace the path |
| Course **Notes** cell in `Assets/Qard/Courses` | Wikilink | DevBook Learn Sync | Offline move: replace the link |
| Wikilinks in other notes | Path | Obsidian | Offline move: replace the links |
| `qard-deck` and `qard-topic` frontmatter | Seed derived from the path | Nobody | Re-seed, unless the value is an override |
| Lesson JSON in `Assets/Qard/Lessons` (notes, snapshots, step checks, closing note edit) | Source path | Nobody | Replace the path |
| Check JSON in `Assets/Qard/Checks` (question sources) | Source path | Nobody | Replace the path |
| Exam selections in the Qard plugin data | Deck and topic names | Nobody | Report to the user; change them in Qard |

A live rename is a rename event inside a running Obsidian. A file moved with shell or file tools produces no event, so every row becomes the author's work.

## Moving or renaming a note

1. List what depends on the note before touching it:

   ```sh
   node .scripts/qard-learn-sync/references.cjs --path "Home/<old path>.md"
   ```

2. Move it through the Obsidian CLI with `vault="Vault"` (`move` or `rename`) while the app is running. If the app is unavailable, move the file with file tools and treat the move as offline.
3. Re-seed `qard-deck` and `qard-topic` when the old values equal the old path's seed: the deck is the first folder below `Home`, the topic is the rest of the path without `.md`. A value that differed from the old seed is a user override and stays as it is. Per-card `qard-location` overrides always stay.
4. Replace the old path with the new one at every lesson and check location step 1 listed. Qard keeps loaded lessons and checks in memory and writes that copy back, so edit these files only while Qard is unloaded: after the live rename, disable it with `obsidian plugin:disable id=qard` or close Obsidian, replace the paths, read the files back, then enable it again. Change only the path strings; snapshot text, steps, answers, marks, state and evidence keep their content.
5. For an offline move, also replace the course link, the `Source links.json` path and the wikilinks in other notes. Never rewrite the Qard plugin `data.json` while the app is running.
6. If the move empties a deck or renames a topic that an exam selects, tell the user; exam selections are changed in Qard.

## Splitting, merging or deleting

- A card moved to another note keeps its adjacent `qard-id`. New cards stay ID-less until Qard's own identity flow assigns one. A removed card's ID is never reused and its study history stays.
- A new card-owning note needs a fitting objective in its subject course. Reuse a suitable objective and add one only for a distinct competency. Keep existing objective IDs, prerequisites, states, due dates and evidence.
- When a note is merged away or deleted, repoint lesson and check records only to a note that now holds the same material. Otherwise leave them as history and name them in the report. Objectives whose source disappeared stay, with their progress, until the user decides.

## Changing cards in place

Editing, adding or removing cards without moving the note needs no path repair. Learn Sync records the source change against the linked objective. Check that the objective still fits what the cards now test, and that an added card's note is assigned.

## Verify

```sh
node .scripts/qard-learn-sync/references.cjs
node .scripts/qard-learn-sync/check.cjs
```

`references.cjs` reports every Qard record that names a missing note and every deck/topic value that differs from its path. Each line is either repaired or named in the completion report as deliberate: an override, or history for a deleted note. `check.cjs` reports unresolved course links, unassigned card notes and lost lesson progress, and must pass.

With the app running, confirm through the Qard index that the note's cards appear at the new path with the same IDs and the expected deck and topic. Without the app, say that live index status is unverified. Neither check proves a Quartz export or deployment.
