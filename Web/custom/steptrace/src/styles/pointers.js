  STYLE_PARTS.push(`/* ---- array pointers: segmented strip + tinted window + [ ] brackets ---- */
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

`)
