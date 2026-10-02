import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"
import { h } from "preact"
import render from "preact-render-to-string"
import type { Element } from "hast"
import { QuestionsIndex } from "./questions-index"

const callout: Element = {
  type: "element",
  tagName: "blockquote",
  properties: { className: ["callout", "question"] },
  children: [{ type: "text", value: "Question and answer" }],
}
const file = (slug: string, count = 0, frontmatter = {}) => ({
  slug,
  frontmatter: slug.endsWith("/index") ? { tags: ["FolderNote"], ...frontmatter } : frontmatter,
  questionCallouts: Array.from({ length: count }, () => ({ node: callout })),
})
const component = QuestionsIndex(undefined)
const customStyles = readFileSync(
  new URL("../../quartz/styles/custom.scss", import.meta.url),
  "utf8",
)
const html = (allFiles: ReturnType<typeof file>[], slug = "questions") =>
  render(h(component, { allFiles, fileData: { slug } } as never))

test("client mount waits for Quartz's initial nav and runs on later navigation", () => {
  let mountQueries = 0
  const listeners = new Map<string, () => void>()
  runInNewContext(component.afterDOMLoaded!, {
    document: {
      addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
      querySelector: () => {
        mountQueries++
        return null
      },
    },
    window: {}, // Quartz installs addCleanup immediately before dispatching nav.
  })
  assert.equal(mountQueries, 0)
  assert.ok(listeners.has("nav"))
  listeners.get("nav")!()
  listeners.get("nav")!()
  assert.equal(mountQueries, 2)
})

test("QuestionsIndex gates to its dashboard and has a useful empty state", () => {
  assert.equal(html([file("programming/note", 1)], "index"), "")
  assert.match(html([]), /0 questions/)
  assert.match(html([]), /No questions found/)
})

test("topic order, labels and nested counts follow folder metadata", () => {
  const result = html([
    file("ai/index", 0, { title: "AI & ML", order: 70, color: "#10b981" }),
    file("programming/index", 0, { title: "Programming", order: "10", color: "#f43f5e" }),
    file("ai/rag/note", 2),
    file("programming/net/csharp/note", 3),
    file("programming/net/other", 1),
  ])
  assert.match(result, /6 questions/)
  assert.ok(result.indexOf('data-qi-topic="programming"') < result.indexOf('data-qi-topic="ai"'))
  assert.match(result, /data-qi-label="Programming" data-qi-count="4"/)
  assert.match(result, /AI &amp; ML/)
  assert.match(result, /All Programming \(4\)/)
  assert.match(result, /Net \/ Csharp \(3\)/)
})

test("every descendant path is reachable and repeated names retain ancestry", () => {
  const result = html([
    file("ai/rag/evaluation/note", 1),
    file("ai/agents/evaluation/note", 2),
    file("programming/a/b/c/d/e/f/g/note", 1),
  ])
  assert.match(result, /Rag \/ Evaluation \(1\)/)
  assert.match(result, /Agents \/ Evaluation \(2\)/)
  assert.match(result, /value="programming\/a\/b\/c\/d\/e\/f\/g"/)
  assert.match(result, /id="ai-rag-evaluation"/)
  assert.match(result, /id="ai-agents-evaluation"/)
  const ids = [...result.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(ids).size, ids.length)
})

test("every topic panel and source is preloaded in server HTML without JavaScript", () => {
  const result = html([
    file("programming/net/async", 2, { title: "Task & ValueTask" }),
    file("ai/rag/retrieval", 1, { title: "Retrieval" }),
    file("questions", 4),
  ])
  assert.equal([...result.matchAll(/class="qi-item"/g)].length, 3)
  assert.match(result, /href="\.\/programming\/net\/async"/)
  assert.match(result, /href="\.\/ai\/rag\/retrieval"/)
  assert.match(result, /Task &amp; ValueTask/)
  assert.doesNotMatch(result, /class="qi-topic-panel"[^>]*\bhidden/)
  assert.match(result, /class="qi-tabs"/)
  assert.doesNotMatch(result, /class="qi-topic"/)
  const topicPanels = result.split('class="qi-topic-panel"').slice(1)
  assert.equal(topicPanels.length, 2)
  assert.equal(
    topicPanels.every((panel) => panel.includes('class="qi-item"')),
    true,
  )
  assert.equal(
    topicPanels.every((panel) => panel.includes('class="qi-source"')),
    true,
  )
})

test("Questions-only Tabsdown layout wraps with the plugin's supported variables", () => {
  assert.match(
    customStyles,
    /\.questions-index \.tabsdown\.tabsdown--mounted \{[^}]*--tabsdown-overflow-wrap: wrap;[^}]*--tabsdown-overflow-x: visible;[^}]*--tabsdown-equal-width-flex: 1 1 max-content;/,
  )
  assert.doesNotMatch(component.css!, /--tabsdown-overflow-wrap/)
})

test("root-level notes are included in a selectable scope", () => {
  const result = html([file("standalone-note", 1)])
  assert.match(result, /All Other \(1\)/)
  assert.match(result, /href="\.\/standalone-note"/)
  assert.equal([...result.matchAll(/class="qi-item"/g)].length, 1)
})

