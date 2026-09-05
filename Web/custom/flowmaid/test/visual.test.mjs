import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "../../../..")
const oracle = path.join(root, "Web/custom/flowmaid/test/fixtures/phase0")
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex")

test("Phase 0 SVG oracle is complete and preserves native topology across themes", () => {
  for (const name of ["minimal", "kafka", "edge-identity"]) {
    const variants = ["obsidian/light", "obsidian/dark", "quartz/light", "quartz/dark"].map(
      (variant) => {
        const [host, theme] = variant.split("/")
        const file = path.join(oracle, host, `${name}-${theme}.svg`)
        assert.equal(existsSync(file), true, file)
        return [
          ...readFileSync(file, "utf8").matchAll(
            /<path\b[^>]*class="[^"]*flowchart-link[^"]*"[^>]*>/gu,
          ),
        ].map((match) => match[0].replace(/\s+/gu, " "))
      },
    )
    assert.ok(variants[0].length > 0, name)
    assert.deepEqual(variants[1], variants[0], `${name}: Obsidian theme changed native paths`)
    assert.deepEqual(variants[3], variants[2], `${name}: Quartz theme changed native paths`)
  }
})

test("current-note dual-host SVG oracle matches frozen hashes", () => {
  const expected = new Map([
    [
      "current/obsidian/kafka-light.svg",
      "8d75f2a0a416132d9aeaa7fff4fd65d35d62ea66910b18645948550ef364a18e",
    ],
    [
      "current/obsidian/kafka-dark.svg",
      "8d75f2a0a416132d9aeaa7fff4fd65d35d62ea66910b18645948550ef364a18e",
    ],
    [
      "current/quartz/kafka-light.svg",
      "714ec14adeb1ee2fa46ba067588741182b252818c754c1757d3cb0ba9fc92305",
    ],
    [
      "current/quartz/kafka-dark.svg",
      "fa652abb12c05e7e724ffed860381ef54fc8ea052bbfa031c6719bebd3ff9ef6",
    ],
  ])
  for (const [relative, hash] of expected) {
    const file = path.join(oracle, relative)
    assert.equal(existsSync(file), true, file)
    assert.equal(sha256(file), hash, relative)
  }
})
