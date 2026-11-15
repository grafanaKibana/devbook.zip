import test from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import esbuild from "esbuild"

const webRoot = fileURLToPath(new URL("../", import.meta.url))

// Exercise the real build/parser/watcher with an offline emitter, independent of site plugins.
async function bundleBuild(outfile: string) {
  await esbuild.build({
    stdin: {
      contents: `import build from "./quartz/build";
        import { Mutex } from "async-mutex";
        await build(JSON.parse(process.argv[2]), new Mutex(), () => {});`,
      resolveDir: webRoot,
    },
    outfile,
    bundle: true,
    sourcemap: true,
    platform: "node",
    format: "esm",
    packages: "external",
    loader: { ".scss": "text" },
    plugins: [
      {
        name: "test-config",
        setup(build) {
          build.onLoad({ filter: /\.inline\.(ts|js)$/ }, () => ({ contents: "", loader: "text" }))
          build.onResolve({ filter: /^(?:\.\.\/)+quartz$/ }, () => ({
            path: "config",
            namespace: "test",
          }))
          build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            resolveDir: webRoot,
            contents: `
            import fs from "node:fs/promises";
            import path from "node:path";
            import { toHtml } from "hast-util-to-html";
            import { Frontmatter } from "./quartz/plugins/builtins/frontmatter";
            export default {
              configuration: { frontmatter: {}, ignorePatterns: [], locale: "en-US", pageTitle: "Test" },
              plugins: { transformers: [Frontmatter()], filters: [], pageTypes: [], emitters: [{
                name: "TestPages",
                async *emit(ctx, content) {
                  await fs.mkdir(ctx.argv.output, { recursive: true });
                  for (const [tree, file] of content) {
                    const output = path.join(ctx.argv.output, file.data.slug + ".html");
                    await fs.mkdir(path.dirname(output), { recursive: true });
                    await fs.writeFile(output, toHtml(tree));
                    yield output;
                  }
                  await fs.writeFile(path.join(ctx.argv.output, "addresses.json"), JSON.stringify({
                    slugs: ctx.allSlugs,
                    pages: content.map(([, file]) => ({ slug: file.data.slug, aliases: file.data.aliases })),
                  }));
                  yield "addresses.json";
                },
              }] },
            };`,
          }))
        },
      },
    ],
  })
}

function build(bundle: string, directory: string, output: string, watch = false) {
  const child = spawn(
    process.execPath,
    [
      bundle,
      JSON.stringify({
        directory,
        output,
        watch,
        concurrency: 1,
        verbose: false,
        serve: false,
      }),
    ],
    {
      cwd: webRoot,
      env: { ...process.env, CHOKIDAR_USEPOLLING: "true", CHOKIDAR_INTERVAL: "100" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  )
  let log = ""
  child.stdout.on("data", (chunk) => (log += chunk))
  child.stderr.on("data", (chunk) => (log += chunk))
  const exited = once(child, "close")
  return {
    child,
    exited,
    log: () => log,
    async waitFor(message: string, from = 0) {
      const deadline = Date.now() + 30_000
      while (!log.slice(from).includes(message)) {
        assert.equal(child.exitCode, null, log)
        assert(Date.now() < deadline, `Timed out waiting for ${message}\n${log}`)
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    },
  }
}

test("output cleanup and incremental permalink publication", { timeout: 90_000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "quartz-build-"))
  // Keep external package resolution rooted in Web/node_modules.
  const cache = await fs.mkdtemp(path.join(webRoot, ".quartz-cache-test-"))
  const bundle = path.join(cache, "build.mjs")
  const directory = path.join(root, "content")
  const output = path.join(root, "public")
  await fs.mkdir(directory)
  await fs.writeFile(path.join(directory, "index.md"), "# Home")
  try {
    await bundleBuild(bundle)
    await t.test(
      "rejects symlink output, including trailing slashes, without touching its target",
      async () => {
        const target = path.join(root, "unrelated")
        await fs.mkdir(path.join(target, "nested"), { recursive: true })
        await fs.writeFile(path.join(target, "nested", "keep.txt"), "unrelated data")
        await fs.symlink(target, output, "dir")
        for (const linkedOutput of [output, output + path.sep]) {
          const run = build(bundle, directory, linkedOutput)
          assert.notEqual((await run.exited)[0], 0, run.log())
          assert.match(run.log(), /Refusing to clean symbolic link output directory/)
          assert.equal(
            await fs.readFile(path.join(target, "nested", "keep.txt"), "utf8"),
            "unrelated data",
          )
          assert((await fs.lstat(output)).isSymbolicLink())
        }
        await fs.unlink(output)
      },
    )

    await t.test("creates missing output and cleans an existing directory in place", async () => {
      const first = build(bundle, directory, output)
      assert.equal((await first.exited)[0], 0, first.log())
      assert.match(await fs.readFile(path.join(output, "index.html"), "utf8"), /Home/)
      const inode = (await fs.stat(output)).ino
      await fs.mkdir(path.join(output, "stale"))
      await fs.writeFile(path.join(output, "stale", "old.txt"), "obsolete")
      const second = build(bundle, directory, output)
      assert.equal((await second.exited)[0], 0, second.log())
      assert.equal((await fs.stat(output)).ino, inode)
      await assert.rejects(fs.stat(path.join(output, "stale")), { code: "ENOENT" })
    })

    await t.test(
      "publishes added and changed permalinks on their first rebuild, retaining aliases",
      async () => {
        const run = build(bundle, directory, output, true)
        const addresses = async () =>
          JSON.parse(await fs.readFile(path.join(output, "addresses.json"), "utf8"))
        try {
          await run.waitFor("using polling (ready)")
          let from = run.log().length
          const note = path.join(directory, "note.md")
          await fs.writeFile(
            note,
            "---\npermalink: first-address\naliases: [extra-address]\n---\n# First version",
          )
          await run.waitFor("Done rebuilding", from)
          assert.match(
            await fs.readFile(path.join(output, "first-address.html"), "utf8"),
            /First version/,
          )
          assert((await addresses()).slugs.includes("extra-address"))
          assert((await addresses()).slugs.includes("note"))
          await assert.rejects(fs.stat(path.join(output, "note.html")), { code: "ENOENT" })

          from = run.log().length
          await fs.writeFile(
            note,
            "---\npermalink: second-address\naliases: [extra-address]\n---\n# Second version",
          )
          await run.waitFor("Done rebuilding", from)
          assert.match(
            await fs.readFile(path.join(output, "second-address.html"), "utf8"),
            /Second version/,
          )
          assert((await addresses()).slugs.includes("extra-address"))
          assert.deepEqual(
            (await addresses()).pages.find(
              (page: { slug: string }) => page.slug === "second-address",
            ).aliases,
            ["extra-address", "note"],
          )

          from = run.log().length
          await fs.unlink(note)
          await run.waitFor("Done rebuilding", from)
          assert.deepEqual(
            (await addresses()).pages.map((page: { slug: string }) => page.slug),
            ["index"],
          )
          assert(!(await addresses()).slugs.includes("second-address"))
        } finally {
          run.child.kill()
          await run.exited
        }
      },
    )
  } finally {
    await fs.rm(root, { recursive: true, force: true })
    await fs.rm(cache, { recursive: true, force: true })
  }
})
