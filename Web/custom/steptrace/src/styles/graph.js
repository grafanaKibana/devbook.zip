  STYLE_PARTS.push(`/* ---- graph: svg ---- */
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

`)
