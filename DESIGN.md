# Design

DevBook should feel like a quiet technical instrument inside an engineer's notebook. Its design makes a large software-engineering vault easier to scan, understand, and revisit without turning it into a course platform, admin dashboard, or marketing site.

This is the repository-wide design contract. Keep it limited to verified cross-vault rules. StepTrace-specific rules belong in [`Web/custom/steptrace/DESIGN.md`](Web/custom/steptrace/DESIGN.md).

## Source of truth

- **Status:** Active
- **Last refreshed:** 2026-07-30
- **Current:** observed in the repository.
- **Direction:** a rule to preserve or move toward.
- **Open:** a decision or evidence gap the repository does not settle.

### Product surfaces

- Obsidian authoring and reading under `Vault/`.
- The published Quartz site under `Web/`.
- Home and Questions dashboards, FolderNote maps, navigation, note reading, diagrams, tabs, StepTrace, and complexity charts.
- `Platform/DevBook/` is not a design surface while it has no product UI.

### Evidence

- **Committed product evidence:** `AGENTS.md`, `README.md`, `Web/README.md`, `docs/assets/`, `Vault/`, `Web/quartz.config.yaml`, `Web/quartz.ts`, `Web/custom/`, and `Web/quartz/styles/custom.scss`.
- **Generated projections:** `Web/content/`, `Web/public/`, `Web/custom/steptrace/generated/`, and `Vault/.obsidian/plugins/steptrace/`.
- **Ephemeral review evidence:** `.omx/artifacts/visual-ralph/`. It may support a review, but it is not a durable source of truth.

### Authority and host parity

| Surface                                    | Authority                                                                      | Obsidian projection                                  | Quartz projection                            | Current status                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Notes, hierarchy, metadata, topic identity | `Vault/Home/`                                                                  | Markdown and frontmatter                             | Generated `Web/content/`                     | Current                                          |
| Shared cards                               | `Vault/Assets/components/devbook-card.jsx`                                     | Datacore JSX                                         | Frozen HTML/CSS                              | Current                                          |
| FolderNote maps                            | `Vault/Assets/components/devbook-folder-map.jsx`                               | Datacore JSX                                         | Frozen HTML/CSS                              | Current                                          |
| Home dashboard                             | `Vault/Home/index.md`                                                          | Datacore JSX                                         | Frozen HTML/CSS plus `homepage-fit.tsx`      | Current                                          |
| Questions                                  | `[!QUESTION]` callouts in `Vault/Home/`                                        | Datacore index                                       | `QuestionsIndex`                             | Current; equivalent outcome, different renderers |
| StepTrace                                  | `Web/custom/steptrace/src/` and its local `DESIGN.md`                          | Generated Obsidian plugin                            | Generated Quartz assets and host integration | Current                                          |
| Complexity charts                          | `complexity` fences and `Web/custom/complexity/`                               | Shared model rendered to DOM by the StepTrace plugin | Shared model rendered to HAST                | Current; three authored instances                |
| Quartz shell                               | `Web/quartz.config.yaml`, `Web/quartz.ts`, sanctioned styles and `Web/custom/` | Not applicable                                       | Generated `Web/public/`                      | Current                                          |
| Obsidian shell                             | `.obsidian` appearance, enabled snippets, theme, and Style Settings            | Native app UI                                        | Not applicable                               | Current                                          |

Host parity means the same useful reading outcome, not identical markup or host chrome.

Never hand-edit a generated projection to make it look right. Change the owner and rebuild or republish.

## Brand

- **Personality:** Precise, calm, technical, opinionated, and personal.
- **Trust signals:**
  - Notes remain useful in Obsidian and Quartz.
  - Counts, progress, status, icons, and links come from vault data.
  - Navigation reflects the physical vault hierarchy.
  - Visualizations expose real input, state, transitions, and results.
  - Draft or incomplete work is identified honestly.
- **Avoid:**
  - Generic SaaS dashboards, oversized heroes, glassmorphism, neon effects, and decorative gradients.
  - Fake metrics, hard-coded topic catalogues, duplicated navigation, or hand-maintained derived data.
  - Dense administration controls, streaks, badges, or completion theatre.
  - A visual pattern that exists in only one reader without an equivalent fallback.

## Product goals

