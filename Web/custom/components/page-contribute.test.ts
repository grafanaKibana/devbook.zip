import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("./page-contribute.tsx", import.meta.url), "utf8")
const footerSource = readFileSync(new URL("./site-footer.tsx", import.meta.url), "utf8")
const footerStyles = readFileSync(new URL("./styles/site-footer.scss", import.meta.url), "utf8")
const customStyles = readFileSync(
  new URL("../../quartz/styles/custom.scss", import.meta.url),
  "utf8",
)
const quartzSource = readFileSync(new URL("../../quartz.ts", import.meta.url), "utf8")

test("share links live inside the configured footer, opposite its existing links", () => {
  assert.doesNotMatch(source, /Share:|x\.com|linkedin\.com|reddit\.com|site-footer/)
  assert.doesNotMatch(footerSource, /<button|>Copy<|>LinkedIn<|>Reddit</)

  const labels = [
    ">Share:<",
    'aria-label="Copy link"',
    'aria-label="Share on X"',
    'aria-label="Share on LinkedIn"',
    'aria-label="Share on Reddit"',
  ]
  let previous = -1
  for (const label of labels) {
    const next = footerSource.indexOf(label)
    assert.ok(next > previous, `${label} should follow the previous link`)
    previous = next
  }

  assert.match(footerSource, /cloneElement\([\s\S]*rendered\.props\.children/)
  assert.match(footerSource, /x\.com\/intent\/post\?url=/)
  assert.match(footerSource, /linkedin\.com\/sharing\/share-offsite\/\?url=/)
  assert.match(footerSource, /reddit\.com\/submit\?url=/)
  assert.match(footerStyles, /grid-template-columns: minmax\(0, 1fr\) auto/)
  assert.match(footerStyles, /align-items: center/)
  assert.match(footerStyles, /margin-bottom: 2rem/)
  assert.match(footerStyles, /> ul,[\s\S]*> \.site-footer-share[\s\S]*grid-row: 2/)
  assert.match(customStyles, /footer > ul \{[\s\S]*justify-content: flex-start/)
  assert.match(customStyles, /footer > ul \{[\s\S]*font-size: 0\.9rem/)
  assert.match(customStyles, /footer > ul \{[\s\S]*font-weight: #\{\$normalWeight\}/)
  assert.match(customStyles, /footer > ul \{[\s\S]*line-height: normal/)
  assert.match(customStyles, /footer > ul a \{[\s\S]*padding: 0\.25rem/)
  assert.match(customStyles, /footer > ul a \{[\s\S]*font-weight: inherit/)
  assert.match(customStyles, /footer > ul a \{[\s\S]*line-height: normal/)
  assert.match(customStyles, /background-color: currentColor/)
  assert.match(quartzSource, /SiteFooter\(\{ footer: layout\.defaults\.footer \}\)/)
  assert.match(source, /\n            Edit\n/)
  assert.match(source, /\n          Report\n/)
})

test("utility pages do not render the row", () => {
  assert.match(source, /fileData\.slug === "index"/)
  assert.match(source, /fileData\.slug === "404"/)
  assert.match(source, /fileData\.slug\?\.startsWith\("tags\/"\)/)
  assert.match(footerSource, /slug !== "index"/)
  assert.match(footerSource, /slug !== "404"/)
  assert.match(footerSource, /!slug\?\.startsWith\("tags\/"\)/)
})
