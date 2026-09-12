import { visitParents } from "unist-util-visit-parents"
import type { Root as HastRoot, Element } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Adapted from quartz-clickable-images-zoom-plugin (MIT © 2025 Daniel Vazome)
// https://github.com/vazome/quartz-clickable-images-zoom-plugin
//
// Makes content images click-to-zoom into a centered overlay. Two deliberate
// departures from upstream, each fixing a real defect:
//
//   1. No DOM wrapper. Upstream boxes every <img> in a <div.lightbox-wrapper>,
//      which is invalid inside a <p> (the parser splits the paragraph) and
//      breaks the `p > img + em` caption rule. We instead give the <img> button
//      semantics (role/tabindex/aria-label) and hydrate with delegated click +
//      keyboard listeners, so captions and valid markup survive while the zoom
//      stays reachable by pointer and keyboard alike.
//   2. Scoped visitor. Images nested in an <a> are skipped so the link keeps
//      navigating — upstream's blanket preventDefault silently swallowed it.
//      Site chrome (favicons, Explorer/header icons) is never in scope because
//      this htmlPlugin runs on the per-note content hast, before layout.
//
// Registered via push() in quartz.ts so it runs after LinkProcessing and `src`
// is the final resolved URL. Theme-token CSS + SPA-safe JS ride externalResources.

