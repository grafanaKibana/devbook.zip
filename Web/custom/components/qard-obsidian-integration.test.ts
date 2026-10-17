import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const REPO_ROOT = join(import.meta.dirname, "../../..")
const TEMPLATE_PATH = join(REPO_ROOT, "Vault/Templates/Blocks/Template - Callout.md")
const CSS_PATH = join(REPO_ROOT, "Vault/.obsidian/snippets/question-margin-note.css")
const templateSource = readFileSync(TEMPLATE_PATH, "utf8")
const cssSource = readFileSync(CSS_PATH, "utf8")

type RunOptions = {
  callout?: string | null
  fold?: string | null
  title?: string | null
  answer?: string | null
  selection?: string
  clipboard?: string
  path?: string
  frontmatter?: Record<string, unknown>
  activePath?: string | null
  activePaths?: Array<string | null>
  processFrontMatterError?: Error
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...values: unknown[]) => Promise<string>

const runTemplate = async (options: RunOptions = {}) => {
  const script = /<%\*\n([\s\S]*?)\n%>/.exec(templateSource)?.[1]
  assert.ok(script, "callout template must expose one executable Templater script")

  const path = options.path ?? "Home/Programming/NET/C#/Async.md"
  const file = { path }
  const metadata = { ...(options.frontmatter ?? {}) }
  let processCalls = 0
  const notices: string[] = []
  const promptValues = [options.title, options.answer]
  const suggestionValues = [options.callout, options.fold]
  let pathReads = 0
  const tp = {
    system: {
      suggester: async () => suggestionValues.shift() ?? null,
      prompt: async () => promptValues.shift() ?? null,
      clipboard: async () => options.clipboard ?? "",
    },
    file: {
      path: () => {
        pathReads++
        return path
      },
      find_tfile: (candidate: string) => (candidate === path ? file : null),
      selection: () => options.selection ?? "",
    },
  }
  const activePath = options.activePath === undefined ? path : options.activePath
  const activePaths = options.activePaths ? [...options.activePaths] : undefined
  let lastActivePath = activePath
  const app = {
    workspace: {
      getActiveFile: () => {
        if (activePaths?.length) lastActivePath = activePaths.shift() ?? null
        return lastActivePath == null ? null : { path: lastActivePath }
      },
    },
    metadataCache: {
      getFileCache: () => ({ frontmatter: metadata }),
    },
    fileManager: {
      processFrontMatter: async (
        target: unknown,
        update: (fm: Record<string, unknown>) => void,
      ) => {
        assert.equal(target, file)
        processCalls++
        if (options.processFrontMatterError) throw options.processFrontMatterError
        update(metadata)
      },
    },
  }
  class Notice {
    constructor(message: string) {
      notices.push(message)
    }
  }
  const execute = new AsyncFunction("tp", "app", "tR", "Notice", `${script}\nreturn tR;`)
  const output = await execute(tp, app, "", Notice)
  return { metadata, notices, output, pathReads, processCalls }
}

test("keeps every generic choice and names generic Question distinctly from interview Qard", () => {
  const required = [
    "Abstract",
    "Attention",
    "Bug",
    "Caution",
    "Check",
    "Cite",
    "Danger",
    "Done",
    "Error",
    "Example",
    "Fail",
    "Failure",
    "FAQ",
    "Help",
    "Hint",
    "Important",
    "Info",
    "Missing",
    "Note",
    "Question (generic)",
    "Quote",
    "Success",
    "Summary",
    "Tip",
    "TLDR",
    "Todo",
    "Warning",
    "Interview Question (Qard)",
  ]
  for (const choice of required)
    assert.match(templateSource, new RegExp(`"${choice.replace(/[()]/g, "\\$&")}"`))
})

test("generic Question preserves fold, optional title, and selection-first body behavior", async () => {
  const result = await runTemplate({
    callout: "question",
    fold: "+",
    title: "Optional title",
    selection: "Selected line one\nSelected line two",
    clipboard: "ignored clipboard",
  })
  assert.equal(
    result.output,
    "> [!question]+ Optional title\n> Selected line one\n> Selected line two",
  )
  assert.equal(result.processCalls, 0)
})

test("interview Qard seeds only missing path-derived metadata and emits a collapsed card", async () => {
  const result = await runTemplate({
    callout: "__qard__",
    title: "What does ConfigureAwait change?",
    selection: "It changes continuation context capture.\nIt does not make work asynchronous.",
  })
  assert.equal(
    result.output,
    "> [!qard]- What does ConfigureAwait change?\n> It changes continuation context capture.\n> It does not make work asynchronous.",
  )
  assert.deepEqual(result.metadata, {
    "qard-deck": "Programming",
    "qard-topic": "NET/C#/Async",
  })
  assert.equal(result.processCalls, 1)
})

