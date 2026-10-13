import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { transformSync } from "esbuild"
import { h, type VNode } from "preact"
import render from "preact-render-to-string"

const HOME_PATH = join(import.meta.dirname, "../../../Vault/Home/index.md")
const source = readFileSync(HOME_PATH, "utf8")
const block = /```datacorejsx\n([\s\S]*?)\n```/.exec(source)?.[1]
assert.ok(block, "Home/index.md must contain a datacorejsx block")

const compiled = transformSync(`async function load(dc, h) {\n${block}\n}\nmodule.exports = load`, {
  loader: "jsx",
  format: "cjs",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  target: "es2022",
}).code
const module = { exports: undefined as unknown }
new Function("module", "exports", compiled)(module, module.exports)
const loadComponent = module.exports as (
  dc: Record<string, unknown>,
  h: typeof import("preact").h,
) => Promise<() => VNode>

type Tile = { index: number; column: number; row: number; width: number; height: number }

const topicPages = (count: number, summary = "Summary") =>
  Array.from({ length: count }, (_, index) => {
    const title = `Topic ${String(index).padStart(2, "0")}`
    const values: Record<string, unknown> = {
      color: "#4c8000",
      icon: "folder",
      order: index + 1,
      status: "Not-Started",
      summary,
    }
    return {
      $link: `Home/${title}/${title}`,
      $name: title,
      $path: `Home/${title}/${title}.md`,
      $tags: ["FolderNote"],
      value: (key: string) => values[key],
    }
  })

const renderDashboard = async (count: number, summary = "Summary") => {
  const dc = {
    Link: ({ link }: { link: string }) => h("a", { href: `/${link}` }, link),
    require: async (path: string) =>
      path.endsWith("devbook-card.jsx")
        ? {
            CARD_CSS: ".db-card { box-sizing: border-box; }",
            squashCss: (css: string) => css.replace(/\s+/g, " ").trim(),
          }
        : { icon: () => "<svg></svg>" },
    useCurrentFile: () => ({ $path: "Home/index.md" }),
    useQuery: () => topicPages(count, summary),
  }
  const Component = await loadComponent(dc, h)
  return render(h(Component, {}))
}

const placements = (html: string, count: number): Record<3 | 4 | 6, Tile[]> => {
  const rules = [
    ...html.matchAll(
      /\.dc-topic-grid \.tile-(\d+) \{ grid-column: (\d+) \/ span (\d+); grid-row: (\d+) \/ span (\d+); \}/g,
    ),
  ].map(([, index, column, width, row, height]) => ({
    index: Number(index),
    column: Number(column),
    row: Number(row),
    width: Number(width),
    height: Number(height),
  }))
  assert.equal(rules.length, count * 3, `expected three layouts for ${count} topics`)
  return {
    6: rules.slice(0, count),
    4: rules.slice(count, count * 2),
    3: rules.slice(count * 2),
  }
}

const assertRectangle = (tiles: Tile[], count: number, minSpan: number) => {
  assert.equal(tiles.length, count)
  if (count === 0) return
  const lastRow = Math.max(...tiles.map((tile) => tile.row + tile.height - 1))
  const cells = Array.from({ length: lastRow }, () => Array(12).fill(0))
  for (const tile of tiles) {
    assert.ok(tile.column >= 1 && tile.column + tile.width - 1 <= 12)
    assert.ok(tile.row >= 1 && tile.width >= minSpan && tile.height >= 1)
    for (let row = tile.row; row < tile.row + tile.height; row++) {
      for (let column = tile.column; column < tile.column + tile.width; column++) {
        cells[row - 1][column - 1]++
      }
    }
  }
  assert.ok(cells.every((row) => row.every((occupancy) => occupancy === 1)))
}

test("tiles form a complete rectangle without gaps or overlaps for zero through thirty topics", async () => {
  for (let count = 0; count <= 30; count++) {
    const layouts = placements(await renderDashboard(count), count)
    for (const minSpan of [6, 4, 3] as const) {
      assertRectangle(layouts[minSpan], count, minSpan)
    }
  }
})

test("tile widths respect each responsive layout minimum", async () => {
  const layouts = placements(await renderDashboard(30), 30)
  for (const minSpan of [6, 4, 3] as const) {
    assert.ok(layouts[minSpan].every((tile) => tile.width >= minSpan))
  }
})

test("source and keyboard order follows visual row-major order", async () => {
  const count = 30
  const html = await renderDashboard(count)
  const expectedTitles = topicPages(count).map((page) => page.$name)
  const renderedTitles = [...html.matchAll(/<span class="db-card-title">([^<]+)<\/span>/g)].map(
    ([, title]) => title,
  )
  const renderedLinks = [...html.matchAll(/<a href="[^"]+">([^<]+)<\/a>/g)].map(([, link]) =>
    link.split("/").at(-1),
  )
  assert.deepEqual(renderedTitles, expectedTitles)
  assert.deepEqual(renderedLinks, expectedTitles)
  for (const tiles of Object.values(placements(html, count))) {
    const rowMajor = [...tiles].sort(
      (left, right) => left.row - right.row || left.column - right.column,
    )
    assert.deepEqual(tiles, rowMajor)
  }
})

test("ten desktop topics form three, four, and three cards in complete rows", async () => {
  const tiles = placements(await renderDashboard(10), 10)[3]
  assert.deepEqual(
    [1, 2, 3].map((row) => tiles.filter((tile) => tile.row === row).length),
    [3, 4, 3],
  )
  assert.ok(tiles.every((tile) => tile.height === 1))
  assertRectangle(tiles, 10, 3)
})

test("the same topic inventory produces stable tile coordinates", async () => {
  const first = placements(await renderDashboard(30), 30)
  const second = placements(await renderDashboard(30), 30)
  assert.deepEqual(second, first)
})

test("rendered topic summaries remain complete and unclamped", async () => {
  const summary =
    "A deliberately long summary whose final sentinel must remain available to both readers. SUMMARY_END"
  const html = await renderDashboard(1, summary)
  const css = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? ""
  assert.match(html, new RegExp(`${summary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`))
  assert.doesNotMatch(css, /(?:line-clamp|text-overflow|max-height)/)
})

test("home source no longer contains the welcome copy", () => {
  assert.doesNotMatch(source, /Welcome to DevBook!/i)
})
