  STYLE_PARTS.push(`/* ---- bits: the three lanes read as an equation (x / − 1 / & = result), with a
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

`)
