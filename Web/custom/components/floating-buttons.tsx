import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"
import { lucideInner } from "../lib/lucide-icons"
import styles from "./styles/floating-buttons.scss"

// Floating scroll-to-top / scroll-to-bottom buttons (issue #129). Adapted
// starting point from fanteastick/quartz-test (origin CatCodeMe).
//
// SSR renders the two-button cluster with `hidden` set — that is the no-JS gate
// (SCSS `.floating-buttons[hidden]{display:none}`), so readers without JS see
// nothing. At runtime the afterDOMLoaded script removes `hidden`, measures the
// page, and drives visibility/extreme-state entirely through data-* attributes.
// The chevrons are inlined at build time from lucide-static; lucideInner returns
// only the inner shapes, so the stroke/fill attributes live on the <svg> wrapper
// (mirroring questions-index.tsx / explorer-icons.tsx) or the icons render blank.

const chevronUp = lucideInner("chevron-up") ?? ""
const chevronDown = lucideInner("chevron-down") ?? ""

const script = `
(function () {
  if (window.__devbookFloatingButtons) return;
  window.__devbookFloatingButtons = true;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var scrollTicking = false;
  var resizeTicking = false;

  function container() {
    return document.querySelector(".floating-buttons");
  }

  function update() {
    var el = container();
    if (!el) return;
    var docEl = document.documentElement;
    var scrollY = window.scrollY;
    var maxScroll = docEl.scrollHeight - docEl.clientHeight;
    var isScrollable = docEl.scrollHeight > docEl.clientHeight + 32;
    var revealThreshold = Math.min(400, window.innerHeight * 0.5);

    if (isScrollable && scrollY > revealThreshold) {
      el.setAttribute("data-visible", "true");
    } else {
      el.removeAttribute("data-visible");
    }

    var state = "mid";
    if (scrollY <= 4) state = "top";
    else if (scrollY >= maxScroll - 4) state = "bottom";

    // The reveal gate only shows the cluster once scrollY passes the threshold,
    // so the "top" extreme is effectively unreachable while visible; the top
    // button's disabled state is wired anyway for completeness.
    var top = el.querySelector('.floating-button[data-action="top"]');
    var bottom = el.querySelector('.floating-button[data-action="bottom"]');
    if (top) top.setAttribute("aria-disabled", state === "top" ? "true" : "false");
    if (bottom) bottom.setAttribute("aria-disabled", state === "bottom" ? "true" : "false");
  }

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () { scrollTicking = false; update(); });
  }

  // Resize can flip isScrollable / change the reveal threshold, so recompute —
  // rAF-throttled like onScroll (mirrors HomepageFit's resize handling).
  function onResize() {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(function () { resizeTicking = false; update(); });
  }

  // The cluster is anchored to the viewport corner (CSS), so layout() only has to
  // re-take ownership of the micromorph-reconciled node on nav: drop the SSR
  // no-JS hidden gate and recompute visibility.
  function layout() {
    var el = container();
    if (!el) return;
    el.removeAttribute("hidden");
    update();
  }

  // Bound ONCE, never via addCleanup (Quartz clears cleanups on every SPA nav,
  // which would tear the feature down). "nav" — not "render", never dispatched
  // here — re-asserts ownership of the micromorph-reconciled node each page.
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("nav", layout);

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var btn = target.closest(".floating-button[data-action]");
    if (!btn) return;
    // aria-disabled early-return blocks keyboard Enter/Space too — pointer-events
    // alone only stops mouse clicks on the dimmed extreme-state button.
    if (btn.getAttribute("aria-disabled") === "true") return;
    var action = btn.getAttribute("data-action");
    window.scrollTo({
      top: action === "top" ? 0 : document.documentElement.scrollHeight,
      behavior: reduceMotion.matches ? "auto" : "smooth"
    });
  });

  layout();
})();
`

export const FloatingButtons: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => (
    <div class="floating-buttons" hidden>
      <button
        class="floating-button"
        data-action="top"
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        <svg
          class="floating-button-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: chevronUp }}
        />
      </button>
      <button
        class="floating-button"
        data-action="bottom"
        aria-label="Scroll to bottom"
        title="Scroll to bottom"
      >
        <svg
          class="floating-button-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: chevronDown }}
        />
      </button>
    </div>
  )

  Component.afterDOMLoaded = script
  Component.css = styles
  return Component
}
