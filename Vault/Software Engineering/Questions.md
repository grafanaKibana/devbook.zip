---
tags:
  - FolderNote
  - MetricsIgnore
dg-publish: true
---

```dataviewjs
const { MarkdownRenderer } = require("obsidian");

const pages = dv.pages('"Software Engineering"')
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

  const parts = page.file.folder.replace(/^Software Engineering\/?/, "").split("/").filter(Boolean);

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

// --- Build TOC (H1 + H2 levels) ---
const tocLines = [];
for (const h1Key of sortedKeys(tree.children)) {
  const h1Node = tree.children[h1Key];
  const h1Count = countItems(h1Node);
  tocLines.push(`- **[${h1Key}](#${toId(h1Key)})** (${h1Count})`);
  for (const h2Key of sortedKeys(h1Node.children)) {
    const h2Count = countItems(h1Node.children[h2Key]);
    tocLines.push(`    - [${h2Key}](#${toId(h1Key + "-" + h2Key)}) (${h2Count})`);
  }
}

const total = countItems(tree);
dv.paragraph(`**Total questions: ${total}**`);
dv.header(2, "Table of Contents");
dv.paragraph(tocLines.join("\n"));
dv.el("hr", "");

// --- Render callouts for a node ---
function renderItems(items) {
  for (const item of items) {
    const src = `*[${item.source}](${encodeURI(item.path)})*`;
    dv.paragraph(item.block + "\n> " + src);
  }
}

// --- Render H3–H6 (regular headers, not foldable) ---
function renderDeep(node, depth) {
  for (const key of sortedKeys(node.children)) {
    const child = node.children[key];
    const level = Math.min(depth, 6);
    dv.header(level, key);
    renderItems(child.items);
    renderDeep(child, depth + 1);
  }
}

// --- Render tree with regular headings ---
async function renderTree(node, depth, parentEl, idPrefix) {
  for (const key of sortedKeys(node.children)) {
    const child = node.children[key];
    const level = Math.min(depth, 6);
    const curId = idPrefix ? idPrefix + "-" + toId(key) : toId(key);

    const heading = parentEl.createEl(`h${level}`, { text: key });
    if (depth <= 2) heading.id = curId;

    for (const item of child.items) {
      const src = `*[${item.source}](${encodeURI(item.path)})*`;
      const md = item.block + "\n> " + src;
      await MarkdownRenderer.render(app, md, parentEl.createDiv(), "", dv.component);
    }
    await renderTree(child, depth + 1, parentEl, depth <= 1 ? curId : "");
  }
}

await renderTree(tree, 1, dv.container, "");
```

<!-- whats-next:start -->

---

> [!note] Whats next
> **Topics**
> - [[Software Engineering/01 Programming/01 Programming|01 Programming]]
> - [[Software Engineering/02 Computer Science/02 Computer Science|02 Computer Science]]
> - [[Software Engineering/03 Data Persistence/03 Data Persistence|03 Data Persistence]]
> - [[Software Engineering/04 Networks/04 Networks|04 Networks]]
> - [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
> - [[Software Engineering/06 Development Practices/06 Development Practices|06 Development Practices]]
> - [[Software Engineering/07 Security/07 Security|07 Security]]
> - [[Software Engineering/08 SDLC/08 SDLC|08 SDLC]]
> - [[Software Engineering/09 DevOps/09 DevOps|09 DevOps]]
> - [[Software Engineering/10 Cloud/10 Cloud|10 Cloud]]
> - [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
<!-- whats-next:end -->
