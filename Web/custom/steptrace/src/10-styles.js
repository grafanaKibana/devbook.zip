  // ==========================================================================
  //  1. STYLES  —  the ONLY place visual styling lives.
  //  Colours are --st-* tokens (mapped to internal --_* with fallbacks) so a
  //  host rebinds the palette via the cascade without touching this file. The
  //  render section (§5) never sets a colour or layout inline — only data-driven
  //  geometry (bar heights, node coordinates). To restyle steptrace, edit here.
  // ==========================================================================

  // Rows available to the TRACE log. Only as many as fit the log's pinned height
  // are shown, so this is just a ceiling: 10 covers the tallest rail (a deep DP
  // card) even when every step is a single line.
  const LOG_ROWS = 10
  // opacity by age: the live step is 1, the step before it 0.5, then a decaying
  // ramp that bottoms out rather than reaching zero.
  const fadeFor = (age) => Math.max(0.1, 0.5 * Math.pow(0.62, age - 1))

  const STYLE_ID = "steptrace-engine-style"
  const STYLES = `
.steptrace {
  --_amber: var(--st-state-amber, #d97706);
  --_violet: var(--st-state-violet, #7c3aed);
  --_blue: var(--st-state-blue, #2563eb);
  --_green: var(--st-state-green, #4c8000);
  --_neutral: var(--st-neutral, #9aa886);
  --_surface: var(--st-surface, #eef1e6);
  --_text: var(--st-text, #29301f);
  --_muted: var(--st-muted, #6e785e);
  --_border: var(--st-border, #c3cbaf);
  --_accent: var(--st-accent, #4c8000);
  --_on-accent: var(--st-on-accent, #ffffff);
  /* font tokens — hosts bind these to their own families (Quartz: --headerFont
     /--bodyFont/--codeFont; Obsidian: --font-interface/--font-text/--font-monospace).
     Fallbacks name the design's own faces for standalone use. */
  --_font-head: var(--st-font-head, "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif);
  --_font-body: var(--st-font-body, "Source Sans 3", "Source Sans Pro", ui-sans-serif, system-ui, sans-serif);
  --_font-mono: var(--st-font-mono, "IBM Plex Mono", ui-monospace, monospace);
  --_hair: color-mix(in srgb, var(--_text) 14%, transparent);
  --_hover: color-mix(in srgb, var(--_text) 7%, transparent);
  --_tween: 320ms;
  --_spring: cubic-bezier(.34, 1.4, .5, 1);
  color: var(--_text);
  font: 400 14px/1.5 var(--_font-body);
  display: flex;
  flex-direction: column;
  /* directive: no card box — the card lays naturally on the page like a mermaid
     diagram (no border, no fill, no padding). */
  gap: 0;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
}
.steptrace * { box-sizing: border-box; }
.steptrace [hidden] { display: none !important; }
.steptrace--reduced * {
  transition: none !important;
  animation: none !important;
}

/* ============ head: breadcrumb (left) + step counter (right) ============ */
.steptrace__head {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 0 1.4rem;
  margin-bottom: 0.9rem;
}
.steptrace__crumb {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--_font-head);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--_muted);
  letter-spacing: 0.01em;
}
.steptrace__crumb-dot {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 2px;
  background: var(--_accent);
  opacity: 0.9;
  flex: none;
}
.steptrace__crumb-sep {
  color: var(--_border);
}
.steptrace__crumb-algo {
  color: var(--_text);
  font-weight: 600;
}
.steptrace__counter {
  justify-self: end;
  font-family: var(--_font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--_muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.steptrace__counter b {
  color: var(--_text);
  font-weight: 600;
}

/* ============ body: viz stage (left, primary) + rail (right) ============ */
.steptrace__body {
  display: grid;
  grid-template-columns: 1fr minmax(240px, 312px);
  gap: 0 1.5rem;
  align-items: stretch;
}
.steptrace__stage-col {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.steptrace__stage-col--graph {
  justify-content: center;
}
/* the graph claims the column's free space and centres itself inside it, which
   leaves the legend sitting on the column's bottom edge rather than trailing the
   svg wherever it happens to land */
.steptrace__stage-col--graph > .steptrace__graph {
  flex: 1 1 auto;
  min-height: 0;
}
/* every kind except graph bottom-aligns its viz within the stage column, so the
   visualization baseline sits level with the rail's WATCH panel */
.steptrace__stage-col--bottom {
  justify-content: flex-end;
}
/* legend is a sibling of the viz, not a child: bottom of the column, centred */
.steptrace__stage-col > .steptrace__legend {
  width: 100%;
  margin-top: 0.9rem;
  justify-content: center;
}
.steptrace__rail {
  min-width: 0;
  padding-left: 1.4rem;
  border-left: 1px solid var(--_hair);
  display: flex;
  flex-direction: column;
}
.steptrace__rail-label {
  font-family: var(--_font-head);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--_muted);
  margin-bottom: 0.5rem;
}
.steptrace__trace {
  display: flex;
  flex-direction: column;
  margin: auto 0 0.9rem;
}
.steptrace__watch-wrap {
  padding-top: 0.9rem;
  border-top: 1px solid var(--_hair);
}
/* The hosts style bare ol/li as prose, and those rules (Obsidian's
   .markdown-rendered ol/li, specificity 0,1,1) beat a lone .steptrace__log: the
   inline padding indents the log off the rail's left edge that TRACE, RESULT and
   WATCH share, and the block margins inflate the rows until the flex column
   shrinks them. Only this reset has to outrank the host, so it lives here rather
   than in the base rules below — bumping those would sink the --cur modifiers. */
.steptrace .steptrace__log,
.steptrace .steptrace__log-line {
  margin: 0;
  padding: 0;
}
/* RESULT is an <li> of that same list, so it needs the reset too — but it keeps
   its own box padding, and its left edge (the accent border) must land on the
   log's left edge, level with the step numbers. */
.steptrace .steptrace__insight {
  margin: 0;
  padding: 0.65rem 0.7rem;
}
.steptrace .steptrace__log-line::marker,
.steptrace .steptrace__insight::marker {
  content: "";
}

/* Step log: explicit line-height keeps Quartz prose styles from inflating the
   gaps relative to Obsidian. */
.steptrace__log {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.55rem;
  font-family: var(--_font-mono);
  font-size: 0.72rem;
  line-height: 1.4;
  overflow: hidden;
}
/* Every row hugs its whole message, however many lines that takes. fitLog() then
   shows only the rows that fit the log's pinned height, so a step is either
   rendered in full or not at all — never truncated. */
.steptrace__log-line {
  display: flex;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  flex: none;
  line-height: 1.4;
  transition: opacity 0.3s ease;
}
.steptrace__log-line--cur {
  min-height: 1.4em;
}
/* older steps fade out — the ramp is set inline, since how many of them fit is
   only known once the rows have been measured against the log's pinned height */
.steptrace__log-num {
  flex: none;
  color: var(--_muted);
  opacity: 0.5;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.steptrace__log-text {
  color: var(--_muted);
}
.steptrace__log-line--cur .steptrace__log-num {
  opacity: 1;
  color: var(--_accent);
  font-weight: 600;
}
.steptrace__log-line--cur .steptrace__log-text {
  color: var(--_text);
  font-weight: 600;
}
/* watch rows: key … value, hairline between */
.steptrace__watch {
  display: flex;
  flex-direction: column;
}
.steptrace__watch-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2em;
  font-family: var(--_font-mono);
  font-size: 0.72rem;
  border-bottom: 1px solid var(--_hair);
}
.steptrace__watch-row:last-child {
  border-bottom: 0;
}
.steptrace__watch-sw {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}
.steptrace__watch-k {
  color: var(--_muted);
  flex: none;
}
.steptrace__watch-v {
  margin-left: auto;
  color: var(--_text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The last row of the log on the terminal frame: it stands where the current step
   line would be, so the TRACE eyebrow and the preceding steps stay in place and
   only the live line gives way to the answer. It restates the card's own 14px so
   its em-based box does not shrink against the log's 0.72rem text. */
.steptrace__insight {
  display: block;
  list-style: none;
  margin: 0;
  padding: 0.65rem 0.7rem;
  flex: none;
  font-size: 14px;
  border-left: 3px solid var(--_green);
  background: color-mix(in srgb, var(--_green) 9%, transparent);
  min-height: 4.65em;
}
.steptrace__insight-label {
  display: block;
  margin-bottom: 0.22rem;
  font: 700 0.58rem/1.2 var(--_font-head);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--_muted);
}
.steptrace__insight-text {
  display: block;
  font: 600 0.72rem/1.45 var(--_font-mono);
  color: var(--_text);
}

/* ============ foot: scrubber + transport + kebab ============ */
.steptrace__foot {
  margin-top: 1.1rem;
}
.steptrace__scrub {
  position: relative;
  height: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.steptrace__scrub-track {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--_hair);
  border-radius: 2px;
}
.steptrace__scrub-fill {
  position: absolute;
  left: 0;
  height: 2px;
  background: var(--_accent);
  border-radius: 2px;
  width: 0;
}
.steptrace__scrub-dot {
  position: absolute;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--_accent);
  transform: translateX(-50%);
  left: 0;
}
.steptrace__milestones {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.steptrace__milestone {
  position: absolute;
  top: 50%;
  width: 5px;
  height: 5px;
  border-radius: 1px;
  border: 1px solid var(--st-page, #fff);
  background: var(--_muted);
  transform: translate(-50%, -50%) rotate(45deg);
  opacity: 0.72;
}
.steptrace__milestone[data-passed="1"] {
  background: var(--_accent);
  opacity: 1;
}
.steptrace__phase {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
  font: 600 0.66rem/1.3 var(--_font-mono);
  color: var(--_muted);
}
.steptrace__phase-name {
  color: var(--_text);
}
.steptrace__transport {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  margin-top: 0.55rem;
}
.steptrace__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--_text);
  cursor: pointer;
  padding: 0;
}
.steptrace__btn:hover {
  background: var(--_hover);
}
.steptrace__btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.steptrace__btn--play {
  background: var(--_accent);
  color: var(--_on-accent);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin: 0 0.35rem;
}
.steptrace__btn--play svg {
  fill: currentColor;
  stroke: currentColor;
  width: 15px;
  height: 15px;
}
.steptrace__btn:disabled {
  opacity: 0.35;
  cursor: default;
  background: transparent;
}
.steptrace__btn:focus-visible {
  outline: 2px solid var(--_blue);
  outline-offset: 2px;
}
.steptrace__spacer {
  flex: 1 1 auto;
}
/* kebab popover */
.steptrace__menu-wrap {
  position: relative;
}
.steptrace__menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  min-width: 13rem;
  background: var(--st-page, #fff);
  border: 1px solid var(--_border);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    visibility 0.15s;
  z-index: 20;
}
.steptrace__menu-section {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}
.steptrace__menu--open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.steptrace__menu-h {
  font-family: var(--_font-head);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--_muted);
  margin: 0;
  padding: 0 0.1rem;
}
.steptrace__menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  margin: 0;
  padding: 0.55rem 0.6rem;
  border-radius: 6px;
  font: 500 0.8rem var(--_font-body);
  color: var(--_text);
  cursor: pointer;
  background: transparent;
  border: 0;
  width: 100%;
  text-align: left;
}
.steptrace__menu-item:hover {
  background: var(--_hover);
}
.steptrace__menu-item[aria-checked="true"] {
  color: var(--_accent);
  font-weight: 600;
}
/* speed slider row: host-native in Obsidian, HTML range fallback on the web */
.steptrace__speed-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  margin: 0;
  padding: 0;
}
.steptrace__speed-control {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: 1 1 auto;
  min-width: 0;
}
.steptrace__speed-control > input {
  flex: 1 1 auto;
  min-width: 0;
}
/* Quartz fallback: draw a consistent rail because browser-native range metrics
   differ. The Obsidian SliderComponent deliberately does not receive this class. */
.steptrace input.steptrace__range {
  -webkit-appearance: none;
  appearance: none;
  flex: 1 1 auto;
  min-width: 0; /* a flex item must be allowed to shrink or it overflows the menu */
  height: 16px;
  margin: 0;
  padding: 0;
  border: 0;
  box-shadow: none;
  cursor: pointer;
  vertical-align: middle;
  background-color: transparent;
  background-image: linear-gradient(var(--_hair), var(--_hair));
  background-size: 100% 2px;
  background-position: 0 50%;
  background-repeat: no-repeat;
}
.steptrace input.steptrace__range::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  height: 16px;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.steptrace input.steptrace__range::-moz-range-track {
  height: 16px;
  border: 0;
  background: transparent;
  box-shadow: none;
}
/* margin-top = (track 16 − thumb 12) / 2 — webkit offsets the thumb from the
   track's top edge; Firefox centres it for us. */
.steptrace input.steptrace__range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  margin-top: 2px;
  border: 0;
  box-shadow: none;
  border-radius: 50%;
  background: var(--_accent);
}
.steptrace input.steptrace__range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 0;
  box-shadow: none;
  border-radius: 50%;
  background: var(--_accent);
}
.steptrace input.steptrace__range:focus-visible {
  outline: 2px solid var(--_blue);
  outline-offset: 3px;
}
.steptrace__speed-val {
  min-width: 5ch; /* fits "1.25×" — the label can never resize the menu */
  text-align: right;
  font: 600 0.78rem var(--_font-body);
  color: var(--_text);
  font-variant-numeric: tabular-nums;
}
/* native-looking dropdown (start node / search target), themed via tokens */
.steptrace__select {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  min-height: 2.5rem;
  margin: 0;
  padding: 0.55rem 1.8rem 0.55rem 0.6rem;
  border: 1px solid var(--_border);
  border-radius: 6px;
  font: 500 0.8rem var(--_font-body);
  color: var(--_text);
  background-color: transparent;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 4l3 3 3-3' fill='none' stroke='%23888' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 10px;
  cursor: pointer;
}
.steptrace__select:focus-visible {
  outline: 2px solid var(--_blue);
  outline-offset: 2px;
}

/* Narrow: stack the rail beneath the stage; transport follows the rail as a
   normal part of the document flow. */
@media (max-width: 560px) {
  .steptrace__body {
    grid-template-columns: 1fr;
  }
  .steptrace__rail {
    border-left: 0;
    border-top: 1px solid var(--_hair);
    padding-left: 0;
    padding-top: 1rem;
    margin-top: 1rem;
  }
  .steptrace__trace {
    margin-top: 0;
  }
  .steptrace__log {
    height: auto !important;
    min-height: 0;
    overflow: visible;
  }
  /* stacked: only the live line (or, at the end, the RESULT that stands in its
     place) survives — there is no room for the step history */
  .steptrace__log-line:not(.steptrace__log-line--cur) {
    display: none;
  }
  .steptrace__log-line--cur {
    min-height: 0;
  }
  .steptrace__insight {
    min-height: 0;
  }
  .steptrace__scrub {
    height: 24px;
  }
  .steptrace__btn,
  .steptrace__btn--play {
    width: 44px;
    height: 44px;
  }
  .steptrace__transport {
    gap: 0.2rem;
  }
}

/* ---- bar chart: SHARED by sort + binary-search. A fixed-height stage of
      bottom-aligned bars; each bar is a coloured fill with the value BELOW and
      an optional white check INSIDE when the bar is finalised (sorted / found).
      Sort adds the --pins modifier to reserve headroom for its i/j markers. ---- */
.steptrace__stage {
  position: relative;
  height: 200px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.steptrace__stage--pins {
  padding-top: 38px; /* headroom above the tallest bar for the pin markers */
}
.steptrace__bar {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}
.steptrace__fill {
  position: relative;
  width: 100%;
  min-height: 8px;
  border-radius: 3px 3px 1px 1px;
  background: var(--_neutral);
  opacity: 0.55;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  transition:
    height var(--_tween) var(--_spring),
    background var(--_tween) ease,
    opacity var(--_tween) ease;
}
.steptrace__bar-cue {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: var(--_on-accent);
  text-shadow: 0 1px 2px color-mix(in srgb, var(--_text) 45%, transparent);
  pointer-events: none;
}
.steptrace__bar-cue svg {
  display: none;
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.steptrace__num {
  font: 600 0.72rem/1 var(--_font-mono);
  color: var(--_muted);
  font-variant-numeric: tabular-nums;
}
.steptrace__check {
  display: none;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 0.95rem;
  height: 0.95rem;
  color: #fff;
}
.steptrace__check svg {
  display: block;
  width: 100%;
  height: 100%;
}
/* quick-sort pivot: an amber outline on the bar itself (not a frame around the
   whole column). Compare/swap fills still show through — the ring alone marks
   the pivot, and it persists across the partition. */
.steptrace__bar[data-pivot="1"] .steptrace__fill {
  box-shadow: inset 0 0 0 2px var(--_amber);
  opacity: 1;
}
/* FLIP swap: the two swapped bars slide into each other's slots. While flying,
   the fill's height transition is dropped so each bar ARRIVES at its new height
   (a literal swap, not a morph). Transform-only — zero layout impact. */
.steptrace__bar--fly {
  transition: transform 0.32s var(--_spring);
}
.steptrace__bar--fly .steptrace__fill {
  transition:
    background var(--_tween) ease,
    opacity var(--_tween) ease;
}
.steptrace--reduced .steptrace__bar--fly {
  transition: none;
}
/* sort states */
.steptrace__bar[data-state="compare"] .steptrace__fill {
  background: var(--_blue);
  opacity: 1;
}
.steptrace__bar[data-state="compare"] .steptrace__cue-compare {
  display: block;
}
.steptrace__bar[data-state="swap"] .steptrace__fill {
  background: var(--_violet);
  opacity: 1;
}
.steptrace__bar[data-state="swap"] .steptrace__cue-swap {
  display: block;
}
.steptrace__bar[data-state="candidate"] .steptrace__fill {
  background: var(--_amber);
  opacity: 1;
}
.steptrace__bar[data-state="candidate"] .steptrace__fill::before {
  content: "◆";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: var(--_on-accent);
  font: 800 0.68rem/1 var(--_font-head);
  text-shadow: 0 1px 2px color-mix(in srgb, var(--_text) 45%, transparent);
  font-size: 0.68rem;
}
.steptrace__bar[data-state="sorted"] .steptrace__fill {
  background: var(--_green);
  opacity: 0.95;
}
.steptrace__bar[data-state="sorted"] .steptrace__check {
  display: block;
}
/* quick/merge: bars outside the active range are dimmed (like binary-search's
   eliminated half). Overrides the per-state opacity above; keeps the fill hue. */
.steptrace__bar[data-outside="1"] .steptrace__fill {
  opacity: 0.28;
}
.steptrace__bar[data-outside="1"] .steptrace__num {
  opacity: 0.4;
}
/* pin marker: JS writes transform(x,y) to the anchor (bar top-centre); the
   margins lift the teardrop so its tip floats ~6px above the bar top. */
.steptrace__pin {
  position: absolute;
  left: 0;
  top: 0;
  width: 22px;
  height: 27px;
  margin-left: -11px;
  margin-top: -33px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  will-change: transform;
}
.steptrace__pin--a {
  color: var(--_blue);
}
.steptrace__pin--b {
  color: var(--_violet);
}
.steptrace__pin-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  display: block;
}
.steptrace__pin-svg path {
  fill: color-mix(in srgb, currentColor 88%, transparent);
  stroke: currentColor;
  stroke-width: 1.6px;
  stroke-linejoin: round;
}
.steptrace__pin-label {
  position: absolute;
  left: 50%;
  top: 38%;
  transform: translate(-50%, -50%);
  font: 700 0.62rem/1 var(--_font-head);
  color: var(--_on-accent);
}

/* ---- binary-search states (same shared bars as sort) ---- */
.steptrace__bar[data-state="range"] .steptrace__fill {
  background: var(--_neutral);
  opacity: 0.7;
}
.steptrace__bar[data-state="eliminated"] .steptrace__fill {
  opacity: 0.22;
  background-image: repeating-linear-gradient(
    135deg,
    transparent 0 4px,
    color-mix(in srgb, var(--_text) 28%, transparent) 4px 5px
  );
}
.steptrace__bar[data-state="eliminated"] .steptrace__num {
  opacity: 0.4;
}
.steptrace__bar[data-state="probe"] .steptrace__fill {
  background: var(--_blue);
  opacity: 1;
}
.steptrace__bar[data-state="probe"] .steptrace__fill::before {
  content: "?";
}
.steptrace__bar[data-state="found"] .steptrace__fill {
  background: var(--_green);
  opacity: 1;
}
.steptrace__bar[data-state="found"] .steptrace__check {
  display: block;
}

/* ---- string matching: text + pattern as pointer-style segmented strips,
      stacked (the pattern strip slides under the current window) ---- */
/* hash badge (rabin-karp): sits BELOW the visualization, above the scrubber */
.steptrace__hash {
  display: inline-block;
  margin-top: 0.85rem;
  font: 600 0.72rem var(--_font-mono);
  color: var(--_text);
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--_accent) 12%, transparent);
}
.steptrace__match {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden; /* clip the sliding pattern flush to the container */
}
/* the main text strip fills the full container width like the pointers array */
.steptrace__cells {
  display: flex;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--_text) 22%, transparent);
  border-radius: 9px;
  overflow: hidden;
}
/* the pattern strip is only as wide as its own cells and slides via translateX */
.steptrace__cells--pat {
  width: max-content;
  align-self: flex-start;
  transition: transform var(--_tween) var(--_spring);
}
.steptrace__cell {
  flex: 1 1 0; /* text cells stretch to fill; same sizing as the pointers strip */
  min-width: 0;
  height: 44px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid color-mix(in srgb, var(--_text) 13%, transparent);
  font: 500 0.98rem var(--_font-mono);
  color: var(--_text);
  transition:
    background var(--_tween) ease,
    color 0.22s ease;
}
/* pattern cells are pinned to the measured width of one text cell (--_cw) so the
   slide stays aligned even as the responsive text strip changes cell size */
.steptrace__cell--pat {
  flex: 0 0 var(--_cw, 34px);
  width: var(--_cw, 34px);
}
.steptrace__cell:last-child {
  border-right: 0;
}
.steptrace__cell[data-state="window"] {
  background: color-mix(in srgb, var(--_accent) 15%, transparent);
}
.steptrace__cell[data-state="match"] {
  background: color-mix(in srgb, var(--_green) 22%, transparent);
  color: var(--_green);
  font-weight: 700;
  box-shadow: inset 0 -3px 0 var(--_green);
}
.steptrace__cell[data-state="mismatch"] {
  background: color-mix(in srgb, var(--_amber) 22%, transparent);
  box-shadow: inset 0 0 0 2px var(--_amber);
}
.steptrace__cell[data-state="probe"] {
  background: color-mix(in srgb, var(--_blue) 18%, transparent);
  box-shadow: inset 0 -3px 0 var(--_blue);
}
.steptrace__cell[data-state="found"] {
  background: color-mix(in srgb, var(--_green) 22%, transparent);
  color: var(--_green);
  box-shadow: inset 0 -3px 0 var(--_green);
}

/* ---- array pointers: segmented strip + tinted window + [ ] brackets ---- */
.steptrace__pwrap {
  position: relative;
  height: 46px;
  margin: 1.4rem 0;
}
.steptrace__pcells {
  display: flex;
  height: 100%;
  border: 1px solid color-mix(in srgb, var(--_text) 22%, transparent);
  border-radius: 9px;
  overflow: hidden; /* clips the window tint flush to the rounded ends */
}
.steptrace__pcell {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 500 0.98rem var(--_font-mono);
  color: var(--_text);
  border-right: 1px solid color-mix(in srgb, var(--_text) 13%, transparent);
  transition:
    background var(--_tween) ease,
    color 0.22s ease,
    font-weight 0.22s ease;
}
.steptrace__pcell:last-child {
  border-right: 0;
}
.steptrace__pcell[data-state="window"] {
  background: color-mix(in srgb, var(--_accent) 15%, transparent);
}
.steptrace__pcell[data-state="match"] {
  background: color-mix(in srgb, var(--_green) 22%, transparent);
}
.steptrace__pcell[data-end="l"] {
  color: var(--_blue);
  font-weight: 700;
}
.steptrace__pcell[data-end="r"] {
  color: var(--_violet);
  font-weight: 700;
}
.steptrace__pcell[data-state="match"][data-end] {
  color: var(--_green);
}
/* [ ] brackets: overlaid at the window ends, nested a few px inside, square
   unless they sit on the strip's own rounded end cell (data-round="1"). */
.steptrace__pbrackets {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.steptrace__pbr {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 7px;
  border: 2.5px solid transparent;
  transition:
    left 0.35s var(--_spring),
    border-color 0.3s ease;
}
.steptrace__pbr--l {
  border-right: 0;
  transform: translateX(3px);
  border-color: var(--_blue);
}
.steptrace__pbr--r {
  border-left: 0;
  transform: translateX(calc(-100% - 3px));
  border-color: var(--_violet);
}
.steptrace__pbr--l[data-round="1"] {
  border-radius: 6px 0 0 6px;
}
.steptrace__pbr--r[data-round="1"] {
  border-radius: 0 6px 6px 0;
}
.steptrace__pbrackets[data-match="1"] .steptrace__pbr {
  border-color: var(--_green);
}

/* ---- dp / LCS: a 2-D grid in the pointer-strip idiom (framed + rounded, with
      hairline dividers and tinted states); cells fill in one by one ---- */
.steptrace__dp-wrap {
  display: block;
  width: 100%;
  overflow-x: auto;
  border: 1px solid color-mix(in srgb, var(--_text) 22%, transparent);
  border-radius: 9px;
  margin: 0.4rem 0;
}
.steptrace__dp {
  width: 100%; /* fills the container; columns distribute evenly (row height fixed) */
  table-layout: fixed;
  border-collapse: collapse;
  font: 500 0.9rem var(--_font-mono);
}
.steptrace__dp th {
  color: var(--_muted);
  font: 600 0.7rem var(--_font-head);
  padding: 5px 9px;
  text-align: center;
  background: color-mix(in srgb, var(--_text) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--_text) 11%, transparent);
}
.steptrace__dp td {
  position: relative;
  height: 38px;
  text-align: center;
  color: var(--_text);
  border: 1px solid color-mix(in srgb, var(--_text) 11%, transparent);
  transition:
    background var(--_tween) ease,
    color 0.22s ease;
}
.steptrace__dp td::after {
  position: absolute;
  right: 3px;
  top: 2px;
  font: 800 8px/1 var(--_font-mono);
  color: currentColor;
}
.steptrace__dp td[data-state="dep"] {
  background: color-mix(in srgb, var(--_amber) 20%, transparent);
}
.steptrace__dp td[data-state="dep"]::after {
  content: "↖";
}
.steptrace__dp td[data-state="cur"] {
  background: color-mix(in srgb, var(--_blue) 20%, transparent);
  color: var(--_blue);
  font-weight: 700;
}
.steptrace__dp td[data-state="cur"]::after {
  content: "■";
}
.steptrace__dp td[data-state="path"] {
  background: color-mix(in srgb, var(--_green) 22%, transparent);
  color: var(--_green);
  font-weight: 700;
}
.steptrace__dp td[data-state="path"]::after {
  content: "✓";
}

/* ---- union-find: nodes + arcs share the GRAPH styling (opaque backing, tinted
      fill, thin constant stroke; arcs change colour, not thickness). Nodes are
      coloured by set — stroke + fill tint set inline per frame. ---- */
.steptrace__uf .steptrace__ufnode .steptrace__nback {
  fill: var(--st-page, var(--_surface));
  stroke: none;
}
.steptrace__uf .steptrace__ufnode .steptrace__ncirc {
  stroke: var(--_neutral);
  stroke-width: 1.6;
  transition:
    stroke var(--_tween) ease,
    fill var(--_tween) ease;
}
.steptrace__uf .steptrace__id {
  fill: var(--_text);
  font: 600 13px var(--_font-head);
}
.steptrace__ufarc {
  stroke: var(--_neutral);
  stroke-width: 2;
  transition: stroke var(--_tween) ease;
}
.steptrace__ufarc[data-active="true"] {
  stroke: var(--_violet);
  stroke-dasharray: 5 3;
}

/* ---- bits: the three lanes read as an equation (x / − 1 / & = result), with a
   fixed tally of the original 1s that fills in as each is cleared. ---- */
.steptrace__bits {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0.4rem 0;
}
/* tally: one square per set bit of the ORIGINAL value (count known upfront ⇒
   fixed width, zero jitter). Squares fill left→right as bits are cleared. */
.steptrace__btally {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 22px;
  margin-bottom: 2px;
}
.steptrace__btally-lead {
  flex: 0 0 72px;
  text-align: right;
  font: 600 0.62rem var(--_font-mono);
  letter-spacing: 0.02em;
  color: var(--_muted);
}
.steptrace__btally-boxes {
  display: flex;
  gap: 5px;
}
.steptrace__btally-box {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1.5px solid color-mix(in srgb, var(--_text) 26%, transparent);
  transition:
    background var(--_tween) var(--_spring),
    border-color var(--_tween) ease,
    transform var(--_tween) var(--_spring);
}
.steptrace__btally-box[data-filled="1"] {
  background: var(--_accent);
  border-color: var(--_accent);
}
/* the square that just filled on THIS frame gets a brief pop */
.steptrace__btally-box[data-just="1"] {
  transform: scale(1.18);
}
.steptrace__btally-count {
  margin-left: 4px;
  font: 600 0.68rem var(--_font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--_text);
}
.steptrace__brow {
  display: flex;
  align-items: stretch;
  gap: 9px;
  transition: opacity var(--_tween) ease;
}
/* dimmed placeholder lanes (b / r before they go live) — never removed from DOM */
.steptrace__brow[data-live="0"] {
  opacity: 0.32;
}
.steptrace__bgutter {
  flex: 0 0 72px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font: 600 0.66rem var(--_font-mono);
  color: var(--_muted);
  white-space: nowrap;
}
/* the operator that turns the row above into this row (− 1, &) reads as arithmetic */
.steptrace__bop {
  color: var(--_accent);
  font-weight: 700;
}
.steptrace__bcells {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--_text) 22%, transparent);
  border-radius: 9px;
  overflow: hidden; /* clip cell tints flush to the rounded frame */
}
.steptrace__brow--idx {
  align-items: flex-end;
}
.steptrace__bcells--idx {
  height: 20px;
  border: 0;
  border-radius: 0;
  overflow: visible;
}
.steptrace__bidx {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font: 600 0.62rem var(--_font-mono);
  color: var(--_muted);
  font-variant-numeric: tabular-nums;
}
.steptrace__bcell {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid color-mix(in srgb, var(--_text) 13%, transparent);
  font: 500 0.95rem var(--_font-mono);
  color: var(--_muted);
  transition:
    background var(--_tween) ease,
    color 0.22s ease,
    box-shadow 0.22s ease;
}
.steptrace__bcell:last-child {
  border-right: 0;
}
/* a set bit reads as filled so the bitmap pattern is legible at a glance */
.steptrace__bcell[data-bit="1"] {
  background: color-mix(in srgb, var(--_text) 12%, transparent);
  color: var(--_text);
  font-weight: 600;
}
/* Three states only (source-ordered AFTER the data-bit rule so they win on set
   cells). die = the lowest 1 being cleared (amber); borrow = the zeros it flips
   up to 1 (blue); gone = the region AND wipes, struck through so it reads
   "deleted" without a competing tint. */
.steptrace__bcell[data-state="die"] {
  background: color-mix(in srgb, var(--_amber) 26%, transparent);
  box-shadow: inset 0 0 0 2px var(--_amber);
  color: var(--_amber);
  font-weight: 700;
}
.steptrace__bcell[data-state="borrow"] {
  background: color-mix(in srgb, var(--_blue) 22%, transparent);
  color: var(--_blue);
  font-weight: 700;
}
.steptrace__bcell[data-state="gone"] {
  background: color-mix(in srgb, var(--_muted) 8%, transparent);
  color: color-mix(in srgb, var(--_muted) 60%, transparent);
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
  text-decoration-color: color-mix(in srgb, var(--_amber) 70%, transparent);
}

/* ---- backtrack: an n×n board (row = recursion depth) + a path strip ---- */
.steptrace__bt {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin: 0.4rem 0;
}
.steptrace__btboard {
  display: grid;
  grid-template-columns: repeat(var(--_n), 1fr);
  width: 100%;
  max-width: min(100%, 320px);
  margin: 0 auto;
  border: 1px solid color-mix(in srgb, var(--_text) 22%, transparent);
  border-radius: 9px;
  overflow: hidden; /* clip cell tints flush to the rounded frame */
}
.steptrace__btcell {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-right: 1px solid color-mix(in srgb, var(--_text) 10%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--_text) 10%, transparent);
  transition: background var(--_tween) ease;
}
/* faint checkerboard so the grid reads as a board even when empty */
.steptrace__btcell[data-parity="1"] {
  background: color-mix(in srgb, var(--_text) 4%, transparent);
}
/* squares attacked by committed queens: shrink visibly before a choice, recede on undo */
.steptrace__btcell[data-state="attacked"] {
  background: color-mix(in srgb, var(--_muted) 16%, transparent);
}
.steptrace__btcell[data-state="try"] {
  background: color-mix(in srgb, var(--_blue) 22%, transparent);
}
.steptrace__btcell[data-state="reject"] {
  background: color-mix(in srgb, var(--_amber) 22%, transparent);
}
.steptrace__btcell[data-state="remove"] {
  background: color-mix(in srgb, var(--_amber) 40%, transparent);
}
.steptrace__btcell[data-state="queen"] {
  background: color-mix(in srgb, var(--_green) 22%, transparent);
}
.steptrace__btcell[data-state="solved"] {
  background: color-mix(in srgb, var(--_green) 40%, transparent);
}
/* the attacking queen above that vetoes a rejected square: an inset amber ring */
.steptrace__btcell[data-conflict="1"] {
  box-shadow: inset 0 0 0 2.5px var(--_amber);
}
/* ♛ glyph: revealed by opacity when the cell holds a queen (tear-off = fade-out) */
.steptrace__btqueen {
  font-size: 1.15rem;
  line-height: 1;
  color: var(--_text);
  opacity: 0;
  transition: opacity var(--_tween) ease;
}
.steptrace__btcell[data-has-queen="1"] .steptrace__btqueen {
  opacity: 1;
}
.steptrace__btcell[data-state="solved"] .steptrace__btqueen,
.steptrace__btcell[data-state="queen"] .steptrace__btqueen {
  color: var(--_green);
}
/* path strip: one slot per row, the linearised root-to-node path with push/pop */
.steptrace__btpath {
  display: flex;
  max-width: min(100%, 320px);
  width: 100%;
  margin: 0 auto;
  border: 1px solid color-mix(in srgb, var(--_text) 22%, transparent);
  border-radius: 9px;
  overflow: hidden;
}
.steptrace__btslot {
  flex: 1 1 0;
  min-width: 0;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 0.9rem var(--_font-mono);
  color: var(--_muted);
  border-right: 1px solid color-mix(in srgb, var(--_text) 13%, transparent);
  transition:
    background var(--_tween) ease,
    color 0.22s ease;
}
.steptrace__btslot:last-child {
  border-right: 0;
}
.steptrace__btslot[data-state="on"] {
  background: color-mix(in srgb, var(--_green) 20%, transparent);
  color: var(--_green);
  font-weight: 700;
}
.steptrace__btslot[data-state="try"] {
  background: color-mix(in srgb, var(--_blue) 20%, transparent);
  color: var(--_blue);
  font-weight: 700;
}
.steptrace__btslot[data-state="reject"] {
  background: color-mix(in srgb, var(--_amber) 20%, transparent);
  color: var(--_amber);
}
.steptrace__btslot[data-state="remove"] {
  background: color-mix(in srgb, var(--_amber) 34%, transparent);
  color: var(--_amber);
  font-weight: 700;
}

/* ---- rectree: a naive recursion tree collapsing into a memo DAG (SVG) ----
   The FULL naive tree is laid out once and every node lives in the SVG from
   frame 0; reveal is a data-vis opacity toggle (never DOM insertion) and a memo
   hit dims a subtree via data-collapsed — so the node set, viewBox and stage
   height are constant on every frame (zero footer jitter). Colour changes only;
   stroke-width stays fixed (the "graph card" fix) to keep geometry stable. */
.steptrace__rectree {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: stretch;
}
.steptrace__rtsvg {
  width: 100%;
  height: auto;
  max-height: 260px;
  overflow: visible;
}
.steptrace__rtedge {
  stroke: var(--_neutral);
  stroke-width: 1.6;
  transition:
    stroke var(--_tween) ease,
    opacity var(--_tween) ease;
}
.steptrace__rtedge[data-vis="0"] {
  opacity: 0.12;
}
.steptrace__rtedge[data-collapsed="true"] {
  opacity: 0.3;
}
.steptrace__rtnode {
  transition: opacity var(--_tween) ease;
}
.steptrace__rtnode[data-vis="0"] {
  opacity: 0.12;
}
/* a memo-saved subtree: shown, but dimmed + desaturated so it reads as skipped */
.steptrace__rtnode[data-collapsed="true"] {
  opacity: 0.34;
  filter: grayscale(1);
}
.steptrace__rtnode .steptrace__rtback {
  fill: var(--st-page, var(--_surface));
  stroke: none;
}
.steptrace__rtnode .steptrace__rtcirc {
  fill: color-mix(in srgb, var(--_neutral) 20%, transparent);
  stroke: var(--_neutral);
  stroke-width: 1.6;
  transition:
    fill var(--_tween) ease,
    stroke var(--_tween) ease;
}
/* active-call ring: opacity toggle only — no radius/stroke-width change */
.steptrace__rtnode .steptrace__rtring {
  fill: none;
  stroke: var(--_violet);
  stroke-width: 1.8;
  opacity: 0;
  transition: opacity var(--_tween) ease;
}
.steptrace__rtnode[data-active="true"] .steptrace__rtring {
  opacity: 1;
}
.steptrace__rtnode .steptrace__rtlabel {
  fill: var(--_text);
  font: 600 10px var(--_font-mono);
}
.steptrace__rtnode .steptrace__rtval {
  fill: var(--_muted);
  font: 600 9px var(--_font-mono);
}
.steptrace__rtnode[data-state="compute"] .steptrace__rtcirc {
  fill: color-mix(in srgb, var(--_blue) 22%, transparent);
  stroke: var(--_blue);
}
.steptrace__rtnode[data-state="base"] .steptrace__rtcirc {
  fill: color-mix(in srgb, var(--_muted) 16%, transparent);
  stroke: var(--_muted);
}
.steptrace__rtnode[data-state="miss"] .steptrace__rtcirc {
  fill: color-mix(in srgb, var(--_amber) 18%, transparent);
  stroke: var(--_amber);
}
.steptrace__rtnode[data-state="hit"] .steptrace__rtcirc {
  fill: color-mix(in srgb, var(--_green) 30%, transparent);
  stroke: var(--_green);
}

/* ---- graph: svg ---- */
.steptrace__graph {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.steptrace__svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 260px;
  margin-inline: auto;
  overflow: visible;
}
.steptrace__arrow {
  fill: var(--_neutral);
}
.steptrace__edge {
  stroke: var(--_neutral);
  stroke-width: 2;
  transition: stroke var(--_tween) ease;
}
/* Once the algorithm has committed edges (a shortest path, an MST), every edge it
   passed over goes dashed — the solid run is then only the answer. Ordering is
   load-bearing: --active and --selected tie on specificity and must win. */
.steptrace__edge[data-dim="true"] {
  stroke-dasharray: 4 4;
}
.steptrace__edge[data-active="true"] {
  stroke: var(--_violet);
  stroke-dasharray: 3 3;
}
.steptrace__edge[data-selected="true"] {
  stroke: var(--_green);
  stroke-dasharray: none;
}
.steptrace__edge-label {
  fill: var(--_muted);
  font: 600 11px var(--_font-mono);
}
.steptrace__node .steptrace__nback {
  fill: var(--st-page, var(--_surface));
  stroke: none;
}
.steptrace__node .steptrace__ncirc {
  fill: color-mix(in srgb, var(--_neutral) 20%, transparent);
  stroke: var(--_neutral);
  stroke-width: 1.6;
  transition:
    fill var(--_tween) ease,
    stroke var(--_tween) ease,
    stroke-width var(--_tween) ease;
}
.steptrace__node .steptrace__id {
  fill: var(--_text);
  font: 600 13px var(--_font-head);
}
/* search goal (bfs/dfs target): a static dashed halo around the node */
.steptrace__ntarget {
  fill: none;
  stroke: var(--_violet);
  stroke-width: 1.4;
  stroke-dasharray: 3 3;
}
.steptrace__node .steptrace__d {
  fill: var(--_muted);
  font: 600 10px var(--_font-mono);
}
.steptrace__node .steptrace__nmark {
  color: var(--_muted);
  overflow: visible;
}
.steptrace__node .steptrace__nmark [data-state-icon] {
  display: none;
}
.steptrace__node .steptrace__nmark[data-state="current"] [data-state-icon="current"],
.steptrace__node .steptrace__nmark[data-state="frontier"] [data-state-icon="frontier"],
.steptrace__node .steptrace__nmark[data-state="visited"] [data-state-icon="visited"] {
  display: block;
}
.steptrace__node .steptrace__nmark[data-state="current"] {
  color: var(--_blue);
}
.steptrace__node .steptrace__nmark[data-state="frontier"] {
  color: var(--_amber);
}
.steptrace__node .steptrace__nmark[data-state="visited"] {
  color: var(--_green);
}
.steptrace__node[data-state="visited"] .steptrace__ncirc {
  fill: color-mix(in srgb, var(--_green) 20%, transparent);
  stroke: var(--_green);
}
.steptrace__node[data-state="frontier"] .steptrace__ncirc {
  fill: color-mix(in srgb, var(--_amber) 18%, transparent);
  stroke: var(--_amber);
  stroke-dasharray: 3 2;
}
.steptrace__node[data-state="current"] .steptrace__ncirc {
  fill: color-mix(in srgb, var(--_blue) 22%, transparent);
  stroke: var(--_blue);
}
.steptrace__aside {
  flex: 0 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 130px;
}
.steptrace__legend {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.2rem 1.1rem;
  margin-top: 0.1rem;
}
.steptrace__legend-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font: 500 11.5px var(--_font-head);
  color: var(--_muted);
}
.steptrace__swatch {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
  border: 1.5px solid;
}
.steptrace__swatch--current {
  background: color-mix(in srgb, var(--_blue) 22%, transparent);
  border-color: var(--_blue);
  border-radius: 2px;
}
.steptrace__swatch--frontier {
  background: color-mix(in srgb, var(--_amber) 18%, transparent);
  border-color: var(--_amber);
  border-style: dashed;
  transform: rotate(45deg) scale(0.86);
}
.steptrace__swatch--visited {
  background: color-mix(in srgb, var(--_green) 20%, transparent);
  border-color: var(--_green);
}
.steptrace__swatch--visited svg {
  width: 7px;
  height: 7px;
  margin: -0.5px auto 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: var(--_green);
}

/* ---- shared: status + toolbar ---- */
.steptrace__status {
  min-height: 2.6em;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  background: var(--_surface);
  color: var(--_text);
  font-size: 13px;
}
.steptrace__status .steptrace__counts {
  color: var(--_muted);
  font-variant-numeric: tabular-nums;
}
.steptrace__key {
  color: var(--_blue);
  font-weight: 600;
}
.steptrace__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.5rem;
}
.steptrace__toolbar button,
.steptrace__toolbar select {
  font: inherit;
  font-size: 13px;
  color: var(--_text);
  background: var(--st-page, #fff);
  border: 1px solid var(--_border);
  border-radius: 7px;
  padding: 0.32rem 0.6rem;
  cursor: pointer;
  min-height: 34px;
  min-width: 34px;
}
.steptrace__toolbar button:hover,
.steptrace__toolbar select:hover {
  border-color: var(--_accent);
}
.steptrace__toolbar button.steptrace__play {
  background: var(--_accent);
  color: var(--_on-accent);
  border-color: var(--_accent);
  font-weight: 600;
}
.steptrace__toolbar :focus-visible {
  outline: 2px solid var(--_blue);
  outline-offset: 2px;
}
.steptrace__spacer {
  flex: 1 1 auto;
}
.steptrace__step {
  font: 600 12px/1 var(--_font-mono);
  color: var(--_muted);
  font-variant-numeric: tabular-nums;
}
.steptrace__speed {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 12px;
  color: var(--_muted);
}
.steptrace__speed input {
  accent-color: var(--_accent);
}
`

