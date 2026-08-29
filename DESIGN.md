# Design

DevBook should feel like a quiet technical instrument inside an engineer's notebook. Its design makes a large software-engineering vault easier to scan, understand, and revisit without turning it into a course platform, admin dashboard, or marketing site.

This is the repository-wide design contract. Keep it limited to verified cross-vault rules. StepTrace-specific rules belong in [`Web/custom/steptrace/DESIGN.md`](Web/custom/steptrace/DESIGN.md).

## Source of truth

- **Status:** Active
- **Last refreshed:** 2026-08-26
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
| Complexity charts                          | `complexity` fences and `Web/custom/complexity/`                               | Shared model rendered to DOM by the StepTrace plugin | Shared model rendered to HAST                | Current contract; 97 DSA v2 charts plus standalone Big O |
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
- **Concept note:** explanation, concrete example, required questions, annotated references, and optional explanatory devices such as visualizations.
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
- Embedded visualizations use exactly two rendered roles: the body sans face for human UI and narrative, and the mono face for formulas, machine state, and aligned data. Their shared hierarchy uses weights `400` and `600`; geometry-fitted labels may vary size only when the available shape requires it.

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
- `[!QUESTION]-` is a collapsed FAQ disclosure, not a card: clear internal padding, a divider, and a plus/minus control expose its behavior; Obsidian uses native app tokens, while Quartz uses DevBook typography and green accent details.
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
- Tabsdown is the sole owner of authored tab structure and interaction. Every StepTrace note uses one outer `Visualization` / `Complexity` group; Tabsdown remains optional elsewhere.

## Components

| Component                   | Purpose                                       | Owner                                                                  |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| `db-card`                   | Shared card chrome and focus behavior         | `Vault/Assets/components/devbook-card.jsx`                             |
| `FolderStructureMap`        | Direct-child FolderNote navigation            | `Vault/Assets/components/devbook-folder-map.jsx`                       |
| Home dashboard and progress | Whole-vault overview and topic routing        | `Vault/Home/index.md`                                                  |
| Questions index             | Cross-vault question navigation               | `Vault/Home/Questions.md`, `Web/custom/components/questions-index.tsx` |
| Site header and Explorer    | Global Quartz navigation                      | `Web/custom/components/`                                               |
| Site footer and sharing     | Global Quartz links and per-page sharing      | `Web/custom/components/site-footer.tsx`                                |
| Page reveal and Home fit    | Readiness and whole-card responsive fallback  | `Web/custom/components/`                                               |
| StepTrace                   | Algorithm playback and interactive structures | `Web/custom/steptrace/`                                                |
| Complexity chart            | Growth curves, plot, and legend               | `Web/custom/complexity/`                                               |

### Quartz shell