test("interview Qard preserves valid logical overrides independent of the file path", async () => {
  const result = await runTemplate({
    callout: "__qard__",
    title: "Logical organization?",
    answer: "Existing scalar overrides remain authoritative.",
    frontmatter: { "qard-deck": "Interview loop", "qard-topic": "Concurrency review" },
  })
  assert.deepEqual(result.metadata, {
    "qard-deck": "Interview loop",
    "qard-topic": "Concurrency review",
  })
  assert.equal(result.processCalls, 0)
  assert.match(result.output, /^> \[!qard\]-/)
})

test("interview Qard can use clipboard content and seeds only the missing property", async () => {
  const result = await runTemplate({
    callout: "__qard__",
    title: "Where can an answer come from?",
    clipboard: "Clipboard line one\nClipboard line two",
    frontmatter: { "qard-deck": "Custom deck" },
  })
  assert.equal(
    result.output,
    "> [!qard]- Where can an answer come from?\n> Clipboard line one\n> Clipboard line two",
  )
  assert.deepEqual(result.metadata, {
    "qard-deck": "Custom deck",
    "qard-topic": "NET/C#/Async",
  })
  assert.equal(result.processCalls, 1)
})

test("interview Qard preserves a legitimate .md suffix in the note basename", async () => {
  const result = await runTemplate({
    callout: "__qard__",
    title: "What is the topic seed?",
    answer: "The extension is removed exactly once.",
    path: "Home/Programming/Foo.md.md",
  })
  assert.equal(result.metadata["qard-topic"], "Foo.md")
})

test("interview Qard rejects cancellation, invalid metadata, and unsupported active files atomically", async () => {
  const cancelledTitle = await runTemplate({ callout: "__qard__", title: null })
  assert.equal(cancelledTitle.output, "")
  assert.equal(cancelledTitle.processCalls, 0)

  const cancelledAnswer = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: null,
  })
  assert.equal(cancelledAnswer.output, "")
  assert.equal(cancelledAnswer.processCalls, 0)

  const blankTitle = await runTemplate({ callout: "__qard__", title: "   " })
  assert.equal(blankTitle.output, "")
  assert.equal(blankTitle.processCalls, 0)

  const blankAnswer = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "  \n ",
  })
  assert.equal(blankAnswer.output, "")
  assert.equal(blankAnswer.processCalls, 0)

  const multilineTitle = await runTemplate({
    callout: "__qard__",
    title: "Question\nInjected answer",
    answer: "Answer",
  })
  assert.equal(multilineTitle.output, "")
  assert.equal(multilineTitle.processCalls, 0)

  const commentOnlyTitle = await runTemplate({
    callout: "__qard__",
    title: "<!-- hidden -->",
    answer: "Answer",
  })
  assert.equal(commentOnlyTitle.output, "")
  assert.equal(commentOnlyTitle.processCalls, 0)

  const commentOnlyAnswer = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "<!-- qard-answer -->\n%% hidden %%",
  })
  assert.equal(commentOnlyAnswer.output, "")
  assert.equal(commentOnlyAnswer.processCalls, 0)

  const invalidMetadata = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "Answer",
    frontmatter: { "qard-deck": ["invalid"] },
  })
  assert.equal(invalidMetadata.output, "")
  assert.equal(invalidMetadata.processCalls, 0)
  assert.deepEqual(invalidMetadata.metadata, { "qard-deck": ["invalid"] })

  const outsideHome = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "Answer",
    path: "Templates/Scratch.md",
  })
  assert.equal(outsideHome.output, "")
  assert.equal(outsideHome.processCalls, 0)

  const inactive = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "Answer",
    activePath: "Home/Programming/Other.md",
  })
  assert.equal(inactive.output, "")
  assert.equal(inactive.processCalls, 0)

  const driftDuringFrontmatter = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "Answer",
    activePaths: [
      "Home/Programming/NET/C#/Async.md",
      "Home/Programming/NET/C#/Async.md",
      "Home/Programming/Other.md",
    ],
  })
  assert.equal(driftDuringFrontmatter.output, "")
  assert.equal(driftDuringFrontmatter.processCalls, 1)
  assert.deepEqual(driftDuringFrontmatter.metadata, {})
  assert.match(driftDuringFrontmatter.notices.join("\n"), /active note changed/i)

  const unexpectedFailure = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "Answer",
    processFrontMatterError: new Error("simulated API failure"),
  })
  assert.equal(unexpectedFailure.output, "")
  assert.equal(unexpectedFailure.processCalls, 1)
  assert.match(unexpectedFailure.notices.join("\n"), /metadata could not be updated/i)
  assert.doesNotMatch(unexpectedFailure.notices.join("\n"), /active note changed/i)
})

test("shared Obsidian FAQ selectors cover legacy, Qard, and mixed adjacency", () => {
  assert.match(cssSource, /:is\(\[data-callout="question"\], \[data-callout="qard"\]\)/)
  assert.match(cssSource, /:has\(\s*\+ \.callout:is\(/)
  assert.match(cssSource, /\.callout:is\([^)]*qard[^)]*\)\.is-collapsed/)
  assert.doesNotMatch(cssSource, /^\.callout\[data-callout="question"\]/m)
})
