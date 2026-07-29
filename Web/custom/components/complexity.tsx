import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

const hydrate = `
(function () {
  if (window.__devbookComplexity) return;
  window.__devbookComplexity = true;

  function mount(figure) {
    if (figure.dataset.complexityMounted) return { destroy: function () {} };
    figure.dataset.complexityMounted = "true";

    var tabs = Array.from(figure.querySelectorAll(".complexity__tab"));
    var legendButtons = Array.from(figure.querySelectorAll(".complexity__legend-button"));
    var paths = Array.from(figure.querySelectorAll(".complexity__curve"));
    var areas = Array.from(figure.querySelectorAll(".complexity__area"));
    var labels = Array.from(figure.querySelectorAll(".complexity__endpoint-label"));
    var panel = figure.querySelector(".complexity__panel");
    var listeners = [];
    var activeFilter = "all";
    var selectedPathId = null;

    function listen(target, type, listener) {
      target.addEventListener(type, listener);
      listeners.push([target, type, listener]);
    }

    function update() {
      var activeIds = new Set(paths.filter(function (path) {
        return path.dataset.context !== "true" &&
          (activeFilter === "all" || path.dataset.category === activeFilter);
      }).map(function (path) { return path.dataset.pathId || ""; }));
      if (selectedPathId) {
        activeIds.clear();
        activeIds.add(selectedPathId);
      }

      paths.forEach(function (path) {
        var active = activeIds.has(path.dataset.pathId || "");
        path.classList.toggle("is-highlighted", active);
        path.classList.toggle("is-subtle", !active);
      });
      areas.forEach(function (area) {
        area.classList.toggle("is-subtle", !activeIds.has(area.dataset.pathId || ""));
      });
      legendButtons.forEach(function (button) {
        var pathId = button.dataset.pathId || "";
        button.classList.toggle("is-selected", selectedPathId === pathId);
        button.classList.toggle("is-subtle", !activeIds.has(pathId));
        button.setAttribute("aria-pressed", selectedPathId === pathId ? "true" : "false");
      });
      labels.forEach(function (label) {
        var ids = (label.dataset.pathIds || "").split(",");
        var activePath = paths.find(function (path) {
          var pathId = path.dataset.pathId || "";
          return ids.includes(pathId) && activeIds.has(pathId);
        });
        label.classList.toggle("is-active", Boolean(activePath));
        label.classList.toggle("is-subtle", !activePath);
        if (activePath) {
          label.style.setProperty("--complexity-label-color", activePath.getAttribute("stroke") || "");
        }
      });
      tabs.forEach(function (tab) {
        var selected = tab.dataset.filter === activeFilter;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
        if (selected && tab.id && panel) panel.setAttribute("aria-labelledby", tab.id);
      });
      figure.dataset.activeFilter = activeFilter;
    }

    tabs.forEach(function (tab) {
      listen(tab, "click", function () {
        activeFilter = tab.dataset.filter || "all";
        selectedPathId = null;
        update();
      });
      listen(tab, "keydown", function (event) {
        var key = event.key;
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
        event.preventDefault();
        var enabled = tabs.filter(function (candidate) { return !candidate.disabled; });
        var current = enabled.indexOf(tab);
        var next = key === "Home"
          ? enabled[0]
          : key === "End"
            ? enabled[enabled.length - 1]
            : enabled[(current + (key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
        if (next) {
          next.focus();
          next.click();
        }
      });
    });
    legendButtons.forEach(function (button) {
      listen(button, "click", function () {
        var pathId = button.dataset.pathId || null;
        selectedPathId = selectedPathId === pathId ? null : pathId;
        if (selectedPathId) activeFilter = button.dataset.category || "all";
        update();
      });
    });

    update();
    return {
      destroy: function () {
        listeners.forEach(function (entry) {
          entry[0].removeEventListener(entry[1], entry[2]);
        });
        delete figure.dataset.complexityMounted;
      },
    };
  }

  function run() {
    document.querySelectorAll(".complexity:not([data-complexity-mounted])").forEach(function (figure) {
      var handle = mount(figure);
      if (window.addCleanup) window.addCleanup(function () { handle.destroy(); });
    });
  }

  document.addEventListener("nav", run);
  document.addEventListener("render", run);
  run();
})();
`

export const Complexity: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.afterDOMLoaded = hydrate
  return Component
}