- `SiteFooter` wraps the configured community footer instead of replacing its links. Informational links stay left-aligned; per-page sharing sits opposite them from `768px` and stacks as a second, right-aligned row below that breakpoint.
- Share actions remain static-first canonical anchors. Copy enhances its same-page link only when the Clipboard API is available, shows a transient check state, and resets after navigation or its timeout; the other links open native X, LinkedIn, and Reddit share targets.
- Share icons are decorative SVGs behind accessible link names. Footer links use the shared compact spacing, accent hover, and visible accent focus outline; informational links retain normal text color while the Share group stays subtle until interaction.

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
- Every DSA Visualization panel is visual-first. An ordinary panel begins with its `steptrace` fence; a multi-variant panel begins with inner Tabsdown, and each variant begins with its own `steptrace` fence. Quadtree's authored static image is the sole image-first exception. Each owning visualization unit may contain at most one optional `####` support section after its visual; shared and per-variant headings never coexist.
- Every DSA Complexity panel begins with exactly one `complexity` fence and contains no heading or Markdown table. Concise unheaded prose may follow only when it supplies a chart-missing assumption, model or resource distinction, or decision-changing failure boundary. Complexity headings, tables, and claims do not appear outside the panel.
- Every DSA complexity figure renders two ordered resource tabs: Time first, Space second. One panel is visible at a time, the first is selected on load, and the tab strip is the resource's only visible label. The resources may use independent case or operation groupings.
- A complexity chart for an abstract technique—a paradigm or a pattern—uses comparison mode: exactly two approaches, the naive baseline first and the technique second, carrying the same two labels in both resources. An approach is named for what it is, with its mechanism in parentheses (`Naive (triple nested loop)` against `Dynamic programming`), never for a case or an operation family. Its legend is the ungrouped single row, the same one sorting cases use—comparison charts never take the labelled operation-row table. Colour follows growth rather than authoring order: the dearer curve is red and the cheaper green, and approaches that share a growth class take a neutral pair instead, because red against green claims a win the formulas may deny. A product bound in more than one independent variable is a range of growth classes, not one, so it plots as a band between the rung it reaches when the second variable is constant and the rung it reaches when that variable scales with the first: `O(n·k)` spans linear to quadratic. An additive bound over encoded input parts stays one class: with `n` vertices and `m` edges, `O(n + m)` is linear in the combined representation size and uses the linear rung. The floor is stroked solid and the ceiling dashed, because the floor is the cost and the ceiling only the limit. A bound no rung bounds—`O(m^n)`, `O(b^n)`—declares its ceiling `unbounded` and claims every point above its floor, filling flat to past the top of the plot so the clip is the only edge it has; capping such a band at factorial would assert a limit that does not exist, and fading it out at any fixed height puts that same false ceiling back as a soft one. A band never renames the rung it starts from: the ladder stays canonical and the band's own formula lives in the legend. Because an approach is only as cheap as its worst case, a band ranks by its ceiling, so two approaches whose ceilings agree take the neutral pair even when one reaches lower. Charts for a concrete algorithm or data structure keep their own cases or operation families.
- Big O remains standalone: one version 1 catalogue in normal note flow, with no StepTrace block or Tabsdown wrapper.
- **Current:** One model feeds the Obsidian DOM renderer and Quartz HAST renderer.
- Every line is the curve itself, sampled from `n = 0` and drawn as a spline: no straight run from the axis to a first sample, because that junction meets the curve at its own slope and is the corner smoothing cannot remove. The `0` tick is the axis and `1` sits one band above it; that band is exactly wide enough that a straight run across it leaves at the log branch's own slope, so a curve crosses `1` without bending and reaches the origin at `0`. A narrower band has to accelerate into that slope and bends every line into an S. The log rungs are shifted to `log(1 + n)` so every rung is defined and climbing across the whole axis; unshifted they are negative below `n = 1` and undefined at `0`, which left them riding the axis while their neighbours climbed. Where a curve leaves the origin is then the curve's own cost, not an artifact: `n`, `n log n`, `n²` and `log n` are `0` at `n = 0` and start at the origin, while `1`, `2ⁿ` and `n!` are all exactly `1` there and start on the `1` line, because one unit of work is what they cost.
- The chart owns its plots, resource labels, endpoint labels, and legends. A highlighted endpoint uses the authored formula when every highlighted path sharing that curve geometry agrees; otherwise it falls back to the canonical curve label. When highlighted paths coincide, the topmost active path owns the endpoint colour, including after hover or selection, so the label always matches the visible stroke. Bounds without canonical curve geometry stay out of the SVG and appear as noninteractive text without control chrome. Plotted legend controls are borderless and use an underline as their affordance. Untitled legends center those controls in one row; labeled operation legends use compact left-label/right-entry rows with separators, and a clickable row label selects every plotted bound in that row. Hover previews the hovered item or every plotted bound in the hovered row, then restores the clicked selection on leave. Chart and legend labels remain readable at the note's normal type scale. The figure has an accessible name but no visible global title and no case filters. Its one tab strip switches resources and nothing else; it is a renderer-owned control, so authored Tabsdown structure still belongs to Tabsdown, and it borrows Tabsdown's underline personality—equal-width transparent tabs, accent text and accent underline on the selected one—so a chart's inner tabs read as the same control as the panel tabs above them.
- The variable definitions render once, immediately after the resources container, so they remain adjacent to the currently visible resource legend in both hosts. When every operation in a resource has exactly one bound, its legend becomes one unlabeled row whose items use the operation names; any multi-bound operation retains labeled rows.
- A chart plots only a bound that is a function of its declared horizontal variable. A bound in independent variables stays semantic-only unless the configuration declares an honest derived axis or a provable floor/ceiling range; operation ranges use the same validated band grammar as comparisons.
- The complexity configuration owns the plotted and semantic Time/Space bounds. Supporting prose explains only important context the chart cannot carry; it does not restate rows or rebuild a second complexity table.
- Complexity figures have no top margin and retain bottom separation from following content.
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
| Quartz shell | Site footer stacks below `768px`; informational links stay left and Share stays right above it       |
| Home fit     | Enabled from `768px` with sufficient height; desktop range begins at `1201px`                        |
| StepTrace    | Mounted-instance compact mode below `704px` inline size                                              |
| Complexity   | One resource panel at full width at every size; the tab strip scrolls before it wraps, and the figure never gains a horizontal scroller |
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
| Complexity              | `npm run complexity:test`, then `npm run check`                                       | Both hosts; independent legends; narrow scroll; light/dark; keyboard |
| Quartz shell            | `npm run check`, then a Quartz build when appropriate                                 | Hard load, SPA navigation, focus, and responsive shell             |

Complexity runtime QA is task-scoped: when visual behavior changes, inspect representative version 1 and version 2 schemas in both hosts at relevant widths and themes. Unit tests cover generic schema, model, accessibility, rendering, and transformer invariants; they do not encode named notes or screenshot matrices.

Committed screenshots are durable evidence. `.omx/artifacts/` are run artifacts and must not be the only proof of a lasting contract.

## Open questions

- [ ] **Theme scope:** Is Baseline the only certified Obsidian reference, or should content components support a small theme matrix?
- [ ] **Browser scope:** Define minimum evergreen browser versions beyond current Quartz defaults and existing Safari-safe fixes.
- [ ] **Authored imagery:** Keep heterogeneous teaching visuals or converge on a smaller shared illustration language?
- [ ] **StepTrace compact evidence:** Capture the sub-`704px` Trace/Watch rail in light/dark initial/active/final states.
- [ ] **Complexity visual evidence:** Add Obsidian and Quartz light/dark wide/narrow evidence for representative case, operation, semantic-only, and standalone Big O charts.
