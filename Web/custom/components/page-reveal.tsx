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
:root[data-page-reveal-first-paint="pending"] article,
:root[data-page-reveal-first-paint="pending"] .page > #quartz-body > footer {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}
article[data-reveal] {
  animation: page-reveal-in var(--dur-3) var(--ease-out) backwards;
}
article[data-reveal="initial"] {
  animation: page-reveal-first-in var(--dur-4) var(--ease-out) backwards;
}
@media (prefers-reduced-motion: reduce) {
  article[data-reveal] { animation: none; }
}
`

const firstPaintScript = `
document.documentElement.setAttribute("data-page-reveal-first-paint", "pending");
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
    var reveal = function () {
      document.documentElement.removeAttribute("data-page-reveal-first-paint");
      playInitial();
    };
    var schedule = function () {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(reveal, { timeout: 1000 });
      } else {
        setTimeout(reveal, 0);
      }
    };
    fontsReady.then(schedule, schedule);
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
