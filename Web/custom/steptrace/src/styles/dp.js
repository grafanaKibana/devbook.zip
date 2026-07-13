  STYLE_PARTS.push(`/* ---- dp / LCS: a 2-D grid in the pointer-strip idiom (framed + rounded, with
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

`)
