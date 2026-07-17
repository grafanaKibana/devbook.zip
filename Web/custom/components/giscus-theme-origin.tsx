import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

// Point the giscus theme at the origin actually serving the page.
//
// The comments plugin bakes a fixed themeUrl (quartz.config.yaml →
// https://devbook.zip/static/giscus) into the container's data-theme-url at build
// time. That 404s on any deployment that isn't production — branch/preview builds
// serve the theme from their own origin — so giscus silently falls back to its
// stock theme there. This rewrites data-theme-url to location.origin before the
// comments plugin reads it and, as an order-independent fallback, corrects the
// live iframe once giscus echoes a message. The theme stays site-hosted; it just
// loads from whichever origin is serving. (http origins still can't be applied
// inside the https giscus iframe — mixed content — so local dev shows stock.)

const script = `
(function () {
  var GISCUS = "https://giscus.app";
  function base() { return location.origin + "/static/giscus"; }
  function themeName(c) {
    var saved = document.documentElement.getAttribute("saved-theme");
    return saved === "dark"
      ? (c.getAttribute("data-dark-theme") || "dark")
      : (c.getAttribute("data-light-theme") || "light");
  }
  function pointAtOrigin() {
    var c = document.querySelector(".giscus");
    if (c) c.setAttribute("data-theme-url", base());
  }
  document.addEventListener("nav", pointAtOrigin);
  document.addEventListener("render", pointAtOrigin);
  pointAtOrigin();
  window.addEventListener("message", function (e) {
    if (e.origin !== GISCUS || !e.data || !e.data.giscus) return;
    var c = document.querySelector(".giscus");
    var frame = document.querySelector("iframe.giscus-frame");
    if (!c || !frame || !frame.contentWindow) return;
    var want = base() + "/" + themeName(c) + ".css";
    if (c.getAttribute("data-origin-theme") === want) return;
    c.setAttribute("data-origin-theme", want);
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme: want } } }, GISCUS);
  });
})();
`

export const GiscusThemeOrigin: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.afterDOMLoaded = script
  return Component
}
