import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  snapshotContent,
  validateOutput,
  quartzArguments,
} from "../../Web/scripts/site-content.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "devbook-content-test-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("exit-zero shell-only output is rejected even when it contains many assets", (t) => {
  const root = fixture(t);
  for (let i = 0; i < 94; i++)
    fs.writeFileSync(path.join(root, `${i}.js`), "shell");
  assert.throws(
    () => validateOutput(root, "Parsed 0 Markdown files in 1ms", 400),
    /Markdown/,
  );
  assert.throws(
    () => validateOutput(root, "Parsed 400 Markdown files in 1ms", 400),
    /index/,
  );
});

test("snapshot preserves nested names, bytes and file times outside ignored ancestors", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "source/nested"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "source/index.md"),
    "---\ntitle: Home\n---\nbody",
  );
  const source = path.join(root, "source/nested/Unicode Ω.bin");
  const bytes = Buffer.from([0, 255, 128, 42]);
  fs.writeFileSync(source, bytes);
  const date = new Date("2020-01-02T03:04:05Z");
  fs.utimesSync(
    source,
    date.getTime() / 1000 + 0.000123,
    date.getTime() / 1000 + 0.000123,
  );
  const snapshot = snapshotContent(path.join(root, "source"));
  t.after(snapshot.cleanup);
  assert.equal(snapshot.markdownCount, 1);
  assert.deepEqual(
    fs.readFileSync(path.join(snapshot.directory, "nested/Unicode Ω.bin")),
    bytes,
  );
  assert.ok(
    Math.abs(
      fs.statSync(path.join(snapshot.directory, "nested/Unicode Ω.bin"))
        .mtimeMs - fs.statSync(source).mtimeMs,
    ) < 0.01,
  );
  assert.notEqual(path.dirname(snapshot.directory), root);
});

test("symlinks, empty Markdown, and Git ignore policy in inputs fail closed", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.md"), "");
  assert.throws(() => snapshotContent(root), /empty Markdown/);
  fs.writeFileSync(path.join(root, "index.md"), "body");
  fs.symlinkSync(path.join(root, "index.md"), path.join(root, "link.md"));
  assert.throws(() => snapshotContent(root), /regular/);
  fs.unlinkSync(path.join(root, "link.md"));
  fs.writeFileSync(path.join(root, ".gitignore"), "*");
  assert.throws(() => snapshotContent(root), /policy/);
});

test("serve uses one caller port and fixed owned content/output arguments", () => {
  const args = quartzArguments(
    "serve",
    ["--port", "8091"],
    "/tmp/input",
    "/web/public",
  );
  assert.equal(args.filter((value) => value === "--port").length, 1);
  assert.ok(args.includes("8091"));
  assert.ok(
    quartzArguments("serve", [], "/tmp/input", "/web/public").includes("8085"),
  );
  assert.throws(
    () =>
      quartzArguments("build", ["-d", "other"], "/tmp/input", "/web/public"),
    /Unsupported/,
  );
  assert.throws(
    () =>
      quartzArguments(
        "serve",
        ["--port", "80", "--port", "81"],
        "/tmp/input",
        "/web/public",
      ),
    /Duplicate/,
  );
});

test("positive parse logs still require real indexed page HTML and homepage", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "static"));
  fs.writeFileSync(
    path.join(root, "static/contentIndex.json"),
    JSON.stringify({ index: { slug: "index", content: "body" } }),
  );
  assert.throws(
    () => validateOutput(root, "Parsed 1 Markdown files", 1),
    /index/,
  );
  fs.writeFileSync(
    path.join(root, "index.html"),
    "<html><body><article>body</article></body></html>",
  );
  assert.equal(validateOutput(root, "Parsed 1 Markdown files", 1).pages, 1);
  assert.throws(
    () => validateOutput(root, "Parsed 1 Markdown files", 2),
    /expected/,
  );
});

test("standalone serve forwards SIGTERM, preserves its parent, and removes only its own snapshot", async (t) => {
  const { spawn } = await import("node:child_process");
  const { pathToFileURL } = await import("node:url");
  const root = fixture(t);
  const web = path.join(root, "web");
  const parent = path.join(root, "temporary");
  fs.mkdirSync(path.join(web, "content"), { recursive: true });
  fs.mkdirSync(path.join(web, "quartz"));
  fs.mkdirSync(parent);
  fs.writeFileSync(path.join(parent, "keep"), "untouched");
  fs.writeFileSync(path.join(web, "content/index.md"), "body");
  fs.writeFileSync(
    path.join(web, "quartz/bootstrap-cli.mjs"),
    `
    import fs from "node:fs";
    const output = process.argv[process.argv.indexOf("--output") + 1];
    fs.mkdirSync(output + "/static", {recursive:true});
    fs.writeFileSync(output + "/static/contentIndex.json", JSON.stringify({index:{content:"body"}}));
    fs.writeFileSync(output + "/index.html", "<article>body</article>");
    console.log("Parsed 1 Markdown files");
    console.log("Started a Quartz server listening");
    setInterval(() => {}, 1000);
  `,
  );
  const module = pathToFileURL(
    path.resolve("Web/scripts/site-content.mjs"),
  ).href;
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import {run} from ${JSON.stringify(module)};process.exitCode=await run("serve",[],${JSON.stringify(web)});`,
    ],
    { env: { ...process.env, DEVBOOK_QUARTZ_TEMP_ROOT: parent } },
  );
  t.after(() => child.kill("SIGKILL"));
  let log = "";
  const started = new Promise((resolve) =>
    child.stdout.on("data", (data) => {
      log += data;
      if (log.includes("Started a Quartz server listening")) resolve();
    }),
  );
  const exited = new Promise((resolve) => child.once("close", resolve));
  await started;
  child.kill("SIGTERM");
  assert.equal(await exited, 143);
  assert.equal(fs.readFileSync(path.join(parent, "keep"), "utf8"), "untouched");
  assert.deepEqual(fs.readdirSync(parent), ["keep"]);
});

test("snapshot rejects Git-influenced temporary parents and symlink input ancestors", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "source"));
  fs.writeFileSync(path.join(root, "source/index.md"), "body");
  fs.mkdirSync(path.join(root, "parent/child"), { recursive: true });
  fs.writeFileSync(path.join(root, "parent/.gitignore"), "*.md");
  assert.throws(
    () =>
      snapshotContent(
        path.join(root, "source"),
        path.join(root, "parent/child"),
      ),
    /outside Git/,
  );
  fs.symlinkSync(path.join(root, "source"), path.join(root, "linked"));
  assert.throws(
    () => snapshotContent(path.join(root, "linked")),
    /regular directory/,
  );
});
