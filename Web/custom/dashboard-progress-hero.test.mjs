import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const dashboard = readFileSync(new URL("../../Vault/Home/index.md", import.meta.url), "utf8")
const fit = readFileSync(new URL("./components/homepage-fit.tsx", import.meta.url), "utf8")

test("dashboard progress hero stays above the cards and inside fit measurement", () => {
  const hero = dashboard.indexOf('class="db-card dc-progress-hero"')
  const grid = dashboard.indexOf('class="dc-topic-grid"')

  assert.ok(hero > 0 && hero < grid)
  assert.match(
    dashboard,
    /<span class="dc-progress-value"><strong>\{oPct\}%<\/strong><span>Progress<\/span><\/span>/,
  )
  assert.match(dashboard, /class="dc-topic-bar dc-progress-bar"/)
  assert.doesNotMatch(dashboard, /dc-topic-total/)
  assert.match(fit, /querySelector\("\.dc-topic-dashboard"\)/)
  assert.match(fit, /dashboard\.querySelector\("\.dc-topic-grid"\)/)
})
