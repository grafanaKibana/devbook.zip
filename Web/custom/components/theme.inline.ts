const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
type ThemeMode = "auto" | "light" | "dark"

function themeMode(value: string | null): ThemeMode {
  return value === "light" || value === "dark" ? value : "auto"
}

let mode: ThemeMode = "auto"
try {
  mode = themeMode(localStorage.getItem("theme"))
} catch {
  // The picker also works for this visit when storage is unavailable.
}

function applyTheme() {
  const root = document.documentElement
  const theme = mode === "auto" ? (systemTheme.matches ? "dark" : "light") : mode
  const changed = root.getAttribute("saved-theme") !== theme
  root.dataset.themeMode = mode
  root.setAttribute("saved-theme", theme)
  root.style.colorScheme = theme
  document.body?.classList.toggle("theme-dark", theme === "dark")
  document.body?.classList.toggle("theme-light", theme === "light")

  const picker = document.querySelector<HTMLSelectElement>(".site-theme-select")
  if (picker) {
    picker.value = mode
    picker.title = "Theme: " + picker.selectedOptions[0].text
  }
  if (changed) document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }))
}

// The head prescript runs before paint and persists for the document lifetime.
// Each SPA navigation replaces the body and picker, then dispatches nav.
applyTheme()
document.addEventListener("nav", applyTheme)
document.addEventListener("render", applyTheme)
systemTheme.addEventListener("change", () => {
  if (mode === "auto") applyTheme()
})
// Native selects can match :focus-visible after a mouse or touch selection.
document.addEventListener("pointerdown", (event) => {
  const picker = event.target
  if (picker instanceof HTMLSelectElement && picker.matches(".site-theme-select")) {
    picker.setAttribute("data-pointer-focus", "")
  }
})
document.addEventListener(
  "keydown",
  () => {
    document
      .querySelector(".site-theme-select[data-pointer-focus]")
      ?.removeAttribute("data-pointer-focus")
  },
  true,
)
document.addEventListener("change", (event) => {
  const picker = event.target
  if (!(picker instanceof HTMLSelectElement) || !picker.matches(".site-theme-select")) return
  mode = themeMode(picker.value)
  try {
    if (mode === "auto") localStorage.removeItem("theme")
    else localStorage.setItem("theme", mode)
  } catch {
    // Keep the explicit selection in memory when storage is unavailable.
  }
  applyTheme()
})
window.addEventListener("storage", (event) => {
  if (event.storageArea !== localStorage || (event.key !== "theme" && event.key !== null)) return
  mode = themeMode(event.newValue)
  applyTheme()
})

export {}
