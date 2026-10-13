import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join, relative, sep } from "node:path"
import test from "node:test"
import { transformSync } from "esbuild"
import { cloneElement, Component, createRef, h, type ComponentChildren, type VNode } from "preact"
import render from "preact-render-to-string"

const REPO_ROOT = join(import.meta.dirname, "../../..")
const VAULT_ROOT = join(REPO_ROOT, "Vault")
const QUESTIONS_PATH = join(VAULT_ROOT, "Home/Questions.md")

type Page = {
  $name: string
  $path: string
  $tags: string[]
  value: (key: string) => unknown
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

type TabsdownController = {
  setSelection: (selection: string | null) => void
  destroy: () => void
}

type TabsdownOptions = {
  label: string
  selection: string | null
  tabs: Array<{ id: string; label: string; panel: unknown }>
  onSelectionChange: (selection: string | null, previous: string | null) => void
}

type TabsdownPlugin = {
  mountTabs: (host: unknown, options: TabsdownOptions) => TabsdownController
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const frontmatter = (content: string): Record<string, unknown> => {
  const match = /^---\n([\s\S]*?)\n---/.exec(content)
  if (!match) return {}
  return Object.fromEntries(
    match[1].split("\n").flatMap((line) => {
      const field = /^([\w-]+):\s*(.*)$/.exec(line)
      if (!field) return []
      const raw = field[2].trim()
      if (raw.startsWith("[") && raw.endsWith("]")) {
        return [
          [
            field[1],
            raw
              .slice(1, -1)
              .split(",")
              .map((value) => value.trim()),
          ],
        ]
      }
      return [[field[1], raw.replace(/^['"]|['"]$/g, "")]]
    }),
  )
}

const page = (path: string, content: string): Page => {
  const metadata = frontmatter(content)
  const name = path.split("/").pop()!.replace(/\.md$/, "")
  const tags = Array.isArray(metadata.tags) ? metadata.tags.map(String) : []
  return {
    $name: name,
    $path: path,
    $tags: tags,
    value: (key) => metadata[key],
  }
}

const vaultFixture = () => {
  const contents = new Map<string, string>()
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        contents.set(relative(VAULT_ROOT, path).split(sep).join("/"), readFileSync(path, "utf8"))
      }
    }
  }
  visit(join(VAULT_ROOT, "Home"))
  return {
    contents,
    pages: [...contents].map(([path, content]) => page(path, content)),
  }
}

const source = readFileSync(QUESTIONS_PATH, "utf8")
const block = /```datacorejsx\n([\s\S]*?)\n```/.exec(source)?.[1]
assert.ok(block, "Questions.md must contain a datacorejsx block")
const compiled = transformSync(`function load(dc, h) {\n${block}\n}\nmodule.exports = load`, {
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
) => () => VNode

const childrenOf = (value: ComponentChildren): ComponentChildren[] =>
  Array.isArray(value)
    ? value.flatMap(childrenOf)
    : value == null || typeof value === "boolean"
      ? []
      : [value]

const cloneTree = (node: ComponentChildren): ComponentChildren => {
  if (Array.isArray(node)) return node.map(cloneTree)
  if (node == null || typeof node === "boolean") return null
  if (typeof node === "object" && "type" in node) {
    const vnode = node as VNode
    return cloneElement(vnode, {}, ...childrenOf(vnode.props.children).map(cloneTree))
  }
  return node
}

const walk = (node: ComponentChildren, matches: VNode[] = [], includeHidden = false): VNode[] => {
  for (const child of childrenOf(node)) {
    if (typeof child === "object" && "type" in child) {
      const vnode = child as VNode
      if (!includeHidden && vnode.props.hidden === true) continue
      matches.push(vnode)
      const Type = vnode.type
      if (typeof Type === "function" && Type.prototype instanceof Component) {
        const ClassComponent = Type as unknown as new (props: Record<string, unknown>) => Component
        const instance = new ClassComponent(vnode.props)
        walk(
          instance.render(instance.props, instance.state, instance.context),
          matches,
          includeHidden,
        )
      } else {
        walk(vnode.props.children, matches, includeHidden)
      }
    }
  }
  return matches
}

const textOf = (node: ComponentChildren): string =>
  childrenOf(node)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : typeof child === "object" && "type" in child
          ? textOf((child as VNode).props.children)
          : "",
    )
    .join("")

class DatacoreHarness {
  private slots: unknown[] = []
  private effects: Array<{ deps?: unknown[]; cleanup?: () => void }> = []
  private cursor = 0
  private dirty = true
  private pendingReads = 0
  private component: () => VNode
  private vnode!: VNode
  readCount = 0
  revision = 1

  constructor(
    readonly pages: Page[],
    readonly contents: Map<string, string | Promise<string>>,
    readonly tabsdown?: TabsdownPlugin,
  ) {
    const dc = {
      useCurrentPath: () => "Home/Questions",
      useQuery: () => this.pages,
      useIndexUpdates: () => this.revision,
      useRef: (initial: unknown) => {
        const index = this.cursor++
        if (!(index in this.slots)) this.slots[index] = { current: initial }
        return this.slots[index]
      },
      useState: (initial: unknown) => {
        const index = this.cursor++
        if (!(index in this.slots)) this.slots[index] = initial
        return [
          this.slots[index],
          (next: unknown) => {
            this.slots[index] =
              typeof next === "function"
                ? (next as (value: unknown) => unknown)(this.slots[index])
                : next
            this.dirty = true
          },
        ]
      },
      useEffect: (effect: () => void | (() => void), deps?: unknown[]) => {
        const index = this.cursor++
        const previous = this.effects[index]
        const changed =
          !previous ||
          !deps ||
          !previous.deps ||
          deps.some((value, offset) => !Object.is(value, previous.deps![offset]))
        if (!changed) return
        previous?.cleanup?.()
        const cleanup = effect()
        this.effects[index] = { deps, cleanup: typeof cleanup === "function" ? cleanup : undefined }
      },
      app: {
        plugins: {
          getPlugin: (id: string) => (id === "tabsdown" ? this.tabsdown : undefined),
        },
        vault: {
          getAbstractFileByPath: (path: string) => (this.contents.has(path) ? { path } : null),
          cachedRead: async ({ path }: { path: string }) => {
            this.readCount++
            this.pendingReads++
            try {
              return await this.contents.get(path)!
            } finally {
              this.pendingReads--
            }
          },
        },
      },
      Markdown: ({ content }: { content: string }) =>
        h("mock-markdown", { "data-content": content }),
      preact: { Component, createRef },
    }
    this.component = loadComponent(dc, h)
    this.render()
  }

  private render() {
    this.cursor = 0
    this.dirty = false
    this.vnode = this.component()
  }

  async settle(stopWhen?: () => boolean) {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (this.dirty) this.render()
      await new Promise<void>((resolve) => setImmediate(resolve))
      if (this.dirty) continue
      if (stopWhen?.()) return
      if (!stopWhen && this.pendingReads === 0) {
        await Promise.resolve()
        if (!this.dirty) return
      }
    }
    throw new Error("Datacore harness did not settle")
  }

  refresh() {
    this.revision++
    this.dirty = true
    this.render()
  }

  html() {
    return render(cloneTree(this.vnode) as VNode)
  }

  nodes(type?: string) {
    return walk(this.vnode).filter((node) => type === undefined || node.type === type)
  }

  allNodes(type?: string) {
    return walk(this.vnode, [], true).filter((node) => type === undefined || node.type === type)
  }

  questionTopics() {
    const component = this.nodes().find(
      (node) => typeof node.type === "function" && node.type.name === "QuestionTopics",
    )
    assert.ok(component, "missing QuestionTopics bridge")
    return component
  }

  chooseTopic(label: string) {
    const component = this.questionTopics()
    const topic = component.props.topics.find(
      (candidate: { name: string; label: string }) =>
        candidate.name === label || candidate.label === label,
    )
    assert.ok(topic, `missing topic ${label}`)
    component.props.onSelect(topic.name)
    this.render()
  }

  choosePath(path: string) {
    const select = this.nodes("select")[0]
    assert.ok(select, "missing subtopic select")
    select.props.onChange({ currentTarget: { value: path } })
    this.render()
  }
}

const real = vaultFixture()
const realHarness = new DatacoreHarness(real.pages, real.contents)
await realHarness.settle()

const calloutCount = (content: string) => content.match(/^>\s*\[!QUESTION\]/gim)?.length ?? 0

const expectedRootInventory = real.pages
  .filter(
    (candidate) =>
      candidate.$path.split("/").length === 3 &&
      candidate.$tags.includes("FolderNote") &&
      !candidate.$tags.includes("MetricsIgnore"),
  )
  .map((hub) => {
    const root = hub.$path.split("/")[1]
    const count = [...real.contents]
      .filter(([path]) => path.startsWith(`Home/${root}/`) && path !== "Home/Questions.md")
      .reduce((total, [, content]) => total + calloutCount(content), 0)
    const numericOrder = Number(hub.value("order"))
    return {
      label: hub.$name,
      root,
      order: Number.isFinite(numericOrder) ? numericOrder : Number.MAX_SAFE_INTEGER,
      count,
    }
  })
  .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label))

