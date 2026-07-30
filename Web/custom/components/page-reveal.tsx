import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

// Article entrance on every client-side navigation. enableSPA means a page swap
// never reloads the document, so this is the only place the reveal can be
// re-triggered from — and it has to be re-triggered dozens of times per reading
// session, which is why the motion stays inside the pass-through budget.
//
// A hard-load marker keeps fallback fonts off-screen until the local fonts and
// first layout settle. SPA navigations never re-arm it; they only replay the
// shorter pass-through animation.

const css = `
@keyframes page-reveal-in {
  from { opacity: 0; transform: translateY(4px); }
}
@keyframes page-reveal-first-in {
  from { opacity: 0; transform: translateY(8px); }
}
@keyframes page-reveal-sidebar-in {
  from { opacity: 0; transform: translateY(4px); }
}
@keyframes page-reveal-footer-in {
  from { opacity: 0; transform: translateY(4px); }
}
@keyframes page-reveal-fade-in {
  from { opacity: 0; }
}
:root[data-page-reveal-first-paint="pending"] article,
:root[data-page-reveal-first-paint="pending"] .center > hr,
:root[data-page-reveal-first-paint="pending"] .page > #quartz-body > footer {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}
:root[data-page-reveal-first-paint="pending"] body[data-slug="index"] .dc-topic-grid .db-card,
:root[data-page-reveal-first-paint="pending"] body[data-slug="index"] .dc-topic-bar-track span {
  animation-play-state: paused !important;
}
article[data-reveal] {
  animation: page-reveal-in var(--dur-3) var(--ease-out) backwards;
}
article[data-reveal="initial"] {
  animation: page-reveal-first-in var(--dur-4) var(--ease-out) backwards;
}
body[data-slug="index"]:has(article[data-reveal="initial"]) .center > hr,
body[data-slug="index"]:has(article[data-reveal="initial"]) .page > #quartz-body > footer {
  animation: page-reveal-footer-in var(--dur-3) var(--ease-out)
    calc(var(--dur-3) + var(--stagger) * 6) backwards;
}
@media (min-width: 1201px) {
  :root:not([reader-mode="on"])[data-page-reveal-first-paint="pending"]
    .page > #quartz-body > .center > .page-header,
  :root:not([reader-mode="on"])[data-page-reveal-first-paint="pending"]
    .page > #quartz-body > .sidebar.left,
  :root:not([reader-mode="on"])[data-page-reveal-first-paint="pending"]
    .page > #quartz-body > .sidebar.right {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }
  body:has(article[data-reveal="initial"]) .site-header > *,
  body:has(article[data-reveal="initial"]) .page-header > .popover-hint > *,
  body:has(article[data-reveal="initial"]) .page > #quartz-body > .sidebar.right > *,
  body:has(article[data-reveal="initial"]) .sidebar.left > .ns-scope,
  body:has(article[data-reveal="initial"]) .sidebar.left .explorer button.desktop-explorer,
  body:has(article[data-reveal="initial"]) .sidebar.left .explorer .explorer-ul > li {
    animation: page-reveal-sidebar-in var(--dur-3) var(--ease-out) backwards;
  }
  body:has(article[data-reveal="initial"])
    :is(.site-header, .page-header > .popover-hint) > * {
    animation-delay: calc(var(--stagger) * var(--page-reveal-order, 0));
  }
  body:has(article[data-reveal="initial"]) .page > #quartz-body > .sidebar.right > * {
    animation-delay: calc(var(--stagger) * var(--page-reveal-order, 0));
  }
  body:has(article[data-reveal="initial"])
    :is(.site-header, .page-header > .popover-hint, .sidebar.right) > :nth-child(2) {
    --page-reveal-order: 1;
  }
  body:has(article[data-reveal="initial"])
    :is(.site-header, .page-header > .popover-hint, .sidebar.right) > :nth-child(3) {
    --page-reveal-order: 2;
  }
  body:has(article[data-reveal="initial"])
    :is(.site-header, .page-header > .popover-hint, .sidebar.right) > :nth-child(4) {
    --page-reveal-order: 3;
  }
  body:has(article[data-reveal="initial"]) .page-header > .popover-hint > .site-marquee {
    animation-name: page-reveal-fade-in;
  }
  body:has(article[data-reveal="initial"]) .sidebar.left .explorer button.desktop-explorer {
    animation-delay: var(--stagger);
  }
  body:has(article[data-reveal="initial"]) .sidebar.left .explorer .explorer-ul > li {
    animation-delay: calc(var(--stagger) * var(--ns-reveal-order, 2));
  }
}
@media (prefers-reduced-motion: reduce) {
  article[data-reveal],
  body[data-slug="index"]:has(article[data-reveal="initial"]) .center > hr,
  body[data-slug="index"]:has(article[data-reveal="initial"]) .page > #quartz-body > footer,
  body:has(article[data-reveal="initial"]) .site-header > *,
  body:has(article[data-reveal="initial"]) .page-header > .popover-hint > *,
  body:has(article[data-reveal="initial"]) .page > #quartz-body > .sidebar.right > *,
  body:has(article[data-reveal="initial"]) .sidebar.left > .ns-scope,
  body:has(article[data-reveal="initial"]) .sidebar.left .explorer button.desktop-explorer,
  body:has(article[data-reveal="initial"]) .sidebar.left .explorer .explorer-ul > li {
    animation: none;
  }
}
`

const firstPaintScript = `
if (!window.__devbookPageReveal) {
  document.documentElement.setAttribute("data-page-reveal-first-paint", "pending");
}
`

const script = `
(function () {
  if (window.__devbookPageReveal) return;

  var initialScheduled = false;

  function play() {
    restart("");
  }

  function playInitial() {
    restart("initial");
  }

  function restart(kind) {
    var article = document.querySelector("article");
    if (!article) return;
    // micromorph patches the DOM in place rather than replacing it, so the
    // element survives navigation and a same-task remove/add would collapse to
    // a no-op from the second navigation onward. Reading offsetWidth between
    // the two forces the style flush that restarts the animation.
    article.removeAttribute("data-reveal");
    void article.offsetWidth;
    article.setAttribute("data-reveal", kind);
  }

  function initial() {
    if (initialScheduled) return;
    initialScheduled = true;
    var fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    var explorerGate = window.__devbookExplorerFirstPaint;
    var explorerReady = explorerGate ? explorerGate.ready : Promise.resolve();
    var reveal = function () {
      playInitial();
      document.documentElement.removeAttribute("data-page-reveal-first-paint");
    };
    var schedule = function () {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(reveal, { timeout: 1000 });
      } else {
        setTimeout(reveal, 0);
      }
    };
    Promise.all([fontsReady, explorerReady]).then(schedule, schedule);
  }

  document.addEventListener("nav", play);
  window.addCleanup && window.addCleanup(function () {
    document.removeEventListener("nav", play);
  });

  window.__devbookPageReveal = { initial: initial };

  // spa.inline.ts dispatches its first nav at module scope, which this handler
  // is too late to hear. The initial path waits for fonts and browser idle;
  // SPA navigation keeps using the immediate listener above. HomepageFit starts
  // the initial reveal after it has chosen a complete dashboard state.
  if (!document.body || document.body.dataset.slug !== "index") initial();
})();
`

export const PageReveal: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.css = css
  Component.beforeDOMLoaded = firstPaintScript
  Component.afterDOMLoaded = script
  return Component
}
