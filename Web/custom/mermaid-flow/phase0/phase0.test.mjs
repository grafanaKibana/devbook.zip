import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { build } from "esbuild"
import { chromium } from "playwright"

const here = path.dirname(new URL(import.meta.url).pathname)
const fixture = (host, name, theme = "light") =>
  path.join(here, "fixtures", host, `${name}-${theme}.svg`)
const expectedEdges = {
  minimal: ["L_A_B_0"],
  "edge-identity": [
    "L_A_B_0",
    "L_A_B_1",
    "L_B_C_2",
    "L_C_D_3",
    "L_A_E_4",
    "L_C_E_5",
    "L_E_F_6",
    "L_F_D_7",
  ],
  kafka: [
    "L_producer_broker_0",
    "L_broker_partition0_1",
    "L_broker_partition1_2",
    "L_broker_partition2_3",
    "L_partition0_consumerA_4",
    "L_partition1_consumerA_5",
    "L_partition1_consumerB_6",
    "L_partition2_consumerB_7",
  ],
}

let browser
let runtimeSource
let pairingSource

test.before(async () => {
  const bundle = async (entry, globalName) =>
    (
      await build({
        entryPoints: [path.join(here, entry)],
        bundle: true,
        write: false,
        format: "iife",
        globalName,
        platform: "browser",
      })
    ).outputFiles[0].text
  runtimeSource = (
    await build({
      stdin: {
        contents: `
          export { MermaidSvgAdapter, productionBeginTimes } from "./src/mermaid-svg-adapter"
          export { mountMermaidFlow } from "./src/mount"
          export { cloneNativeMermaidSvg } from "./src/popup"
        `,
        resolveDir: path.join(here, ".."),
      },
      bundle: true,
      write: false,
      format: "iife",
      globalName: "MermaidFlowPhase0",
      platform: "browser",
    })
  ).outputFiles[0].text
  pairingSource = await bundle("../pairing.ts", "MermaidFlowPairing")
  browser = await chromium.launch({ headless: true })
})

test.after(async () => browser?.close())

const withFixture = async (host, name, theme, run) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.setContent(
    `<main class="theme-${theme}" data-mermaid-flow-pair="phase0">${await readFile(fixture(host, name, theme), "utf8")}</main>`,
  )
  await page.addScriptTag({ content: runtimeSource })
  await page.addScriptTag({ content: pairingSource })
  try {
    return await run(page)
  } finally {
    await page.close()
  }
}

for (const host of ["obsidian", "quartz"]) {
  for (const name of Object.keys(expectedEdges)) {
    for (const theme of ["light", "dark"]) {
      test(`${host} ${name} ${theme}: logical ordinals, actual particles, and native invariants`, async () => {
        await withFixture(host, name, theme, async (page) => {
          const result = await page.evaluate(
            ({ expected, name }) => {
              const adapter = new MermaidFlowPhase0.MermaidSvgAdapter(document.querySelector("svg"))
              const before = adapter.snapshotNative()
              const actual = expected.map((_, ordinal) => adapter.resolveEdge(ordinal).id)
              if (JSON.stringify(actual) !== JSON.stringify(expected))
                throw new Error(`edge ordinal mismatch: ${JSON.stringify(actual)}`)
              const nodePaintTag = adapter.resolveNodePaintTarget(
                name === "kafka" ? "producer" : "A",
              ).tagName
              const edgePaintId = adapter.resolveEdgePaintTarget(0).id
              const fractions = [0, 0.25, 0.5, 0.75, 1]
              const deviations = expected.map((_, ordinal) => ({
                ordinal,
                forward: adapter.sampleProbe(ordinal, "forward", fractions),
                reverse: adapter.sampleProbe(ordinal, "reverse", fractions),
              }))
              const after = adapter.snapshotNative()
              adapter.destroy()
              return { before, after, deviations, nodePaintTag, edgePaintId }
            },
            { expected: expectedEdges[name], name },
          )
          assert.deepEqual(result.after, result.before)
          assert.match(result.nodePaintTag, /^(rect|polygon|path)$/i)
          assert.equal(result.edgePaintId, expectedEdges[name][0])
          for (const edge of result.deviations) {
            for (const deviation of [...edge.forward, ...edge.reverse]) {
              assert.ok(
                deviation <= 0.5,
                `${host}/${name}/${theme}/edge ${edge.ordinal}: ${deviation}px`,
              )
            }
          }
        })
      })
    }
  }
}

