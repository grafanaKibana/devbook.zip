import assert from "node:assert/strict"
import test from "node:test"

import { rootAssetData } from "./syncer-fixups"

test("Syncer SVG assets resolve from the published asset root", () => {
  assert.equal(
    rootAssetData("assets/computer-science/quadtree.svg"),
    "/assets/computer-science/quadtree.svg",
  )
  assert.equal(
    rootAssetData("/assets/computer-science/quadtree.svg"),
    "/assets/computer-science/quadtree.svg",
  )
  assert.equal(
    rootAssetData("https://example.com/quadtree.svg"),
    "https://example.com/quadtree.svg",
  )
})
