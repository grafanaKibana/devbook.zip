import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

const EXPORTER_URL = "/static/excalidraw/exporter.js"

const firstPaint = `
document.documentElement.setAttribute("data-devbook-excalidraw-exporter", "1");
`

const loader = `
(function () {
  if (window.__devbookExcalidrawExportLoader) return;
  window.__devbookExcalidrawExportLoader = true;
  var promise = null;

  function pages() {
    return document.querySelectorAll(".excalidraw-page");
  }

  function hasScene() {
    return !!document.querySelector("script.excalidraw-data");
  }

  function theme(event) {
    if (event && event.detail && event.detail.theme) return event.detail.theme;
    return document.documentElement.getAttribute("saved-theme") === "dark" ? "dark" : "light";
  }

  function revealFallback() {
    pages().forEach(function (page) {
      page.setAttribute("data-devbook-excalidraw-export", "error");
    });
  }

  function load() {
    if (window.DevBookExcalidraw && window.DevBookExcalidraw.renderAll) {
      return Promise.resolve(window.DevBookExcalidraw);
    }
    if (promise) return promise;
    promise = new Promise(function (resolve, reject) {
      var script = document.querySelector('script[data-devbook-excalidraw-exporter-script="1"]');
      var created = false;
      if (!script) {
        script = document.createElement("script");
        script.src = ${JSON.stringify(EXPORTER_URL)};
        script.dataset.devbookExcalidrawExporterScript = "1";
        created = true;
      }
      script.addEventListener("load", function () {
        if (window.DevBookExcalidraw && window.DevBookExcalidraw.renderAll) {
          resolve(window.DevBookExcalidraw);
        } else {
          reject(new Error("exporter loaded without its public API"));
        }
      }, { once: true });
      script.addEventListener("error", function () {
        promise = null;
        reject(new Error("could not load ${EXPORTER_URL}"));
      }, { once: true });
      if (created) document.head.appendChild(script);
    });
    return promise;
  }

  function run(event) {
    if (!hasScene()) return;
    pages().forEach(function (page) {
      if (!page.hasAttribute("data-devbook-excalidraw-export")) {
        page.setAttribute("data-devbook-excalidraw-export", "loading");
      }
    });
    load().then(function (api) { return api.renderAll(theme(event)); }).catch(function (error) {
      revealFallback();
      console.warn("DevBook Excalidraw exporter unavailable; keeping the server-rendered SVG.", error);
    });
  }

  function invalidate() {
    if (window.DevBookExcalidraw && window.DevBookExcalidraw.invalidate) {
      window.DevBookExcalidraw.invalidate();
    }
  }

  document.addEventListener("prenav", invalidate);
  document.addEventListener("nav", run);
  document.addEventListener("render", run);
  document.addEventListener("themechange", run);
})();
`

export const ExcalidrawExport: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.beforeDOMLoaded = firstPaint
  Component.afterDOMLoaded = loader
  return Component
}