test("empty topic FolderNotes remain visible in the landscape", () => {
  const result = html([
    file("programming/index", 0, { title: "Programming", order: 10 }),
    file("cloud/index", 0, { title: "Cloud", order: 90 }),
    file("tags/index", 0, { title: "Tag Index", tags: ["MetricsIgnore"] }),
    file("programming/note", 1),
  ])
  assert.match(result, /data-qi-topic="cloud"/)
  assert.match(result, /All Cloud \(0\)/)
  assert.match(result, /No questions in this topic yet/)
  assert.doesNotMatch(result, /data-qi-topic="tags"/)
})

test("a tag-only FolderNote remains a visible empty topic", () => {
  const result = html([file("new-topic/index")])
  assert.match(result, /data-qi-topic="new-topic"/)
  assert.match(result, /All New Topic \(0\)/)
})

test("client mounts real Tabsdown topics and preserves hash-scoped navigation", () => {
  const rootListeners = new Map<string, (event: any) => void>()
  const windowListeners = new Map<string, () => void>()
  const documentListeners = new Map<string, () => void>()
  const controls = [{ hidden: true }, { hidden: true }]
  const location = { hash: "#ai-rag" }
  let cleanup = () => {}
  let mounted: any
  let destroyed = false
  const selections: Array<string | null> = []
  const tabsHost = {}

  const makePanel = (topic: string, label: string, count: number, child?: string) => {
    const title = { textContent: label }
    const breadcrumb = { textContent: "", hidden: true }
    const sections = [
      { dataset: { qiPath: topic }, hidden: false },
      ...(child ? [{ dataset: { qiPath: child }, hidden: false }] : []),
    ]
    const panel: any = {
      dataset: { qiTopic: topic, qiLabel: label, qiCount: String(count) },
      querySelector: (selector: string) => {
        if (selector === "select") return panel.select
        if (selector === ".qi-title") return title
        if (selector === ".qi-path") return breadcrumb
        return null
      },
      querySelectorAll: (selector: string) =>
        selector === ".qi-section" ? sections : selector === "option" ? panel.select.options : [],
    }
    const option = (
      value: string,
      anchor: string,
      optionTitle: string,
      trail: string,
      n: number,
    ) => ({
      value,
      dataset: { qiAnchor: anchor, qiTitle: optionTitle, qiTrail: trail, qiCount: String(n) },
      closest: () => panel,
    })
    panel.select = {
      value: topic,
      options: [
        option(topic, topic, label, label, count),
        ...(child ? [option(child, child.replaceAll("/", "-"), "Rag", `${label} / Rag`, 2)] : []),
      ],
    }
    return panel
  }

  const programming = makePanel("programming", "Programming", 4)
  const ai = makePanel("ai", "AI & ML", 3, "ai/rag")
  const panels = [programming, ai]
  const root: any = {
    dataset: {},
    querySelector: (selector: string) => (selector === ".qi-tabs" ? tabsHost : null),
    querySelectorAll: (selector: string) => {
      if (selector === ".qi-topic-panel") return panels
      if (selector === ".qi-scope-control") return controls
      if (selector === "option") return panels.flatMap((panel) => panel.select.options)
      return []
    },
    addEventListener: (name: string, callback: (event: any) => void) =>
      rootListeners.set(name, callback),
    removeEventListener: (name: string) => rootListeners.delete(name),
  }
  const controller = {
    setSelection: (selection: string | null) => selections.push(selection),
    destroy: () => {
      destroyed = true
    },
  }

  runInNewContext(component.afterDOMLoaded!, {
    document: {
      addEventListener: (name: string, callback: () => void) =>
        documentListeners.set(name, callback),
      querySelector: () => root,
    },
    window: {
      tabsdown: {
        mountTabs: (_host: unknown, options: unknown) => {
          mounted = options
          return controller
        },
      },
      addEventListener: (name: string, callback: () => void) => windowListeners.set(name, callback),
      removeEventListener: (name: string) => windowListeners.delete(name),
      addCleanup: (callback: () => void) => {
        cleanup = callback
      },
    },
    location,
    history: {
      state: null,
      replaceState: (_state: unknown, _unused: string, hash: string) => {
        location.hash = hash
      },
    },
  })

  documentListeners.get("nav")!()
  assert.equal(mounted.label, "Question topics")
  assert.deepEqual(
    Array.from(mounted.tabs, (tab: any) => [String(tab.id), String(tab.label)]),
    [
      ["programming", "Programming (4)"],
      ["ai", "AI & ML (3)"],
    ],
  )
  assert.equal(mounted.selection, "ai")
  assert.equal(ai.select.value, "ai/rag")
  assert.equal(
    controls.every((control) => !control.hidden),
    true,
  )

  mounted.onSelectionChange("programming", "ai")
  assert.equal(location.hash, "#programming")
  mounted.onSelectionChange(null, "programming")
  assert.deepEqual(selections, ["programming"])

  location.hash = "#ai-rag"
  windowListeners.get("hashchange")!()
  assert.deepEqual(selections, ["programming", "ai"])
  cleanup()
  assert.equal(destroyed, true)
})
