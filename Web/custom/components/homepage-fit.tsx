import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

// Homepage one-viewport fit controller. The dashboard is frozen HTML emitted by
// Quartz Syncer, so CSS can style its states but cannot know whether wrapped
// summaries, loaded fonts, zoom, the overall-progress panel, and the footer fit
// together. This client-only component measures the rendered result and applies
// the least-degraded dashboard-wide state that fits. It drives BOTH one-viewport
// ranges — tablet (768–1200px) and desktop (≥1201px, tall enough for the fill) —
// so neither ever clips a single card raggedly; below those ranges the page
// keeps its normal scrolling layout. It renders no markup and deliberately does
// not detect device or input type.

const script = `
(function () {
  if (window.__devbookHomepageFit) return;

  var fit = window.matchMedia(
    "(min-width: 768px) and (max-width: 1200px), (min-width: 1201px) and (min-height: 36rem)"
  );
  var states = ["full", "summary-hidden", "counter-hidden", "bar-hidden"];
  var frame = 0;
  var observed = null;
  var observedWidth = 0;
  var observedHeight = 0;

  function visible(element) {
    return element && element.getClientRects().length > 0;
  }

  function scrollFits(element) {
    return element.scrollHeight <= element.clientHeight + 1 &&
      element.scrollWidth <= element.clientWidth + 1;
  }

  function containedBy(parent, child) {
    if (!visible(child)) return true;
    var outer = parent.getBoundingClientRect();
    var inner = child.getBoundingClientRect();
    return inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1 &&
      inner.left >= outer.left - 1 && inner.right <= outer.right + 1;
  }

  function fits(quartzBody, dashboard) {
    var viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    var footer = quartzBody.querySelector(":scope > footer");
    var center = quartzBody.querySelector(":scope > .center");
    var grid = dashboard;
    if (!footer || !center || !grid) return false;

    var quartzRect = quartzBody.getBoundingClientRect();
    var footerRect = footer.getBoundingClientRect();
    if (quartzRect.bottom > viewportHeight + 1 || footerRect.bottom > viewportHeight + 1) return false;
    if (!scrollFits(quartzBody) || !scrollFits(center) || !scrollFits(grid)) return false;

    var cards = grid.querySelectorAll(".dc-topic-card");
    if (!cards.length) return false;

    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      var cardBody = card.querySelector(".db-card-body");
      if (!cardBody || !scrollFits(cardBody)) return false;

      var retained = card.querySelectorAll(
        ".dc-topic-title, .db-card-summary, .dc-topic-cap, .dc-topic-bar"
      );
      for (var j = 0; j < retained.length; j += 1) {
        if (!containedBy(cardBody, retained[j])) return false;
      }
    }

    return document.documentElement.scrollHeight <= Math.ceil(viewportHeight) + 1;
  }

  function chooseState() {
    frame = 0;
    var body = document.body;
    var dashboard = body.querySelector('.dc-topic-grid');
    var quartzBody = body.querySelector('.page > #quartz-body');
    var isHome = body.dataset.slug === "index";

    if (!isHome || !fit.matches || !dashboard || !quartzBody) {
      body.removeAttribute("data-home-fit");
      body.removeAttribute("data-home-fit-overflow");
      observe(null);
      return;
    }

    observe(quartzBody);
    body.removeAttribute("data-home-fit-overflow");

    for (var i = 0; i < states.length; i += 1) {
      body.dataset.homeFit = states[i];
      // Force style and layout after each complete visibility state. Retained
      // elements are measured whole; none are shortened to make a state pass.
      void quartzBody.offsetHeight;
      if (fits(quartzBody, dashboard)) return;
    }

    // If no complete state fits, the one-viewport contract is impossible at
    // this height. Restore the existing scrolling tablet layout rather than
    // leaving retained content inside the fit mode's clipped 100dvh frame.
    body.removeAttribute("data-home-fit");
    body.dataset.homeFitOverflow = "true";
    observe(null);
  }

  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(chooseState);
  }

  var resizeObserver = new ResizeObserver(function (entries) {
    if (!entries.length) return;
    var rect = entries[0].contentRect;
    if (Math.abs(rect.width - observedWidth) < 0.5 &&
        Math.abs(rect.height - observedHeight) < 0.5) return;
    observedWidth = rect.width;
    observedHeight = rect.height;
    schedule();
  });

  function observe(element) {
    if (observed === element) return;
    resizeObserver.disconnect();
    observed = element;
    if (!element) return;
    observedWidth = element.clientWidth;
    observedHeight = element.clientHeight;
    resizeObserver.observe(element);
  }

  document.addEventListener("nav", schedule);
  document.addEventListener("render", schedule);
  window.addEventListener("resize", schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedule, { passive: true });
  }
  if (document.fonts) {
    document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
  }

  window.__devbookHomepageFit = { refresh: schedule };
  schedule();
})();
`

export const HomepageFit: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.afterDOMLoaded = script
  return Component
}
