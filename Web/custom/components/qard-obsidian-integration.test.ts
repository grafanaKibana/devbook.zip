import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const REPO_ROOT = join(import.meta.dirname, "../../..")
const TEMPLATE_PATH = join(REPO_ROOT, "Vault/Templates/Blocks/Template - Callout.md")
const templateSource = readFileSync(TEMPLATE_PATH, "utf8")

type RunOptions = {
  callout?: string | null
  fold?: string | null
  title?: string | null
  answer?: string | null
  selection?: string
  clipboard?: string
  clipboardState?: "rejects" | "unavailable"
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
  let clipboardCalls = 0
  const notices: string[] = []
  const promptValues = [options.title, options.answer]
  const suggestionValues = [options.callout, options.fold]
  const tp = {
    system: {
      suggester: async () => suggestionValues.shift() ?? null,
      prompt: async () => promptValues.shift() ?? null,
      clipboard:
        options.clipboardState === "unavailable"
          ? undefined
          : async () => {
              clipboardCalls++
              if (options.clipboardState === "rejects")
                throw new Error("Clipboard permission denied")
              return options.clipboard ?? ""
            },
    },
    file: {
      path: () => {
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
  return { metadata, notices, output, processCalls, clipboardCalls }
}

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

test("interview Qard rejects incomplete input, invalid identity and unsupported files atomically", async () => {
  const invalid: RunOptions[] = [
    { title: null },
    { answer: null },
    { title: "   " },
    { answer: "  \n " },
    { title: "Question\nInjected answer" },
    { title: "<!-- hidden -->" },
    { answer: "<!-- qard-answer -->\n%% hidden %%" },
    { frontmatter: { "qard-deck": ["invalid"] } },
    { path: "Templates/Scratch.md" },
    { activePath: "Home/Programming/Other.md" },
  ]
  for (const options of invalid) {
    const result = await runTemplate({
      callout: "__qard__",
      title: "Question",
      answer: "Answer",
      ...options,
    })
    assert.equal(result.output, "", JSON.stringify(options))
    assert.equal(result.processCalls, 0)
    assert.deepEqual(result.metadata, options.frontmatter ?? {})
  }
  const drift = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "Answer",
    activePaths: [
      "Home/Programming/NET/C#/Async.md",
      "Home/Programming/NET/C#/Async.md",
      "Home/Programming/Other.md",
    ],
  })
  assert.equal(drift.output, "")
  assert.equal(drift.processCalls, 1)
  assert.deepEqual(drift.metadata, {})
  assert.match(drift.notices.join("\n"), /active note changed/i)
  const failure = await runTemplate({
    callout: "__qard__",
    title: "Question",
    answer: "Answer",
    processFrontMatterError: new Error("simulated API failure"),
  })
  assert.equal(failure.output, "")
  assert.equal(failure.processCalls, 1)
  assert.match(failure.notices.join("\n"), /metadata could not be updated/i)
  assert.doesNotMatch(failure.notices.join("\n"), /active note changed/i)
})

test("selected content never accesses a rejected or unavailable clipboard", async () => {
  for (const callout of ["question", "__qard__"]) {
    for (const clipboardState of ["rejects", "unavailable"] as const) {
      const result = await runTemplate({
        callout,
        fold: "-",
        title: "Question",
        selection: "Selected answer",
        clipboardState,
      })
      assert.match(result.output, /\n> Selected answer$/)
      assert.equal(result.clipboardCalls, 0)
      assert.equal(result.processCalls, callout === "__qard__" ? 1 : 0)
    }
  }
})

test("interview Qard rejects a reserved answer divider before any metadata write", async () => {
  for (const source of ["answer", "selection", "clipboard"] as const) {
    for (const answer of [
      "Visible answer\n<!-- qard-answer -->\nRemainder",
      "Visible answer\r\n  <!-- qard-answer -->  \r\nRemainder",
      "```text\nExample\n```\n<!-- qard-answer -->\nRemainder",
      "~~~~text\nExample\n~~~~~\n<!-- qard-answer -->\nRemainder",
    ]) {
      const result = await runTemplate({ callout: "__qard__", title: "Question", [source]: answer })
      assert.equal(result.output, "", `${source}: ${answer}`)
      assert.equal(result.processCalls, 0)
      assert.deepEqual(result.metadata, {})
      assert.match(result.notices.join("\n"), /reserved.*qard-answer/i)
    }
  }
})

test("interview Qard preserves literal answer dividers inside native Qard fences", async () => {
  for (const answer of [
    "Visible answer\n```html\n<!-- qard-answer -->\n```",
    "Visible answer\n~~~~html\n<!-- qard-answer -->\n~~~~",
    "Visible answer\n````markdown\n```\n<!-- qard-answer -->\n`````",
    "Visible answer\n~~~markdown\n```\n<!-- qard-answer -->\n~~~",
    "Visible answer\n<!-- qard-answer --> inline example",
    "Visible answer\n`<!-- qard-answer -->`",
  ]) {
    const result = await runTemplate({ callout: "__qard__", title: "Question", answer })
    assert.equal(result.output, `> [!qard]- Question\n> ${answer.replaceAll("\n", "\n> ")}`)
    assert.equal(result.processCalls, 1)
  }
})

test("interview Qard rejects answer content that would create a sibling interview callout atomically", async () => {
  for (const source of ["answer", "selection", "clipboard"] as const) {
    for (const newline of ["\n", "\r\n"]) {
      for (const header of [
        "[!qard]- Another question",
        "[!QaRd]+ Another question",
        "[!QARD]",
        "[!qard]-",
        "[!question]- Another question",
        "[!QuEsTiOn]+ Another question",
        " [!question]- Another question",
        "\t[!question]",
        "  [!qard]- Another question",
        "\t[!qard]+ Another question",
      ]) {
        const answer = ["First answer.", header, "Second answer."].join(newline)
        const result = await runTemplate({
          callout: "__qard__",
          title: "Question",
          [source]: answer,
        })
        assert.equal(result.output, "", `${source}: ${answer}`)
        assert.equal(result.processCalls, 0)
        assert.deepEqual(result.metadata, {})
        assert.match(result.notices.join("\n"), /reserved.*qard/i)
      }
    }
  }
})

test("interview Qard preserves fenced and nested quoted card-header examples", async () => {
  for (const answer of [
    "First answer.\n```markdown\n[!qard]- Example\n```",
    "First answer.\n~~~markdown\n[!QaRd]+ Example\n~~~",
    "First answer.\n````markdown\n```\n[!qard]- Example\n````",
    "First answer.\n> [!qard]- Nested example\n> Nested answer.",
    "First answer.\n> [!question]- Nested example\n> Nested answer.",
    "First answer.\n```markdown\n[!question]- Example\n```",
    "First answer.\n[!qard]-Not a native header",
    "First answer.\n`[!qard]- Example`",
  ]) {
    const result = await runTemplate({ callout: "__qard__", title: "Question", answer })
    assert.equal(result.output, `> [!qard]- Question\n> ${answer.replaceAll("\n", "\n> ")}`)
    assert.equal(result.processCalls, 1)
  }
})