- **Goals:**
  - Make a large engineering vault quick to navigate and comfortable to reread.
  - Lead from overview to mechanism: Home, topic hub, concept note, concrete example.
  - Make unfinished areas visible without making progress tracking the product.
  - Use interactive visuals when time, state, topology, comparison, or mutation is the concept.
  - Keep authoring in Markdown and frontmatter; derive interfaces from that source.
- **Non-goals:**
  - A general-purpose design-system package.
  - A learning-management, analytics, or spaced-repetition product.
  - A second CMS beside the vault.
  - Pixel-identical Obsidian and Quartz chrome.
  - Visualizing every note.
- **Success signals:**
  - Readers can locate a topic and reach its mechanism with little navigation overhead.
  - Home, FolderNotes, Questions, and Explorer use the same topic metadata.
  - New UI reuses an existing owner before adding another component or token layer.
  - Affected light/dark, desktop/mobile, keyboard, reduced-motion, hard-load, and SPA states are verified.

## Personas and jobs

- **The author:** maintains a personal Senior .NET and AI knowledge base in Obsidian.
- **The returning learner:** revisits one mechanism, tradeoff, pitfall, or question.
- **The public engineer:** arrives through search or a shared link and needs the note to stand alone.
- **The contributor:** changes content or UI without breaking the vault-to-site contract.

Their main jobs are to find a topic, understand its scope, inspect the mechanism, compare alternatives, and move between overview, note, question, and source without losing context.

## Information architecture

- **Home:** whole-vault progress followed by topic cards.
- **FolderNote:** introductory prose, one direct-child card map, retained useful content, annotated references, and optional questions when they teach something.
- **Concept note:** explanation, concrete example, optional visualization, optional questions, and annotated references.
- **Questions:** cross-vault aggregation grouped by the topic hierarchy.
- **Roadmap:** generated spatial overview; never hand-edited.

### Navigation rules

- The physical folder tree and FolderNotes are the taxonomy.
- Topic title, summary, icon, color, and order come from FolderNote frontmatter.
- Published FolderNotes hide unpublished children; authoring views may show them.
- Cards replace direct-child navigation, not useful prose, diagrams, questions, or references.
- Use search, Explorer, FolderNote maps, and contextual prose links instead of standalone link lists.

## Design principles

1. **Parity is the contract.** Both hosts must provide the same useful outcome.
2. **Content drives interface.** Folders, frontmatter, callouts, and lifecycle state own the data.
3. **Show the machine.** Expose input, output, state, transitions, and failure modes.
4. **Overview before detail.** Dashboards orient; cards route; notes teach; visualizers expose mechanism.
5. **One family per concept shape.** Reuse the existing renderer for arrays, graphs, trees, tables, or storage before inventing another.
6. **Quiet chrome, strong state.** Neutral surfaces keep topic and algorithm state meaningful.
7. **Progressive disclosure beats density.** Preserve the primary stage or reading flow and collapse secondary detail.
8. **Responsive by component.** Components respond to their available inline size because Obsidian panes and Quartz columns may be narrower than the viewport.
9. **Motion explains change.** Animate state, not decoration, and respect reduced motion.
10. **Behavior is design.** Focus, keyboard paths, first paint, SPA lifecycle, teardown, overflow, and fallbacks are contracts.

## Visual language

### Color

- **Current:** Green is the global accent: deeper olive in light mode and brighter lime in dark mode.
- **Current:** Top-level FolderNote `color` frontmatter owns topic identity across Home, FolderNote cards, Explorer, and Questions.
- **Direction:** Keep surfaces neutral. Use accents for identity, state, focus, progress, and small markers.
- Never redefine the topic palette in this document or component code.

### Typography

- Headings and interface emphasis: Schibsted Grotesk.
- Body: Source Sans 3 in Obsidian; Source Sans Pro on Quartz.
- Code, aligned values, counts, and algorithm state: IBM Plex Mono.
- Use monospace only when alignment, code, state, or numeric comparison benefits.

### Spacing and layout rhythm

- Use `0.25rem` to `1rem` spacing inside cards and controls; use larger gaps between page sections.
- Cards align title, summary, and footer regions without forcing equal content.
- Home uses a 12-column grid with span changes at `1600px` and `760px`, then one column at `430px`.
- FolderNote maps wrap content-sized cards instead of truncating long titles.
- Visualizations keep stage geometry stable across state changes.

### Shape and elevation