const renderedRootInventory = () =>
  realHarness
    .questionTopics()
    .props.topics.map(({ label, count }: { label: string; count: number }) => ({ label, count }))

const expectedScopeCount = (scope: string) =>
  [...real.contents]
    .filter(([path]) => {
      const folder = path.slice(0, path.lastIndexOf("/"))
      const expectedFolder = `Home/${scope}`
      return folder === expectedFolder || folder.startsWith(`${expectedFolder}/`)
    })
    .reduce((total, [, content]) => total + calloutCount(content), 0)

const questionSnapshot = (harness: DatacoreHarness) =>
  harness
    .allNodes("div")
    .filter((node) => node.props.class === "dc-qi-question")
    .map((question) => {
      const children = childrenOf(question.props.children) as VNode[]
      return {
        key: question.key,
        question: children[0].props.content,
        source: (childrenOf(children[1].props.children)[0] as VNode).props.content,
      }
    })

test("renders every current FolderNote root in frontmatter order", () => {
  assert.deepEqual(
    renderedRootInventory().map(({ label }) => label),
    expectedRootInventory.map(({ label }) => label),
  )
})

test("extracts the current vault question totals for every root", () => {
  assert.deepEqual(
    renderedRootInventory(),
    expectedRootInventory.map(({ label, count }) => ({ label, count })),
  )
})