for (const host of ["obsidian", "quartz"]) {
  for (const theme of ["light", "dark"]) {
    test(`${host} ${theme}: canonical state, popup, replacement, and pair-local teardown`, async () => {
      await withFixture(host, "minimal", theme, async (page) => {
        const result = await page.evaluate(async () => {
          const root = document.querySelector("main")
          const svg = root?.querySelector("svg")
          if (!(root instanceof HTMLElement) || !(svg instanceof SVGSVGElement))
            throw new Error("fixture SVG unavailable")

          const adapter = new MermaidFlowPhase0.MermaidSvgAdapter(svg)
          const nativeBefore = adapter.snapshotNative()
          adapter.destroy()
          const config = {
            version: 1,
            for: "phase0",
            defaults: {
              nodes: { A: { state: "overloaded" } },
              edges: {
                0: {
                  radius: 2,
                  particlesPerCycle: 2,
                  direction: "forward",
                  delayMs: 0,
                  visible: true,
                  travelMs: 900,
                  state: "warning",
                },
              },
            },
            controls: [],
            scenarios: [],
            bindings: [],
            thresholds: [],
            initialControls: {},
          }
          const handle = MermaidFlowPhase0.mountMermaidFlow(root, svg, config)
          const ownedAfterMount = svg.querySelectorAll("[data-mermaid-flow-owned]").length
          const painted = [
            adapter.resolveNodePaintTarget("A").dataset.mermaidFlowState,
            adapter.resolveEdgePaintTarget(0).dataset.mermaidFlowState,
          ]
          const popup = MermaidFlowPhase0.cloneNativeMermaidSvg(svg)
          const popupOwned = popup.querySelectorAll("[data-mermaid-flow-owned]").length

          const mount = document.createElement("div")
          mount.className = "mermaid-flow-mount"
          mount.dataset.mermaidFlowPair = "phase0"
          mount.dataset.config = '{"for":"phase0"}'
          root.after(mount)
          const resolved = MermaidFlowPairing.resolveConfiguredQuartzPair(mount) === root
          const replacement = MermaidFlowPhase0.cloneNativeMermaidSvg(svg)
          svg.replaceWith(replacement)
          handle.replaceSvg(replacement)
          const replacementOwned = replacement.querySelectorAll("[data-mermaid-flow-owned]").length
          handle.destroy()
          const verifier = new MermaidFlowPhase0.MermaidSvgAdapter(replacement)
          const nativeAfterDestroy = verifier.snapshotNative()
          verifier.destroy()

          return {
            nativeExact: JSON.stringify(nativeAfterDestroy) === JSON.stringify(nativeBefore),
            ownedAfterMount,
            painted,
            popupOwned,
            replacementOwned,
            resolved,
            teardownOwned: replacement.querySelectorAll("[data-mermaid-flow-owned]").length,
          }
        })

        assert.ok(result.ownedAfterMount > 0)
        assert.deepEqual(result.painted, ["overloaded", "warning"])
        assert.equal(result.popupOwned, 0)
        assert.equal(result.nativeExact, true)
        assert.equal(result.resolved, true)
        assert.ok(result.replacementOwned > 0)
        assert.equal(result.teardownOwned, 0)
      })
    })
  }
}

test("production scheduling freezes stagger order, reverse direction, and indefinite loop", async () => {
  await withFixture("quartz", "minimal", "light", async (page) => {
    const result = await page.evaluate(() => {
      const adapter = new MermaidFlowPhase0.MermaidSvgAdapter(document.querySelector("svg"))
      const handle = adapter.createMotion(0, {
        direction: "reverse",
        durationMs: 1200,
        delayMs: 300,
        particlesPerCycle: 3,
      })
      return {
        formula: MermaidFlowPhase0.productionBeginTimes(300, 1200, 3),
        motions: handle.particles.map((particle) => {
          const motion = particle.querySelector("animateMotion")
          return {
            begin: motion.getAttribute("begin"),
            repeatCount: motion.getAttribute("repeatCount"),
            keyPoints: motion.getAttribute("keyPoints"),
          }
        }),
      }
    })
    assert.deepEqual(result.formula, [300, 700, 1100])
    assert.deepEqual(
      result.motions.map((motion) => motion.begin),
      ["300ms", "700ms", "1100ms"],
    )
    assert.ok(
      result.motions.every(
        (motion) => motion.repeatCount === "indefinite" && motion.keyPoints === "1;0",
      ),
    )
  })
})