const LIGHTBOX_CLASS = "lightbox-image"
const THEME_AWARE_ATTRIBUTE = "data-theme-aware"
const THEME_AWARE_CARRIER = /^(?:(\d+)\|)?theme-aware$/
const RASTER_EXTENSIONS = [".jxl", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"]

const classList = (node: Element): string[] => {
  const c = node.properties?.className
  if (c == null) return []
  const names = Array.isArray(c) ? c.map(String) : String(c).split(/\s+/)
  return names.filter(Boolean)
}

function targetExtension(target: unknown): string | undefined {
  if (typeof target !== "string") return
  const cleanTarget = target.split(/[?#]/, 1)[0].toLowerCase()
  return [...RASTER_EXTENSIONS, ".svg"].find((extension) => cleanTarget.endsWith(extension))
}

function imageLabel(target: unknown): string {
  if (typeof target !== "string") return "Diagram"
  const filename = target.split(/[?#]/, 1)[0].split("/").pop() ?? ""
  return (
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/-\d{8}(?:-\d+)?$/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Diagram"
  )
}

function normalizeThemeAware(el: Element): void {
  const properties = el.properties ?? (el.properties = {})
  const isRaster =
    el.tagName === "img" && RASTER_EXTENSIONS.includes(targetExtension(properties.src) ?? "")
  const isSvg =
    el.tagName === "object" &&
    properties.type === "image/svg+xml" &&
    targetExtension(properties.data) === ".svg"
  if (!isRaster && !isSvg) return

  const carrier = isRaster ? properties.alt : properties.ariaLabel
  if (typeof carrier !== "string") return
  const match = THEME_AWARE_CARRIER.exec(carrier)
  if (!match) return

  properties[THEME_AWARE_ATTRIBUTE] = "true"
  if (match[1]) properties.width = Number(match[1])
  const label = imageLabel(isRaster ? properties.src : properties.data)
  if (isRaster) properties.alt = label
  else properties.ariaLabel = label
}

const css = `
:root[saved-theme="dark"] :is(img[data-theme-aware="true"], object[data-theme-aware="true"]) {
  background: transparent;
  box-shadow: none;
  filter: hue-rotate(180deg) invert(1);
}

.lightbox-image {
  cursor: zoom-in;
  /* Share the DevBook card hover treatment for normal images. Dark
     theme-aware images suppress the shadow above because their filter would
     invert it into a glow. */
  transition:
    box-shadow var(--dur-2) var(--ease-out),
    transform var(--dur-2) var(--ease-out);
}
.lightbox-image:hover,
.lightbox-image:focus-visible {
  transform: translateY(-0.125rem);
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
}
.lightbox-image:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 3px;
}

.lightbox-modal {
  --lightbox-scrim: color-mix(in srgb, var(--dark) 88%, transparent);
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
  background: var(--lightbox-scrim);
  opacity: 0;
  visibility: hidden;
  /* Flip visibility immediately on open (so the close button is focusable the
     same tick .active lands) but hold it until the opacity fade finishes on
     close. */
  transition:
    opacity var(--dur-3) var(--ease-out),
    visibility 0s linear var(--dur-3);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
:root[saved-theme="dark"] .lightbox-modal {
  --lightbox-scrim: color-mix(in srgb, var(--light) 92%, transparent);
}
.lightbox-modal.active {
  opacity: 1;
  visibility: visible;
  transition:
    opacity var(--dur-3) var(--ease-out),
    visibility 0s linear 0s;
}
.lightbox-modal img {
  max-width: min(92vw, 1600px);
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--surface-radius, 8px);
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--dark);
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 50%;
  transition:
    color var(--dur-2) var(--ease-out),
    border-color var(--dur-2) var(--ease-out);
}
.lightbox-close:hover {
  color: var(--secondary);
  border-color: var(--secondary);
}

body.lightbox-open {
  overflow: hidden;
}

@media (max-width: 768px) {
  .lightbox-modal {
    padding: 1rem;
  }
  .lightbox-modal img {
    max-width: 96vw;
    max-height: 88vh;
  }
  .lightbox-close {
    top: 0.5rem;
    right: 0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lightbox-image,
  .lightbox-modal {
    transition: none;
  }
  .lightbox-image:hover,
  .lightbox-image:focus-visible {
    transform: none;
  }
}
`

// Quartz emits this afterDOMReady script as a data-persist external file, so it
// runs once per session and the document-level listeners below live for the
// document's lifetime (never rebound on SPA nav); the window guard is a cheap
// safeguard against a second execution. The modal is re-ensured lazily because
// micromorph wipes body children — the appended modal included — on each nav.
const script = `
(function () {
  if (window.__devbookLightbox) return;
  window.__devbookLightbox = true;

  var modal = null, modalImg = null, modalClose = null, lastFocus = null;

  function ensureModal() {
    if (modal && modal.isConnected) return;
    modal = document.createElement("div");
    modal.className = "lightbox-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    modalClose = document.createElement("button");
    modalClose.type = "button";
    modalClose.className = "lightbox-close";
    modalClose.innerHTML = "&times;";
    modalClose.setAttribute("aria-label", "Close image");

    modalImg = document.createElement("img");
    modalImg.alt = "";

    modal.appendChild(modalClose);
    modal.appendChild(modalImg);
    document.body.appendChild(modal);

    modalClose.addEventListener("click", close);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });
  }

  function open(img) {
    ensureModal();
    lastFocus = img;
    modalImg.src = img.currentSrc || img.src;
    modalImg.alt = img.alt || "";
    if (img.getAttribute("data-theme-aware") === "true") {
      modalImg.setAttribute("data-theme-aware", "true");
    } else {
      modalImg.removeAttribute("data-theme-aware");
    }
    // Commit the from-state before adding .active so the enter transition runs
    // even on a modal appended this same frame.
    void modal.offsetWidth;
    modal.classList.add("active");
    document.body.classList.add("lightbox-open");
    modalClose.focus();
  }

  function close() {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("lightbox-open");
    // Return focus to the image that opened the overlay (keyboard round-trip).
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var img = t && t.closest ? t.closest(".lightbox-image") : null;
    if (img) open(img);
  });

  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && modal && modal.classList.contains("active")) {
      close();
      return;
    }
    // Activate a focused zoomable image with Enter or Space (the img carries
    // role=button + tabindex=0). preventDefault stops Space from scrolling.
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      var t = e.target;
      var img = t && t.closest ? t.closest(".lightbox-image") : null;
      if (img) {
        e.preventDefault();
        open(img);
      }
    }
  });
})();
`

export const ClickableImages: QuartzTransformerPlugin = () => ({
  name: "ClickableImages",
  htmlPlugins() {
    return [
      () => (tree: HastRoot) => {
        visitParents(tree, "element", (node, ancestors) => {
          const el = node as Element
          normalizeThemeAware(el)
          if (el.tagName === "object") return
          if (el.tagName !== "img") return
          const src = el.properties?.src
          if (typeof src !== "string" || src.length === 0) return
          if (ancestors.some((a) => (a as Element).tagName === "a")) return

          const classes = classList(el)
          if (classes.includes(LIGHTBOX_CLASS)) return
          el.properties!.className = [...classes, LIGHTBOX_CLASS]
          if (el.properties!.loading == null) el.properties!.loading = "lazy"
          // Button semantics so the zoom is focusable, activatable, and announced
          // to keyboard and screen-reader users (a bare <img> is none of these).
          el.properties!.tabIndex = 0
          el.properties!.role = "button"
          const alt = typeof el.properties!.alt === "string" ? el.properties!.alt.trim() : ""
          el.properties!.ariaLabel = alt ? `Zoom image: ${alt}` : "Zoom image"
        })
      },
    ]
  },
  externalResources() {
    return {
      css: [{ inline: true, content: css }],
      js: [{ loadTime: "afterDOMReady", contentType: "inline", script }],
    }
  },
})