test("preloads every keyed question subtree without rereading on scope changes", async () => {
  const harness = new DatacoreHarness(real.pages, real.contents)
  await harness.settle()

  const expectedTotal = expectedRootInventory.reduce((total, topic) => total + topic.count, 0)
  const before = questionSnapshot(harness)
  assert.equal(before.length, expectedTotal)
  assert.equal(new Set(before.map(({ key }) => key)).size, expectedTotal)

  const allSelects = harness.allNodes("select")
  assert.equal(allSelects.length, expectedRootInventory.length)
  assert.equal(harness.nodes("select").length, 1)
  assert.equal(new Set(allSelects.map((select) => select.props.id)).size, allSelects.length)
  for (const topic of expectedRootInventory) {
    assert.ok(
      allSelects.some((select) => String(select.props.id).endsWith(encodeURIComponent(topic.root))),
      `missing stable select id for ${topic.root}`,
    )
  }

  const sectionScopes = harness
    .allNodes("section")
    .filter((node) => node.props.class === "dc-qi-section")
    .map((node) => ({ key: node.key, scope: node.props["data-scope"] }))
  assert.ok(sectionScopes.length > expectedRootInventory.length)
  assert.equal(new Set(sectionScopes.map(({ key }) => key)).size, sectionScopes.length)
  assert.ok(sectionScopes.every(({ key, scope }) => key === scope))

  const reads = harness.readCount
  const deepPath = harness
    .nodes("option")
    .map((option) => String(option.props.value))
    .reduce((left, right) => (right.split("/").length > left.split("/").length ? right : left))
  harness.choosePath(deepPath)
  assert.deepEqual(questionSnapshot(harness), before)
  harness.chooseTopic("AI & ML")
  assert.deepEqual(questionSnapshot(harness), before)
  assert.equal(harness.readCount, reads)
})

test("topic selection switches the selected topic and resets its scope", () => {
  const topic = expectedRootInventory.find(({ root }) => root === "AI & ML")!
  realHarness.chooseTopic(topic.label)
  assert.equal(textOf(realHarness.nodes("h2")[0]), topic.root)
  assert.equal(realHarness.nodes("select")[0].props.value, topic.root)
  assert.equal(
    realHarness.nodes("div").filter((node) => node.props.class === "dc-qi-question").length,
    topic.count,
  )
})

test("the subtopic selector exposes every depth and scopes to the chosen path", () => {
  realHarness.chooseTopic("Programming")
  const values = realHarness.nodes("option").map((option) => option.props.value)
  const deepest = values.reduce((left, right) =>
    right.split("/").length > left.split("/").length ? right : left,
  )
  assert.ok(deepest.split("/").length >= 5, `expected a deep path, got ${deepest}`)
  realHarness.choosePath(deepest)
  assert.equal(realHarness.nodes("select")[0].props.value, deepest)
  assert.equal(
    textOf(realHarness.nodes("p").find((node) => node.props.class === "dc-qi-path")!),
    deepest.split("/").join(" / "),
  )
  assert.equal(
    realHarness.nodes("div").filter((node) => node.props.class === "dc-qi-question").length,
    expectedScopeCount(deepest),
  )
})

