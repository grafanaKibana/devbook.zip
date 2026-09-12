import assert from "node:assert/strict"
import test from "node:test"

import { rootAssetData } from "./syncer-fixups"

test("rootAssetData normalizes local assets and preserves external URLs", () => {
  assert.equal(rootAssetData("assets/fixture.svg"), "/assets/fixture.svg")
  assert.equal(rootAssetData("/assets/fixture.svg"), "/assets/fixture.svg")
  assert.equal(rootAssetData("https://example.com/fixture.svg"), "https://example.com/fixture.svg")
})
