// DevBook shared card chrome — the single source of truth for how a card looks
// in BOTH the FolderNote card map (devbook-folder-map.jsx) and the Home topic
// dashboard (Home/index.md). Edit the tokens here and every card restyles at
// once, in Obsidian and (after a re-publish) on the Quartz site.
//
// Consume it with:
//   const { CARD_CSS } = await dc.require("Assets/components/devbook-card.jsx");
// then inject `<style>{CARD_CSS}</style>` once, put `db-card` on the card
// element, use the `db-card-*` inner classes, and set the accent per card/scope
// with style={{ "--card-accent": "R, G, B" }} (comma-separated channels).
//
// It owns: border, radius, background, accent gradient, hover/focus lift, the
// body padding (via --db-card-pad, overridable), icon, title, and summary
// typography — including the summary margin that stops Obsidian's reading view
// from injecting large gaps around the description. Layout (grid vs flex-wrap)
// and any extras (e.g. the home progress bar) stay in the consumer.

// Resolves to the accent triple, or a neutral grey when a consumer forgets to
// set --card-accent. Interpolated into rgb()/rgba() below.
const ACCENT = "var(--card-accent, 125, 125, 125)";

const CARD_CSS = `
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(${ACCENT}, 0.09) 0%,
    rgba(${ACCENT}, 0.04) 38%,
    rgba(${ACCENT}, 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(${ACCENT}, 0.55);
  background-color: color-mix(in srgb, rgb(${ACCENT}) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(${ACCENT});
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(${ACCENT});
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}
`;

// Collapse an injected CSS string to a single line: strip /* */ comments and
// squash all whitespace (including blank lines) to single spaces. CSS is
// whitespace-insensitive so Obsidian renders identically — but the Quartz
// publish path (Syncer freezes the datacore to raw HTML embedded in Markdown)
// treats a blank line inside the emitted <style> as the end of the HTML block,
// which dumps the rest of the CSS onto the page as text and drops the layout
// rules. Every consumer MUST wrap its <style> content in this before injecting.
const squashCss = (css) =>
  String(css).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();

return { CARD_CSS, squashCss };