test("repeated Evaluation options preserve their full ancestry", () => {
  realHarness.chooseTopic("AI & ML")
  const evaluation = realHarness
    .nodes("option")
    .filter((option) => String(option.props.value).endsWith("/Evaluation"))
  assert.ok(evaluation.length >= 2)
  assert.equal(new Set(evaluation.map((option) => textOf(option))).size, evaluation.length)
  assert.ok(evaluation.every((option) => textOf(option).includes(" / Evaluation")))
})

test("each rendered question keeps its source link outside the answer markdown", () => {
  const topic = expectedRootInventory.find(({ count }) => count > 0)!
  realHarness.chooseTopic(topic.label)
  const questions = realHarness.nodes("div").filter((node) => node.props.class === "dc-qi-question")
  assert.ok(questions.length > 0)
  for (const question of questions) {
    const children = childrenOf(question.props.children) as VNode[]
    assert.equal(typeof children[0].type, "function")
    assert.equal(children[1].props.class, "dc-qi-source")
    assert.match(
      String((childrenOf(children[1].props.children)[0] as VNode).props.content),
      /^\*Source:/,
    )
  }
})

test("shows a loading message before the first read batch completes", () => {
  const wait = deferred<string>()
  const pages = [
    page("Home/Programming/Programming.md", "---\ntags: [FolderNote]\norder: 10\n---"),
    page("Home/Programming/Async.md", "---\ntags: []\n---"),
  ]
  const harness = new DatacoreHarness(
    pages,
    new Map([
      ["Home/Programming/Programming.md", wait.promise],
      ["Home/Programming/Async.md", wait.promise],
    ]),
  )
  assert.match(harness.html(), /Loading questions…/)
  wait.resolve("")
})

test("shows explicit empty states when topics or questions are absent", async () => {
  const none = new DatacoreHarness([], new Map())
  assert.match(none.html(), /No topic folders are available/)

  const hubContent = "---\ntags: [FolderNote]\norder: 90\n---"
  const empty = new DatacoreHarness(
    [page("Home/Cloud/Cloud.md", hubContent)],
    new Map([["Home/Cloud/Cloud.md", hubContent]]),
  )
  await empty.settle()
  assert.match(empty.html(), /No questions in this topic yet/)
})

