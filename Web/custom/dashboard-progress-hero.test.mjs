import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const dashboard = readFileSync(new URL("../../Vault/Home/index.md", import.meta.url), "utf8")
const fit = readFileSync(new URL("./components/homepage-fit.tsx", import.meta.url), "utf8")
const styles = readFileSync(new URL("../quartz/styles/custom.scss", import.meta.url), "utf8")

test("dashboard progress hero stays above the cards and inside fit measurement", () => {
  const hero = dashboard.indexOf('class="db-card dc-progress-hero"')
  const grid = dashboard.indexOf('class="dc-topic-grid"')

  assert.ok(hero > 0 && hero < grid)
  assert.match(
    dashboard,
    /<span class="dc-progress-value"><strong>\{oPct\}%<\/strong><span>Progress<\/span><\/span>/,
  )
  assert.match(
    dashboard,
    /<span class="dc-progress-mobile-value" aria-hidden="true">\{oPct\}%<\/span>/,
  )
  assert.match(dashboard, /\.dc-progress-value \{ display: none; \}/)
  assert.match(dashboard, /\.dc-progress-mobile-value \{ display: none; \}/)
  assert.match(
    dashboard,
    /\.dc-progress-title, \.dc-progress-mobile-value \{[^}]*font-weight: 700;/,
  )
  assert.match(
    dashboard,
    /<p class="dc-progress-title" id="dc-progress-title" role="heading" aria-level="2">/,
  )
  assert.doesNotMatch(dashboard, /<h2 class="dc-progress-title"/)
  assert.match(dashboard, /class="dc-topic-bar dc-progress-bar"/)
  assert.doesNotMatch(dashboard, /dc-topic-total/)
  assert.match(fit, /querySelector\("\.dc-topic-dashboard"\)/)
  assert.match(fit, /dashboard\.querySelector\("\.dc-topic-grid"\)/)
  assert.match(fit, /min-height: 32rem/)
  assert.match(styles, /min-height: 32rem\) and \(max-height: 35\.999rem/)
  assert.match(styles, /--dc-radial-size: 5\.5rem/)
  assert.match(styles, /\.dc-progress-statuses \{\s+display: none;/)
})
