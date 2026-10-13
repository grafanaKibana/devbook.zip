import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

// Keyboard bypass for the shell. Quartz frames render only divs, so the content
// column gets its main landmark here. The link is rendered at build time because
// micromorph diffs body children by position: an element inserted by script
// would shift every sibling it precedes on each SPA navigation. quartz.ts slots
// it ahead of everything else focusable.
//
// The router ignores the link; the handler moves focus itself so the URL keeps
// no fragment, which would otherwise make Quartz's popstate handler re-navigate.
// The desktop sidebar is its own low stacking context, so the focused link sits
// just under the fixed header bar rather than over it.

const css = `
.skip-link {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.skip-link:focus {
  position: fixed;
  top: calc(var(--site-header-height, 3rem) + 0.5rem);
  left: 0.75rem;
  z-index: 1000;
  width: auto;
  height: auto;
  overflow: visible;
  clip-path: none;
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--lightgray);
  border-radius: var(--radius-m, 8px);
  background: var(--light);
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.12);
  color: var(--dark);
  font-family: var(--headerFont);
  font-size: 0.95rem;
  font-weight: 700;
  outline: 2px solid var(--secondary);
  outline-offset: 2px;
}
#main-content[tabindex="-1"]:focus {
  outline: none;
}
`

const script = `
(function () {
  if (window.__devbookSkipLink) return;
  window.__devbookSkipLink = true;

  // micromorph drops attributes the fresh page HTML lacks, so re-apply per nav.
  function mark() {
    var center = document.querySelector("#quartz-body > .center");
    if (!center) return;
    center.setAttribute("role", "main");
    // The page body follows the header: <article> on notes, a wrapper holding
    // the article and its listing on folder and tag pages.
    var target = center.querySelector(":scope > .page-header + *") || center;
    target.id = "main-content";
  }

  document.addEventListener("nav", mark);
  document.addEventListener("click", function (e) {
    var t = e.target;
    var link = t && t.closest ? t.closest(".skip-link") : null;
    var target = link ? document.getElementById("main-content") : null;
    if (!target) return;
    e.preventDefault();
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (target.getBoundingClientRect().top < 0) target.scrollIntoView({ block: "start" });
  });
})();
`

export const SkipLink: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => (
    <a class="skip-link" href="#main-content" data-router-ignore>
      Skip to content
    </a>
  )
  Component.css = css
  Component.afterDOMLoaded = script
  return Component
}