test("retains a chosen deep scope while a progressive refresh rebuilds it", async () => {
  const hub = "---\ntags: [FolderNote]\norder: 10\n---"
  const question = "> [!QUESTION] Deep question\n> Deep answer"
  const paths = Array.from({ length: 24 }, (_, index) => `Home/Programming/Filler-${index}.md`)
  const deepPath = "Home/Programming/NET/C#/Concurrency/Parallelism.md"
  const pages = [
    page("Home/Programming/Programming.md", hub),
    ...paths.map((path) => page(path, question)),
    page(deepPath, question),
  ]
  const contents = new Map<string, string | Promise<string>>([
    ["Home/Programming/Programming.md", hub],
    ...paths.map((path) => [path, question] as const),
    [deepPath, question],
  ])
  const harness = new DatacoreHarness(pages, contents)
  await harness.settle()
  harness.choosePath("Programming/NET/C#/Concurrency")

  const wait = deferred<string>()
  contents.set(deepPath, wait.promise)
  harness.refresh()
  await harness.settle(
    () => harness.html().includes('aria-busy="true"') && harness.html().includes("Filler-23"),
  )
  wait.resolve(question)
  await harness.settle()

  assert.equal(harness.nodes("select")[0].props.value, "Programming/NET/C#/Concurrency")
  assert.equal(
    harness.nodes("div").filter((node) => node.props.class === "dc-qi-question").length,
    1,
  )
  assert.match(harness.html(), />Programming \/ NET \/ C# \/ Concurrency<\/p>/)
})

test("falls back to the topic after a chosen section disappears", async () => {
  const hub = "---\ntags: [FolderNote]\norder: 10\n---"
  const question = "> [!QUESTION] Deep question\n> Deep answer"
  const deepPath = "Home/Programming/NET/C#/Concurrency/Parallelism.md"
  const pages = [page("Home/Programming/Programming.md", hub), page(deepPath, question)]
  const contents = new Map<string, string | Promise<string>>([
    ["Home/Programming/Programming.md", hub],
    [deepPath, question],
  ])
  const harness = new DatacoreHarness(pages, contents)
  await harness.settle()
  harness.choosePath("Programming/NET/C#/Concurrency")
  contents.set(deepPath, "")
  harness.refresh()
  await harness.settle()

  assert.equal(harness.nodes("select")[0].props.value, "Programming")
  assert.match(harness.html(), /No questions in this topic yet/)
})

test("QuestionTopics destroys before remount, preserves selection, and cleans up", async () => {
  const hub = "---\ntags: [FolderNote]\norder: 10\n---"
  const question = "> [!QUESTION] Bridge question\n> Bridge answer"
  const events: string[] = []
  let latestOptions: TabsdownOptions | undefined
  let mountNumber = 0
  const plugin: TabsdownPlugin = {
    mountTabs(_host, options) {
      assert.equal(this, plugin)
      mountNumber++
      latestOptions = options
      events.push(`mount:${mountNumber}`)
      return {
        setSelection: (selection) => events.push(`select:${selection}`),
        destroy: () => events.push(`destroy:${mountNumber}`),
      }
    },
  }
  const harness = new DatacoreHarness(
    [
      page("Home/Programming/Programming.md", hub),
      page("Home/Programming/Question.md", question),
      page("Home/AI & ML/AI & ML.md", "---\ntags: [FolderNote]\norder: 20\n---"),
      page("Home/AI & ML/Question.md", question),
    ],
    new Map([
      ["Home/Programming/Programming.md", hub],
      ["Home/Programming/Question.md", question],
      ["Home/AI & ML/AI & ML.md", "---\ntags: [FolderNote]\norder: 20\n---"],
      ["Home/AI & ML/Question.md", question],
    ]),
    plugin,
  )
  await harness.settle()

  const vnode = harness.questionTopics()
  type Topic = { name: string; label: string; count: number }
  type Props = {
    topics: Topic[]
    selection: string
    onSelect: (name: string) => void
    children: ComponentChildren
  }
  type Instance = Component<Props> & {
    host: { current: unknown }
    componentDidMount: () => void
    componentWillUpdate: () => void
    componentDidUpdate: () => void
    componentWillUnmount: () => void
  }
  const QuestionTopics = vnode.type as unknown as new (props: Props) => Instance
  const selections: string[] = []
  const instance = new QuestionTopics({ ...vnode.props, onSelect: (name) => selections.push(name) })
  const topics = vnode.props.topics as Topic[]
  const panels = topics.map((topic) => ({ dataset: { topic: topic.name } }))
  const tabs = topics.map((topic) => ({
    focus: () => events.push(`focus:${topic.name}`),
  }))
  const root = { activeElement: tabs[1] }
  const host = {
    children: panels,
    getRootNode: () => root,
    ownerDocument: { activeElement: null },
    querySelectorAll: (selector: string) => (selector === ".tabsdown__tab" ? tabs : []),
  }
  instance.host.current = host

  instance.componentDidMount()
  assert.deepEqual(events, ["mount:1"])
  assert.equal(latestOptions?.label, "Question topics")
  assert.equal(latestOptions?.selection, vnode.props.selection)
  assert.deepEqual(
    latestOptions?.tabs.map(({ id, label, panel }) => ({ id, label, panel })),
    topics.map((topic, index) => ({
      id: topic.name,
      label: `${topic.label} (${topic.count})`,
      panel: panels[index],
    })),
  )

  latestOptions?.onSelectionChange(null, "Programming")
  assert.deepEqual(selections, [])
  assert.equal(events.at(-1), "select:Programming")
  latestOptions?.onSelectionChange("AI & ML", "Programming")
  assert.deepEqual(selections, ["AI & ML"])

  instance.componentWillUpdate()
  instance.componentDidUpdate()
  assert.deepEqual(events.slice(-3), ["destroy:1", "mount:2", "focus:AI & ML"])

  instance.componentWillUnmount()
  assert.equal(events.at(-1), "destroy:2")
})

test("missing Tabsdown keeps the selected native controls and questions readable", async () => {
  const hub = "---\ntags: [FolderNote]\norder: 10\n---"
  const question = "> [!QUESTION] Readable question\n> Readable answer"
  const harness = new DatacoreHarness(
    [page("Home/Programming/Programming.md", hub), page("Home/Programming/Question.md", question)],
    new Map([
      ["Home/Programming/Programming.md", hub],
      ["Home/Programming/Question.md", question],
    ]),
  )
  await harness.settle()

  assert.match(harness.html(), /Enable Tabsdown to switch topics/)
  assert.equal(harness.nodes("select").length, 1)
  assert.equal(
    harness.nodes("div").filter((node) => node.props.class === "dc-qi-question").length,
    1,
  )
  assert.match(harness.html(), /Readable question/)
})
