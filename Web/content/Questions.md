---
publish: true
created: 2026-07-05T13:17:51.659Z
modified: 2026-07-08T14:32:33.428Z
published: 2026-07-08T14:32:33.428Z
tags:
  - FolderNote
  - MetricsIgnore
---

```dataviewjs
const { MarkdownRenderer } = require("obsidian");
const ROOT = dv.current().file.folder;

const pages = dv.pages('"' + ROOT + '"')
  .where(p => p.file.name !== "Questions");

// Build a tree: each node has children (sub-folders) and items (callouts)
const tree = { children: {}, items: [] };

for (const page of pages) {
  const content = await dv.io.load(page.file.path);
  if (!content) continue;

  const lines = content.split("\n");
  const callouts = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^>\s*\[!QUESTION\]/i.test(lines[i])) {
      let block = lines[i];
      let j = i + 1;
      while (j < lines.length && /^>/.test(lines[j])) {
        block += "\n" + lines[j];
        j++;
      }
      callouts.push(block);
      i = j - 1;
    }
  }
  if (callouts.length === 0) continue;

  const parts = page.file.folder.replace(new RegExp("^" + ROOT + "/?"), "").split("/").filter(Boolean);

  let node = tree;
  for (let d = 0; d < parts.length && d < 6; d++) {
    const key = parts[d];
    if (!node.children[key]) node.children[key] = { children: {}, items: [] };
    node = node.children[key];
  }
  for (const block of callouts) {
    node.items.push({
      block,
      source: page.file.name,
      path: page.file.path
    });
  }
}

// --- Helpers ---
function countItems(node) {
  let n = node.items.length;
  for (const child of Object.values(node.children)) n += countItems(child);
  return n;
}

function toId(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function sortedKeys(obj) {
  return Object.keys(obj).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

const total = countItems(tree);

// TOC is filled in after the content is rendered, so it can reference the
// real heading elements. It still lives above the content in the DOM.
const tocEl = dv.container.createDiv();
const contentEl = dv.container.createDiv();

// id -> heading element, populated while rendering the tree below.
const headingMap = {};

// --- Render tree with regular headings ---
async function renderTree(node, depth, parentEl, idPrefix) {
  for (const key of sortedKeys(node.children)) {
    const child = node.children[key];
    const level = Math.min(depth, 6);
    const curId = idPrefix ? idPrefix + "-" + toId(key) : toId(key);

    const heading = parentEl.createEl(`h${level}`, { text: key });
    if (depth <= 2) {
      heading.id = curId;
      headingMap[curId] = heading;
    }

    for (const item of child.items) {
      const src = `*[${item.source}](${encodeURI(item.path)})*`;
      const md = item.block + "\n> " + src;
      await MarkdownRenderer.render(app, md, parentEl.createDiv(), "", dv.component);
    }
    await renderTree(child, depth + 1, parentEl, depth <= 1 ? curId : "");
  }
}

await renderTree(tree, 1, contentEl, "");

// --- Build TOC (H1 + H2 levels) now that the headings exist ---
// Use the same id scheme as the headings (toId(h1) + "-" + toId(h2)) and wire
// each link to scrollIntoView so it works inside Obsidian, where [](#id) links
// resolve against the heading cache rather than DOM ids. The href="#id" keeps
// native anchor scrolling working on the published web build.
function tocLink(parent, label, id) {
  const a = parent.createEl("a", { text: label, href: `#${id}` });
  a.addEventListener("click", (e) => {
    e.preventDefault();
    headingMap[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  return a;
}

tocEl.createEl("h1", { text: `Table of Contents` });
tocEl.createEl("h2", { text: `Total questions: ${total}` });

const tocList = tocEl.createEl("ul");
for (const h1Key of sortedKeys(tree.children)) {
  const h1Node = tree.children[h1Key];
  const h1Id = toId(h1Key);

  const li = tocList.createEl("li");
  const strong = li.createEl("strong");
  tocLink(strong, h1Key, h1Id);
  strong.appendText(` (${countItems(h1Node)})`);

  const h2Keys = sortedKeys(h1Node.children);
  if (h2Keys.length === 0) continue;
  const subList = li.createEl("ul");
  for (const h2Key of h2Keys) {
    const h2Id = h1Id + "-" + toId(h2Key);
    const li2 = subList.createEl("li");
    tocLink(li2, h2Key, h2Id);
    li2.appendText(` (${countItems(h1Node.children[h2Key])})`);
  }
}
tocEl.createEl("hr");
```
