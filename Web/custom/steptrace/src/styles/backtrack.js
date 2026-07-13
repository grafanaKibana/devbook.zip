  STYLE_PARTS.push(`/* ---- backtrack: an n×n board (row = recursion depth) + a path strip ---- */
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

`)
