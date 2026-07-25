import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

// Article entrance on every client-side navigation. enableSPA means a page swap
// never reloads the document, so this is the only place the reveal can be
// re-triggered from — and it has to be re-triggered dozens of times per reading
// session, which is why the motion stays inside the pass-through budget.
//
// The resting state is the visible one. The animation plays forward off a class,
// so if this script never runs, or throws, the article is simply there — a
// failure mode of "no animation" rather than "blank page".

const css = `
@keyframes page-reveal-in {
  from { opacity: 0; transform: translateY(4px); }
}
article[data-reveal] {
  animation: page-reveal-in var(--dur-3) var(--ease-out) backwards;
}
@media (prefers-reduced-motion: reduce) {
  article[data-reveal] { animation: none; }
}
`

const script = `
(function () {
  if (window.__devbookPageReveal) return;

  function play() {
    var article = document.querySelector("article");
    if (!article) return;
    // micromorph patches the DOM in place rather than replacing it, so the
    // element survives navigation and a same-task remove/add would collapse to
    // a no-op from the second navigation onward. Reading offsetWidth between
    // the two forces the style flush that restarts the animation.
    article.removeAttribute("data-reveal");
    void article.offsetWidth;
    article.setAttribute("data-reveal", "");
  }

  document.addEventListener("nav", play);
  window.addCleanup && window.addCleanup(function () {
    document.removeEventListener("nav", play);
  });

  // spa.inline.ts dispatches its first nav at module scope, which this handler
  // is too late to hear, so the first paint needs its own call.
  play();

  window.__devbookPageReveal = { play: play };
})();
`

export const PageReveal: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.css = css
  Component.afterDOMLoaded = script
  return Component
}