- Use medium rounded rectangles for cards and controls.
- Use circles only for circular data or play/progress controls, and pills only for compact tracks or state chips.
- Shared cards use one border, a modest radius, one soft accent glow, and a small hover/focus lift.
- Visualization stages remain unboxed like diagrams; only functional control surfaces may be raised.

### Motion

- Quartz motion roles are `90ms`, `140ms`, `220ms`, and `340ms`, with a `28ms` stagger.
- Card entrance staggering must settle quickly even in a large grid.
- Use deceleration for entering and acceleration for leaving.
- Do not add whole-page loaders. Gate only the region that is not ready, then fail open.
- Reduced motion removes positional travel and entrance effects. Short color or opacity transitions may remain when they clarify state.

### Imagery and iconography

- Use Lucide line icons; resolve subject-owned icons from frontmatter.
- Decorative icons are hidden from assistive technology; controls and links have accessible names.
- Use Mermaid for portable diagrams, StepTrace for state over time, and complexity charts for growth comparisons.
- Use Excalidraw only when spatial annotation teaches more than a formal diagram.
- Store authored images under `Vault/Assets/`.

### Obsidian shell

- **Current:** Baseline is the configured theme; light/dark follows the OS; base text is `16px`; native menus are enabled.
- **Direction:** Content components consume public theme variables, not Baseline internals.
- **Direction:** The app shell remains quieter than the note and controls stay discoverable on touch devices.
- Tabsdown is an available authoring primitive, not a required page pattern.

## Components

| Component                   | Purpose                                       | Owner                                                                  |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| `db-card`                   | Shared card chrome and focus behavior         | `Vault/Assets/components/devbook-card.jsx`                             |
| `FolderStructureMap`        | Direct-child FolderNote navigation            | `Vault/Assets/components/devbook-folder-map.jsx`                       |
| Home dashboard and progress | Whole-vault overview and topic routing        | `Vault/Home/index.md`                                                  |
| Questions index             | Cross-vault question navigation               | `Vault/Home/Questions.md`, `Web/custom/components/questions-index.tsx` |
| Site header and Explorer    | Global Quartz navigation                      | `Web/custom/components/`                                               |
| Page reveal and Home fit    | Readiness and whole-card responsive fallback  | `Web/custom/components/`                                               |
| StepTrace                   | Algorithm playback and interactive structures | `Web/custom/steptrace/`                                                |
| Complexity chart            | Growth curves, filters, plot, and legend      | `Web/custom/complexity/`                                               |

### Cards and dashboards

- `db-card` owns shared chrome; consumers own layout and genuinely local additions.
- Full-card hit areas are semantic links with visible focus.
- Home orders progress first and topic cards second.
- Lifecycle progress is derived as Not-Started `0`, Creation `33`, Ready to Repeat `66`, and Done `100`.
- Home fit degrades by whole features, then returns to normal scrolling; it never clips the page to preserve one screen.
- Questions shares topic metadata and icon language but uses disclosure/navigation appropriate to that page.

### Visualizations

- StepTrace is for state over time. Its consistency and style rules are in [`Web/custom/steptrace/DESIGN.md`](Web/custom/steptrace/DESIGN.md).
- Complexity is for comparing growth classes, cases, or operation families—not per-step execution.
- **Current:** Complexity has three authored examples: Big O catalogue, Quick Sort cases, and HashMap operations.
- **Current:** One model feeds the Obsidian DOM renderer and Quartz HAST renderer.
- The chart owns its title, filters, plot, endpoint labels, and legend.
- Adjacent Markdown tables own detailed assumptions, causes, auxiliary space, and explanatory fallback; complexity fences carry only inputs that affect the plotted chart.
- A visualization needs initial, active, final, invalid, narrow, light/dark, keyboard, and reduced-motion states when those states apply.

### Ownership rules

- Extend an existing owner before adding a component.
- Do not add a second card system, topic map, icon registry, progress model, or algorithm control shell.
- Global Quartz tokens live in `Web/quartz/styles/custom.scss`.
- Topic identity lives in top-level FolderNote frontmatter.
- A durable new visual rule must update this document or the owning component's local `DESIGN.md`.

## Accessibility

- **Target:** WCAG 2.2 AA for new or changed UI. This is a direction, not a claim that the whole repository is audited.
- Full-card links, disclosures, tabs, transport controls, scrubbers, and native option controls must be keyboard reachable.
- Use visible `:focus-visible` outlines.
- Color is never the only state signal.
- Decorative icons and SVGs are hidden; data graphics have labels or equivalent text.
- Progress exposes percentage and lifecycle totals as text.
- Respect `prefers-reduced-motion`.
- Primary controls and full-card links target at least `44px`/`2.75rem`.
- Hover-only information needs a focus, tap, or visible-text equivalent.

