import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

// Explorer toggle state for assistive tech.
//
// The community Explorer keeps its open state on the `.explorer` wrapper — the
// `collapsed` class and a wrapper `aria-expanded` its click handler toggles —
// but never on the controls: the desktop "Topics" button ships a static
// aria-expanded="true", the tablet/mobile hamburger has none, and the list
// carries a static aria-expanded="false". SPA navigation also patches the server
// markup's attributes back in on every page. Same override strategy as the other
// Explorer decorators: no fork, a script that mirrors the wrapper's real state
// onto both toggles whenever the plugin, a nav patch, or a breakpoint crossing
// changes it. Removing the hidden tree from the tab order is CSS (custom.scss,
// Explorer section).

const script = `
(function () {
  // Below this width the tree is a drawer that opens only on a real toggle
  // (custom.scss keys it off the wrapper's aria-expanded). Keep in sync with
  // PANEL_MEDIA in nav-scope-dropdown.tsx and the $tablet/$mobile blocks.
  var panel = window.matchMedia("(max-width: 1200px)");

  function isOpen(explorer) {
    if (explorer.classList.contains("collapsed")) return false;
    return !panel.matches || explorer.getAttribute("aria-expanded") === "true";
  }

  function sync() {
    document.querySelectorAll("div.explorer").forEach(function (explorer) {
      var content = explorer.querySelector(".explorer-content");
      var open = String(isOpen(explorer));
      if (content) content.removeAttribute("aria-expanded");
      explorer.querySelectorAll(".explorer-toggle").forEach(function (button) {
        if (content && content.id) button.setAttribute("aria-controls", content.id);
        if (button.getAttribute("aria-expanded") !== open) button.setAttribute("aria-expanded", open);
      });
    });
  }

  // Escape closes an open drawer through the plugin's own toggle, so its
  // collapsed class, wrapper state, and scroll lock stay in one owner. The
  // search overlay and the scope menu handle their own Escape and prevent it.
  function onKeydown(e) {
    if (e.key !== "Escape" || e.defaultPrevented || !panel.matches) return;
    if (document.querySelector(".search > .search-container.active")) return;
    var explorer = Array.prototype.find.call(document.querySelectorAll("div.explorer"), isOpen);
    if (!explorer) return;
    var toggle = Array.prototype.find.call(explorer.querySelectorAll(".explorer-toggle"), function (button) {
      return button.getClientRects().length > 0;
    });
    if (!toggle) return;
    e.preventDefault();
    toggle.click();
    toggle.focus();
  }

  function bind() {
    var obs = new MutationObserver(sync);
    document.querySelectorAll("div.explorer").forEach(function (explorer) {
      obs.observe(explorer, { attributes: true, attributeFilter: ["class", "aria-expanded"] });
    });
    sync();
    document.addEventListener("keydown", onKeydown);
    if (window.addCleanup) window.addCleanup(function () {
      obs.disconnect();
      document.removeEventListener("keydown", onKeydown);
    });
  }

  if (panel.addEventListener) panel.addEventListener("change", sync);
  else if (panel.addListener) panel.addListener(sync);
  document.addEventListener("nav", bind);
})();
`

export const ExplorerDisclosure: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.afterDOMLoaded = script
  return Component
}
