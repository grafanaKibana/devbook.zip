  STYLE_PARTS.push(`/* ---- union-find: nodes + arcs share the GRAPH styling (opaque backing, tinted
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

`)
