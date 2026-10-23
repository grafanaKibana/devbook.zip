import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
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

type LoadComponent = (dc: Record<string, unknown>, h: typeof import("preact").h) => () => VNode

const compileQuestions = (questionsSource: string): LoadComponent => {
  const block = /```datacorejsx\n([\s\S]*?)\n```/.exec(questionsSource)?.[1]
  assert.ok(block, "Questions.md must contain a datacorejsx block")
  const compiled = transformSync(`function load(dc, h) {\n${block}\n}\nmodule.exports = load`, {
    loader: "jsx",
    format: "cjs",
    jsxFactory: "h",
    jsxFragment: "Fragment",
    target: "es2022",
  }).code
  const loaded = { exports: undefined as unknown }
  new Function("module", "exports", compiled)(loaded, loaded.exports)
  return loaded.exports as LoadComponent
}

const source = readFileSync(QUESTIONS_PATH, "utf8")
const loadComponent = compileQuestions(source)

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

  constructor(
    readonly pages: Page[],
    readonly contents: Map<string, string | Promise<string>>,
    readonly tabsdown?: TabsdownPlugin,
  ) {
    const dc = {
      useCurrentPath: () => "Home/Questions",
      useQuery: () => this.pages,
      useIndexUpdates: () => 1,
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
        h("mock-markdown", {
          "data-content": content.replace(/^>\s*<!--\s*qard-answer\s*-->\s*$/gim, ""),
        }),
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

  async settle() {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (this.dirty) this.render()
      await new Promise<void>((resolve) => setImmediate(resolve))
      if (this.dirty) continue
      if (this.pendingReads === 0) {
        await Promise.resolve()
        if (!this.dirty) return
      }
    }
    throw new Error("Datacore harness did not settle")
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
}

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

test("production extraction accepts legacy and Qard cards once while ignoring lookalikes", async () => {
  const hub = "---\ntags: [FolderNote]\norder: 10\n---"
  const fixture = [
    "> [!QUESTION] Legacy question",
    "> Legacy answer with [[Link]] and ![[Embed.png]]",
    "",
    "> [!qArD]- Native question",
    "> Native answer",
    "",
    "> [!qard]+ Multiline front",
    "> Additional front context",
    "> <!-- qard-answer -->",
    "> Multiline answer",
    "",
    "> [!QUESTION]- Inline HTML <!-- editorial marker -->",
    "> Inline HTML answer",
    "",
    "> [!qard]- Visible before <!-- opening marker",
    "> still in the comment -->",
    "> Inline multiline comment answer",
    "",
    "> [!QUESTION]- Mixed <!-- first --> visible <!-- second -->",
    "> Mixed comment answer",
    "",
    "> [!warning] Not an interview card",
    "> Warning body",
    "",
    "```text",
    "> [!qard]- Fenced lookalike",
    "> Not a card",
    "```",
    "",
    "%%",
    "> [!QUESTION]- Commented lookalike",
    "> Not a card",
    "%%",
  ].join("\n")
  const paths = ["Home/Programming/Programming.md", "Home/Programming/Mixed.md"]
  const harness = new DatacoreHarness(
    [page(paths[0], hub), page(paths[1], fixture)],
    new Map([
      [paths[0], hub],
      [paths[1], fixture],
    ]),
  )
  await harness.settle()

  const questions = questionSnapshot(harness)
  assert.equal(questions.length, 6, questions.map(({ question }) => question).join("\n---\n"))
  assert.match(questions[0].question, /Legacy answer with \[\[Link\]\] and !\[\[Embed\.png\]\]/)
  assert.match(questions[1].question, /^> \[!qArD\]- Native question/m)
  assert.match(questions[2].question, /<!-- qard-answer -->/)
  assert.match(questions[3].question, /Inline HTML answer/)
  assert.match(questions[4].question, /Inline multiline comment answer/)
  assert.match(questions[5].question, /Mixed comment answer/)
  assert.equal(new Set(questions.map(({ key }) => key)).size, questions.length)
  assert.doesNotMatch(harness.html(), /qard-answer/)
})

for (const type of ["QUESTION", "qard"]) {
  for (const [open, close] of [
    ["<!--", "-->"],
    ["%%", "%%"],
  ]) {
    test(`production extraction ignores ${open} hidden ${type} cards`, async () => {
      const hub = "---\ntags: [FolderNote]\n---"
      const hidden = `${open}\n> [!${type}]- Hidden example\n> Hidden answer\n${close}`
      const contents = new Map([
        ["Home/Programming/Programming.md", hub],
        ["Home/Programming/Hidden.md", hidden],
      ])
      const harness = new DatacoreHarness(
        [...contents].map(([path, content]) => page(path, content)),
        contents,
      )
      await harness.settle()
      assert.equal(questionSnapshot(harness).length, 0)
    })
  }
}

test("production extraction separates adjacent cards while preserving nested and fenced examples", async () => {
  const hub = "---\ntags: [FolderNote]\norder: 10\n---"
  const fixture = [
    "> [!qard]- Outer card",
    "> > [!QUESTION]- Nested answer example",
    "> > Nested content",
    "> ```md",
    "> [!qard]- Fenced answer example",
    "> ```",
    "> Outer answer",
    "> [!QUESTION]- Sibling card",
    "> Sibling answer",
    "> [!qard]- Third card",
    "> Third answer",
  ].join("\n")
  const path = "Home/Programming/Nested-Lookalike.md"
  const harness = new DatacoreHarness(
    [page("Home/Programming/Programming.md", hub), page(path, fixture)],
    new Map([
      ["Home/Programming/Programming.md", hub],
      [path, fixture],
    ]),
  )
  await harness.settle()

  const questions = questionSnapshot(harness)
  assert.equal(questions.length, 3)
  assert.match(questions[0].question, /> > \[!QUESTION\]- Nested answer example/)
  assert.match(questions[0].question, /Fenced answer example/)
  assert.doesNotMatch(questions[0].question, /Sibling card|Third card/)
  assert.match(questions[1].question, /Sibling card/)
  assert.doesNotMatch(questions[1].question, /Third card/)
  assert.match(questions[2].question, /Third card/)
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
