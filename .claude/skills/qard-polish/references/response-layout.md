# Response layout

Read this reference before writing any message that proposes or revises a card. The user scans these messages, so the two cards always sit in the same place and look the same. Everything around them stays conversational: plain sentences written to the user, as in a normal reply.

## The fixed part: heading, Current and Proposed

Every proposal or revision opens with a heading naming the card's place in the queue and its owning note, then shows the saved card and the proposed card under their own headings, in this order:

```markdown
## Card 3 of 10 · Memory Leaks

two or three conversational sentences

### Current
> **Q:** saved question
>
> saved answer, complete

### Proposed
> **Q:** proposed question
>
> proposed answer, complete
```

- The heading carries only the queue position and the note name. Outside a queue, use the note name alone. Keep the same heading on every revision of that card.
- Card text goes inside a blockquote, with the question in bold on its first line. Nothing else in the message is blockquoted, so quoted text is always card text.
- `### Current` is the saved card from the owning source, never the previous draft.
- A split shows every resulting card in full under `### Proposed`, each in its own blockquote with a short plain label above it, such as "Card A, keeps the history" and "Card B, new".
- A removal has no `### Proposed`. Say in plain sentences where each useful point of the card still lives, and name anything that would be lost.

## The conversational part

Write the rest the way a colleague would say it. No status badges, verdict labels, change tables, check tables or fixed section headings beyond the three above.

- **Before the cards:** two or three sentences on what makes the saved card hard to use and what the proposal does about it.
- **After the cards:** only what the user would otherwise have to ask, such as a choice between two reasonable options or a fact that was verified. Skip it when the cards speak for themselves. Do not walk through the differences; the two cards already show them.
- **Ending:** one plain closing question when a decision is needed. One card and one decision per message.

Bold a phrase only when the eye should land on it: the decision being asked, or a warning. A short list is fine when there are several parallel points; a table is for comparing things, not for laying out a message.

## Replying to feedback

When the user sends numbered comments, answer them in the same numbers, one or two sentences each, under the card heading and before the cards. Say what changed, or why a comment was not applied. Every comment gets an answer. Unnumbered feedback gets a short paragraph instead.

## Everything else

Side questions, results after applying a card and queue status are ordinary short replies. Lead with the outcome, name anything not done or not verified, and keep a side question in its own message after the current card is settled.
