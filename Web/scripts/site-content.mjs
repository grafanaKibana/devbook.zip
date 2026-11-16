import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

function outsideGit(root) {
  const real = fs.realpathSync(root)
  if (real !== path.resolve(root)) throw new Error("Snapshot parent must not traverse symlinks")
  for (let current = real; ; current = path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, ".git")) ||
      fs.existsSync(path.join(current, ".gitignore"))
    )
      throw new Error("Snapshot parent must be outside Git and ancestor ignore policy")
    if (path.dirname(current) === current) break
  }
  return real
}

export function snapshotContent(source, parent = fs.realpathSync(os.tmpdir())) {
  outsideGit(parent)
  if (
    fs.realpathSync(source) !== path.resolve(source) ||
    !fs.lstatSync(source).isDirectory() ||
    fs.lstatSync(source).isSymbolicLink()
  )
    throw new Error("Content input must be a regular directory")
  const directory = fs.mkdtempSync(path.join(parent, "devbook-quartz-content-"))
  const cleanup = () => fs.rmSync(directory, { recursive: true, force: true })
  let markdownCount = 0
  function copy(from, to) {
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      if ([".git", ".gitignore"].includes(entry.name))
        throw new Error("Content must not contain Git policy")
      const input = path.join(from, entry.name)
      const output = path.join(to, entry.name)
      const stat = fs.lstatSync(input)
      if (stat.isSymbolicLink())
        throw new Error("Content must contain only regular files and directories")
      if (stat.isDirectory()) {
        fs.mkdirSync(output)
        copy(input, output)
      } else if (stat.isFile()) {
        if (entry.name.endsWith(".md")) {
          if (fs.readFileSync(input, "utf8").trim().length === 0)
            throw new Error("Content contains empty Markdown")
          markdownCount++
        }
        fs.copyFileSync(input, output, fs.constants.COPYFILE_EXCL)
        fs.chmodSync(output, stat.mode & 0o777)
        fs.utimesSync(output, stat.atimeMs / 1000, stat.mtimeMs / 1000)
      } else throw new Error("Content must contain only regular files and directories")
    }
  }
  try {
    copy(source, directory)
    if (markdownCount === 0) throw new Error("Content contains no Markdown notes")
    return { directory, markdownCount, cleanup }
  } catch (error) {
    cleanup()
    throw error
  }
}

export function quartzArguments(mode, forwarded, directory, output) {
  if (!["build", "serve"].includes(mode)) throw new Error("Expected build or serve")
  const options = new Map()
  for (let i = 0; i < forwarded.length; i += 2) {
    const key = forwarded[i]
    if (!["--port", "--wsPort", "--concurrency"].includes(key))
      throw new Error(`Unsupported argument: ${key}`)
    if (options.has(key)) throw new Error(`Duplicate argument: ${key}`)
    const value = forwarded[i + 1]
    if (!/^[1-9]\d*$/.test(value ?? "") || Number(value) > 65535)
      throw new Error(`Invalid value for ${key}`)
    options.set(key, value)
  }
  if (mode === "serve") {
    if (!options.has("--port")) options.set("--port", "8085")
    if (!options.has("--wsPort")) options.set("--wsPort", "3002")
  }
  return [
    "./quartz/bootstrap-cli.mjs",
    "build",
    "--directory",
    directory,
    "--output",
    output,
    ...(mode === "serve" ? ["--serve"] : []),
    ...Array.from(options).flat(),
  ]
}

export function validateOutput(output, log, expected) {
  const parsed = [...log.matchAll(/Parsed (\d+) Markdown files/g)]
  if (parsed.length === 0 || Number(parsed[0][1]) === 0)
    throw new Error("Quartz processed zero Markdown notes")
  if (Number(parsed[0][1]) !== expected)
    throw new Error(`Quartz parsed ${parsed[0][1]} notes; expected ${expected}`)
  const index = path.join(output, "static/contentIndex.json")
  if (!fs.existsSync(index)) throw new Error("Quartz content index is missing")
  const entries = Object.entries(JSON.parse(fs.readFileSync(index, "utf8")))
  if (entries.length === 0) throw new Error("Quartz emitted no indexed notes")
  for (const [slug] of entries) {
    if (
      !slug ||
      slug.split("/").some((part) => ["..", ".", ""].includes(part)) ||
      path.isAbsolute(slug) ||
      slug.includes("\\")
    )
      throw new Error("Quartz emitted an unsafe note slug")
    const page = path.join(output, `${slug}.html`)
    if (!fs.existsSync(page) || !/<(?:article|main)\b/.test(fs.readFileSync(page, "utf8")))
      throw new Error(`Quartz indexed note HTML is missing or empty: ${slug}`)
  }
  if (!fs.existsSync(path.join(output, "index.html")))
    throw new Error("Quartz homepage index.html is missing")
  return { parsed: expected, pages: entries.length }
}

export async function run(
  mode,
  forwarded,
  web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
) {
  const snapshot = snapshotContent(path.join(web, "content"), process.env.DEVBOOK_QUARTZ_TEMP_ROOT)
  let child
  let log = ""
  let validated = false
  let failure
  let signal
  const stop = (received) => {
    signal = received
    child?.kill(received)
  }
  const handlers = new Map(["SIGINT", "SIGTERM"].map((name) => [name, () => stop(name)]))
  try {
    const args = quartzArguments(mode, forwarded, snapshot.directory, path.join(web, "public"))
    console.log(`Quartz content snapshot: ${snapshot.directory}`)
    for (const [name, handler] of handlers) process.on(name, handler)
    child = spawn(process.execPath, args, { cwd: web, stdio: ["ignore", "pipe", "pipe"] })
    const receive = (stream, chunk) => {
      stream.write(chunk)
      log = (log + chunk.toString()).slice(-2_000_000)
      if (mode === "serve" && !validated && /Started a Quartz server listening/.test(log)) {
        try {
          validateOutput(path.join(web, "public"), log, snapshot.markdownCount)
          validated = true
        } catch (error) {
          failure = error
          child.kill("SIGTERM")
        }
      }
    }
    child.stdout.on("data", (chunk) => receive(process.stdout, chunk))
    child.stderr.on("data", (chunk) => receive(process.stderr, chunk))
    const code = await new Promise((resolve, reject) => {
      child.once("error", reject)
      child.once("close", resolve)
    })
    if (failure) throw failure
    if (signal) return signal === "SIGINT" ? 130 : 143
    if (code !== 0) throw new Error(`Quartz exited with status ${code}`)
    validateOutput(path.join(web, "public"), log, snapshot.markdownCount)
    return 0
  } finally {
    for (const [name, handler] of handlers) process.off(name, handler)
    snapshot.cleanup()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv[2], process.argv.slice(3))
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
