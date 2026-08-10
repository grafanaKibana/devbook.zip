import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { canonicalUrl } from "../seo"

const source = readFileSync(new URL("./page-share.tsx", import.meta.url), "utf8")

test("PageShare keeps canonical URLs, page gates, and SPA timer cleanup", () => {
  assert.equal(canonicalUrl("programming/index"), "https://devbook.zip/programming/")
  assert.match(source, /filePath\?\.endsWith\("\.md"\)/)
  assert.match(source, /fileData\.slug === "index" \|\| fileData\.slug === "404"/)
  assert.match(source, /fileData\.slug === "tags" \|\| fileData\.slug\?\.startsWith\("tags\/"\)/)
  assert.match(source, /x\.com\/intent\/post\?url=/)
  assert.match(source, /linkedin\.com\/sharing\/share-offsite\/\?url=/)
  assert.match(source, /reddit\.com\/submit\?url=/)
  assert.match(source, /document\.addEventListener\("nav", setup\)/)
  assert.match(source, /clearTimeout\(resetTimer\)/)
})
