import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("./page-contribute.tsx", import.meta.url), "utf8")
const rowSource = readFileSync(new URL("./content-meta-row.tsx", import.meta.url), "utf8")

test("share links precede the shortened contribution links in one text-link row", () => {
  assert.doesNotMatch(source, /<button|Edit this page|Report \/ suggest/)

  const labels = [
    ">Copy<",
    "X\n",
    "LinkedIn\n",
    "Reddit\n",
    "\n            Edit\n",
    "\n          Report\n",
  ]
  let previous = -1
  for (const label of labels) {
    const next = source.indexOf(label)
    assert.ok(next > previous, `${label} should follow the previous link`)
    previous = next
  }

  assert.match(source, /href=\{publishedUrl\}/)
  assert.match(source, /x\.com\/intent\/post\?url=/)
  assert.match(source, /linkedin\.com\/sharing\/share-offsite\/\?url=/)
  assert.match(source, /reddit\.com\/submit\?url=/)
  assert.match(rowSource, /Row\.afterDOMLoaded = Contribute\.afterDOMLoaded/)
})

test("utility pages do not render the row", () => {
  assert.match(source, /fileData\.slug === "index"/)
  assert.match(source, /fileData\.slug === "404"/)
  assert.match(source, /fileData\.slug\?\.startsWith\("tags\/"\)/)
})