## Responsive behavior

| Surface      | Current contract                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Home cards   | 12-column span rules; narrow spans below `760px`; one column at `430px`                              |
| Quartz shell | Mobile composition below `768px`                                                                     |
| Home fit     | Enabled from `768px` with sufficient height; desktop range begins at `1201px`                        |
| StepTrace    | Mounted-instance compact mode below `704px` inline size                                              |
| Complexity   | Container-based wide treatment from `600px`; otherwise preserve plot width with horizontal scrolling |
| Folder maps  | Content-sized wrapping cards; compact treatment in narrow containers                                 |
| Questions    | Two independent columns collapse to one ordered column                                               |

Prefer container queries or mounted-instance measurement for content components. Use viewport media queries only for true page-shell behavior.

## Interaction states

- **Loading:** Keep prior usable content where possible and gate only the unready region.
- **Empty:** Use a truthful inline message; do not fabricate cards or metrics.
- **Error:** Keep the note readable and show the error near the owning enhancement.
- **Success:** Prefer a stable result, state change, count, or check marker over a toast.
- **Disabled:** Preserve native semantics and explain the unavailable state; do not rely on opacity alone.
- **Slow or unavailable enhancement:** Markdown content remains useful without Datacore, JavaScript, or plugin rendering.

## Content voice

- Direct, concrete, calm, and opinionated.
- Name real APIs, states, operations, errors, and costs.
- Use lifecycle names consistently: Not-Started, Creation, Ready to Repeat, Repetition, Done.
- Trace copy names the real operation: compare, enqueue, relax, swap, visit, accept, reject.
- Keep labels short and explanations in prose, trace, status, or annotations.
- Avoid hype, throat-clearing, repeated summaries, and generic cheerful empty states.

## Implementation constraints

- `Vault/` is the content source. `Web/content/` and `Web/public/` are generated.
- Quartz work stays within sanctioned config, `Web/quartz.ts`, `Web/custom/`, and `Web/quartz/styles/custom.scss`.
- Prefer Quartz configuration, existing components, CSS, and native controls before new abstractions.
- Datacore CSS must pass through `squashCss`; frozen CSS must avoid child combinators because the Syncer escapes `>`.
- StepTrace source generates both host artifacts; complexity shares the StepTrace Obsidian host entry.
- Enhancements remain static-first and must not block note content.
- Verify Quartz hard reload and SPA navigation when lifecycle behavior changes.

### Verification by surface

Run the smallest applicable gate first.

| Surface                 | Automated gate                                                                        | Required manual evidence when behavior changes                     |
| ----------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Vault structure/content | `python3 .scripts/tests/test_validate_vault.py`                                       | Obsidian rendering when affected                                   |
| Cards and dashboards    | Vault validation, then `npm run check` from `Web/`                                    | Obsidian and Quartz; light/dark; desktop/mobile                    |
| StepTrace               | `npm run steptrace:test`, `steptrace:typecheck`, `steptrace:build`, `steptrace:check` | Both hosts; initial/active/final; narrow; reduced motion; teardown |
| Complexity              | `npm run complexity:test`                                                             | Both hosts; filters/legend; narrow scroll; light/dark; keyboard    |
| Quartz shell            | `npm run check`, then a Quartz build when appropriate                                 | Hard load, SPA navigation, focus, and responsive shell             |

Committed screenshots are durable evidence. `.omx/artifacts/` are run artifacts and must not be the only proof of a lasting contract.

## Open questions

- [ ] **Theme scope:** Is Baseline the only certified Obsidian reference, or should content components support a small theme matrix?
- [ ] **Browser scope:** Define minimum evergreen browser versions beyond current Quartz defaults and existing Safari-safe fixes.
- [ ] **Authored imagery:** Keep heterogeneous teaching visuals or converge on a smaller shared illustration language?
- [ ] **StepTrace compact evidence:** Capture the sub-`704px` Trace/Watch rail in light/dark initial/active/final states.
- [ ] **Complexity visual evidence:** Add committed Obsidian and Quartz light/dark desktop/narrow baselines for the three current examples.
