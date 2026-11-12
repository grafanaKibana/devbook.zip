---
topic: [Qard]
subtopic: []
level: ["1"]
priority: High
status: In Progress
tags: [FolderNote, MetricsIgnore]
publish: false
icon: graduation-cap
summary: "Qard sections and the daily learning, review, and interview-preparation routine."
---

The routine is **Today → one Learn objective → its cards → delayed checks**. Learn tracks understanding; flashcards schedule memory reviews. One topic stays the learning focus while earlier subjects continue through Today.

# Sections

| Section | Purpose in this setup |
| --- | --- |
| **Today** | Scheduled card reviews, objective checks and lessons needing attention across subjects; new cards have a separate allowance. |
| **Decks** | Card library. **Due/New/All** select cards; **Normal** records ratings and schedules reviews; **Cram** rehearses without changing schedules. |
| **Learn** | Course units, prerequisites and objectives. **Teach** gives a lesson; **Check** assesses understanding. Both use AI. |
| **Plans** | Card coverage against a date and daily target. Matching new cards join automatically; exposure counts even after Again. |
| **Tests** | Written practice, rubric marking and model answers. Optional interview rehearsal; currently empty and deferred. |
| **Source updates** | Stock Qard's source-linked card updates. Handwritten cards need explicit source links; this differs from Learn Sync below. |
| **Statistics** | Review history, workload and recall trends, separate from objective mastery. |
| **Study time** | Active time by activity and course. |
| **Token usage** | AI calls, tokens and available provider cost information. |
| **Settings** | AI connections, scheduler, daily allowance and batch size in Obsidian settings. |

An empty Today queue means little is due now. Unintroduced material remains available through Learn; the due count does not measure curriculum coverage.

# Daily Loop

1. **Review — Today.** Due cards and objective checks come first. A backlog takes priority over new material.
2. **Learn — one objective.** Start at **Learn → Programming → Assignment and aliasing → Teach**; then Parameter passing, Generic contracts and Failure contracts. Later work follows prerequisite-ready objectives in numbered units. Source reading, explanation from memory and an application example support each lesson.
3. **Retain — the same material.** The source note's **Study this note → New cards → Normal session** introduces its cards: **five new cards globally/day**, with **15 cards per batch**. Concepts without cards still receive application practice.
4. **Check and repair.** After three to five related objectives, Learn checks and application work expose gaps. **Needs fixing** marks ambiguous cards for clearer wording, shortening or splitting. Forgotten essential answers receive **Again**.

Ordinary ratings count toward the matching plan's **25 ratings/day**, including repeats. Its queue follows note paths; Learn supplies lesson order. The plan queue is an alternative introduction route. The [[Home/Topics.base|Topics browser]] also locates source notes.

# Progression

**Programming → Computer Science → Software Design → Networks → Data Persistence → Security → Software Architecture → DevOps → Cloud → AI & ML.**

Each area has a Learn course. Switching is manual; only one course is the learning focus. Draft-status notes are included. Large objectives can span days.

A lesson produces **taught**. Qard's native pass boundary is **70%**; mastery needs two passes at least **two days apart**, with harder application work after the first. Confidence affects the state.

The manual interview-readiness target is **80% of rubric marks without a critical mechanism error**, confirmed by a different delayed application check. Earlier subjects continue through Today. Plan dates are editable coverage targets. **90% desired retention** controls scheduling, not course completion.

# When Material Changes

**DevBook Learn Sync** tracks new/edited cards and content in existing linked notes. **Learn: N source updates** identifies affected objectives. After rechecking material, **Acknowledge Learn source changes** clears indicators without grading.

Mastery, due dates and evidence stay intact; saved lessons/checks are not regenerated. Sync creates no objectives or tests. Records stay under `Assets/Qard`, so Qard's **Update objectives** cannot map Home from that location. Separate Tests need explicit course/objective links to update Learn.
