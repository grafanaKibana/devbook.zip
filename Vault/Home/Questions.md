---
tags:
  - FolderNote
  - MetricsIgnore
publish: true
---

```datacorejsx
// Questions index — Datacore port of the former DataviewJS aggregation (issue #69).
// Walks every note under this folder, pulls out the `[!QUESTION]` callouts, and
// renders them grouped by sub-folder with a table of contents on top. Uses the
// Datacore `dc` API (useCurrentPath / useQuery / Markdown) in place of Dataview's
// `dv`; the callout extraction is byte-for-byte the same so Obsidian output is
// unchanged.
//
// The `dc-questions-index` wrapper class is a deliberate strip-target: on the
// published Quartz site this page is rendered by the QuestionsIndex component
// (fed by the question-collector transformer), so SyncerFixups removes this
// block's frozen output by that class to avoid a double render. In Obsidian the
// class is inert.
return function QuestionsIndex() {
  const currentPath = dc.useCurrentPath();
  const ROOT = currentPath.includes("/")
    ? currentPath.slice(0, currentPath.lastIndexOf("/"))
    : "";

  // Every page under ROOT. `useIndexUpdates` bumps on any index change (including
  // edits to a note's callouts), so the tree re-loads live like Dataview did.
  const pages = dc.useQuery(`@page and path("${ROOT}")`);
  const indexRevision = dc.useIndexUpdates();

  const [tree, setTree] = dc.useState(null);
  // id -> heading element; TOC links scroll to these (see tocLink).
  const headingRefs = dc.useRef({});

  dc.useEffect(() => {
    let cancelled = false;
    (async () => {
      // Each node has children (sub-folders) and items (callouts).
      const root = { children: {}, items: [] };
      for (const page of pages) {
        const path = page.$path;
        const name = path.split("/").pop().replace(/\.md$/, "");
        if (name === "Questions") continue;

        const file = dc.app.vault.getAbstractFileByPath(path);
        if (!file) continue;
        let content;
        try {
          content = await dc.app.vault.cachedRead(file);
        } catch (e) {
          continue;
        }
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

        const folder = path.slice(0, path.lastIndexOf("/"));
        const parts = folder
          .replace(new RegExp("^" + ROOT + "/?"), "")
          .split("/")
          .filter(Boolean);

        let node = root;
        for (let d = 0; d < parts.length && d < 6; d++) {
          const key = parts[d];
          if (!node.children[key]) node.children[key] = { children: {}, items: [] };
          node = node.children[key];
        }
        for (const block of callouts) {
          node.items.push({ block, source: name, path });
        }
      }
      if (!cancelled) setTree(root);
    })();
    return () => {
      cancelled = true;
    };
  }, [indexRevision, currentPath, ROOT]);

  // --- Helpers ---
  const countItems = (node) => {
    let n = node.items.length;
    for (const child of Object.values(node.children)) n += countItems(child);
    return n;
  };
  const toId = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const sortedKeys = (obj) =>
    Object.keys(obj).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Always render the wrapper so SyncerFixups has a stable strip target even
  // before the async load resolves (and so nothing flashes on first paint).
  if (!tree) return <div class="dc-questions-index" />;

  const total = countItems(tree);

  // `#id` anchors don't resolve against DOM ids inside Obsidian, so wire each
  // TOC link to scrollIntoView on the real heading element; href keeps native
  // anchor scrolling on the published web build.
  const tocLink = (label, id) => (
    <a
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault();
        headingRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {label}
    </a>
  );

  // --- Content tree: regular headings + rendered callouts ---
  const renderTree = (node, depth, idPrefix) => {
    const out = [];
    for (const key of sortedKeys(node.children)) {
      const child = node.children[key];
      const level = Math.min(depth, 6);
      const curId = idPrefix ? idPrefix + "-" + toId(key) : toId(key);
      const setId = depth <= 2;
      const Heading = `h${level}`;

      out.push(
        <Heading
          key={curId + "::h"}
          id={setId ? curId : undefined}
          ref={setId ? (el) => { if (el) headingRefs.current[curId] = el; } : undefined}
        >
          {key}
        </Heading>,
      );

      child.items.forEach((item, ci) => {
        const src = `*[${item.source}](${encodeURI(item.path)})*`;
        const md = item.block + "\n> " + src;
        out.push(
          <dc.Markdown
            key={curId + "::i" + ci}
            content={md}
            inline={false}
            sourcePath={currentPath}
          />,
        );
      });

      out.push(...renderTree(child, depth + 1, depth <= 1 ? curId : ""));
    }
    return out;
  };

  return (
    <div class="dc-questions-index">
      <h1>Table of Contents</h1>
      <h2>Total questions: {total}</h2>
      <ul>
        {sortedKeys(tree.children).map((h1Key) => {
          const h1Node = tree.children[h1Key];
          const h1Id = toId(h1Key);
          const h2Keys = sortedKeys(h1Node.children);
          return (
            <li key={h1Id}>
              <strong>
                {tocLink(h1Key, h1Id)} ({countItems(h1Node)})
              </strong>
              {h2Keys.length > 0 && (
                <ul>
                  {h2Keys.map((h2Key) => {
                    const h2Id = h1Id + "-" + toId(h2Key);
                    return (
                      <li key={h2Id}>
                        {tocLink(h2Key, h2Id)} ({countItems(h1Node.children[h2Key])})
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <hr />
      {renderTree(tree, 1, "")}
    </div>
  );
}
```
