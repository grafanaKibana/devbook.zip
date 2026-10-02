---
title: Interview Questions
summary: Browse interview and review questions extracted from DevBook notes, grouped by topic.
tags: [FolderNote, MetricsIgnore]
publish: true
icon: circle-help
---

A topic-grouped index of interview and review questions across .NET, computer science, architecture, AI, data, networks, security, and engineering practice. Each answer links back to the note that establishes the underlying mechanism and tradeoffs.

```datacorejsx
// Questions index — Datacore port of the former DataviewJS aggregation (issue #69).
// Walks every note under this folder, pulls out the `[!QUESTION]` callouts, and
// presents one selected topic or subtopic at a time. Root topic order comes from
// FolderNote frontmatter, matching the Home dashboard; Tabsdown owns the tabs.
//
// Loading is parallel + progressive: the ~300 note reads run through a bounded
// worker pool, and partial results are flushed into the view in batches. Stable
// per-callout keys let Preact reuse already-rendered callouts. The chosen scope
// remains in state while an index refresh rebuilds the tree.
// Every topic's questions render during this initial scan; selection only hides
// existing panels and sections, so topic switches never start another read.
//
// The `dc-questions-index` wrapper class is a deliberate strip-target: on the
// published Quartz site this page is rendered by the QuestionsIndex component
// (fed by the question-collector transformer), so SyncerFixups removes this
// block's frozen output by that class to avoid a double render. In Obsidian the
// class is inert.
// Tabsdown moves its panels. Restore them before Preact patches this subtree,
// then mount again without leaving Datacore's Markdown rendering context.
class QuestionTopics extends dc.preact.Component {
  host = dc.preact.createRef();
  controller = null;
  focusedTopic = null;

  plugin() {
    return dc.app.plugins?.getPlugin("tabsdown");
  }

  mount() {
    const host = this.host.current;
    const plugin = this.plugin();
    if (!host || typeof plugin?.mountTabs !== "function") return;
    this.controller = plugin.mountTabs(host, {
      label: "Question topics",
      selection: this.props.selection,
      tabs: this.props.topics.map((topic) => ({
        id: topic.name,
        label: `${topic.label} (${topic.count})`,
        panel: Array.from(host.children).find((panel) => panel.dataset.topic === topic.name),
      })),
      onSelectionChange: (selection, previous) => {
        if (selection === null) this.controller.setSelection(previous);
        else this.props.onSelect(selection);
      },
    });
    if (this.focusedTopic) {
      const index = this.props.topics.findIndex((topic) => topic.name === this.focusedTopic);
      host.querySelectorAll(".tabsdown__tab")[index]?.focus();
      this.focusedTopic = null;
    }
  }

  componentDidMount() {
    this.mount();
  }

  componentWillUpdate() {
    const host = this.host.current;
    const active = host.getRootNode().activeElement ?? host.ownerDocument.activeElement;
    const index = Array.from(host.querySelectorAll(".tabsdown__tab")).indexOf(active);
    this.focusedTopic = this.props.topics[index]?.name ?? null;
    this.controller?.destroy();
    this.controller = null;
  }

  componentDidUpdate() {
    this.mount();
  }

  componentWillUnmount() {
    this.controller?.destroy();
    this.controller = null;
  }

  render({ children }) {
    return (
      <div class="dc-qi-tabs" ref={this.host}>
        {typeof this.plugin()?.mountTabs !== "function" ? (
          <p class="dc-qi-empty">Enable Tabsdown to switch topics.</p>
        ) : null}
        {children}
      </div>
    );
  }
}

return function QuestionsIndex() {
  const currentPath = dc.useCurrentPath();
  const ROOT = currentPath.includes("/")
    ? currentPath.slice(0, currentPath.lastIndexOf("/"))
    : "";

  const pages = dc.useQuery(`@page and path("${ROOT}")`);
  const indexRevision = dc.useIndexUpdates();
  const treeRef = dc.useRef({ children: {}, items: [] });
  const [version, setVersion] = dc.useState(0);
  const [done, setDone] = dc.useState(false);
  const [selectedTopic, setSelectedTopic] = dc.useState("");
  const [selectedPath, setSelectedPath] = dc.useState("");
  const scopeId = dc.useRef(`dc-qi-subtopic-${crypto.randomUUID()}`).current;

  const firstString = (value) =>
    Array.isArray(value)
      ? value.length ? String(value[0]).trim() : ""
      : value == null ? "" : String(value).trim();
  const hasTag = (page, tag) =>
    (page.$tags ?? []).some((value) => String(value).replace(/^#/, "") === tag);
  const countItems = (node) => {
    let count = node?.items?.length ?? 0;
    for (const child of Object.values(node?.children ?? {})) count += countItems(child);
    return count;
  };
  const sortedKeys = (object) =>
    Object.keys(object ?? {}).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  const nodeAt = (tree, path) => {
    let node = tree;
    for (const part of path.split("/").filter(Boolean)) {
      node = node?.children?.[part];
      if (!node) return null;
    }
    return node;
  };
  const plural = (count, singular) => `${count} ${singular}${count === 1 ? "" : "s"}`;

  const topicHubs = pages
    .filter((page) => {
      if (!hasTag(page, "FolderNote") || hasTag(page, "MetricsIgnore")) return false;
      return page.$path.slice(ROOT.length + 1).split("/").length === 2;
    })
    .sort((a, b) => {
      const orderA = Number(firstString(a.value("order")) || Number.MAX_SAFE_INTEGER);
      const orderB = Number(firstString(b.value("order")) || Number.MAX_SAFE_INTEGER);
      return orderA - orderB || a.$name.localeCompare(b.$name);
    })
    .map((page) => {
      const dir = page.$path.slice(0, page.$path.lastIndexOf("/"));
      return {
        name: dir.slice(ROOT.length + 1),
        label: page.$name,
      };
    });
  const topicSignature = topicHubs.map((topic) => topic.name).join("|");

  dc.useEffect(() => {
    let cancelled = false;
    setDone(false);

    // Keep the previous tree visible until the first new batch arrives.
    const root = { children: {}, items: [] };
    const targets = pages.filter(
      (page) => page.$path.split("/").pop().replace(/\.md$/, "") !== "Questions",
    );

    const insert = (path, name, callouts) => {
      const folder = path.slice(0, path.lastIndexOf("/"));
      const parts = folder
        .replace(new RegExp("^" + ROOT + "/?"), "")
        .split("/")
        .filter(Boolean);
      let node = root;
      for (const key of parts) {
        if (!node.children[key]) node.children[key] = { children: {}, items: [] };
        node = node.children[key];
      }
      callouts.forEach((block, index) =>
        node.items.push({ block, source: name, path, id: `${path}#${index}` }),
      );
    };

    const flush = () => {
      if (cancelled) return;
      treeRef.current = root;
      setVersion((current) => current + 1);
    };

    (async () => {
      const CONCURRENCY = 24;
      const FLUSH_EVERY = 24;
      let cursor = 0;
      let processed = 0;

      const worker = async () => {
        while (!cancelled && cursor < targets.length) {
          const path = targets[cursor++].$path;
          const name = path.split("/").pop().replace(/\.md$/, "");
          const file = dc.app.vault.getAbstractFileByPath(path);
          if (file) {
            try {
              const content = await dc.app.vault.cachedRead(file);
              if (content) {
                const lines = content.split("\n");
                const callouts = [];
                for (let index = 0; index < lines.length; index++) {
                  if (/^>\s*\[!QUESTION\]/i.test(lines[index])) {
                    let block = lines[index];
                    let next = index + 1;
                    while (next < lines.length && /^>/.test(lines[next])) {
                      block += "\n" + lines[next];
                      next++;
                    }
                    callouts.push(block);
                    index = next - 1;
                  }
                }
                if (callouts.length) insert(path, name, callouts);
              }
            } catch (error) {
              // Keep the rest of the index usable when one file cannot be read.
            }
          }
          processed++;
          if (processed % FLUSH_EVERY === 0) flush();
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker),
      );
      flush();
      if (!cancelled) setDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [indexRevision, currentPath, ROOT]);

  const tree = treeRef.current;
  const validTopic = topicHubs.some((topic) => topic.name === selectedTopic);
  const effectiveTopic = validTopic ? selectedTopic : topicHubs[0]?.name ?? "";

  // A nested selection can be absent during a progressive rebuild. Keep it in
  // state until loading finishes, then fall back only if it truly disappeared.
  dc.useEffect(() => {
    if (!topicHubs.length) return;
    if (!validTopic) {
      const fallback = topicHubs[0].name;
      setSelectedTopic(fallback);
      setSelectedPath(fallback);
      return;
    }
    if (done && selectedPath && !nodeAt(treeRef.current, selectedPath)) {
      setSelectedPath(selectedTopic);
    }
  }, [done, indexRevision, version, selectedTopic, selectedPath, topicSignature]);

  const sortedItems = (items) => [...items].sort((a, b) =>
    a.path.localeCompare(b.path, undefined, { numeric: true }) || a.id.localeCompare(b.id),
  );
  const renderQuestion = (item) => (
    <div class="dc-qi-question" key={item.id}>
      <dc.Markdown content={item.block} inline={false} sourcePath={currentPath} />
      <div class="dc-qi-source">
        <dc.Markdown
          content={`*Source: [${item.source}](${encodeURI(item.path)})*`}
          inline={false}
          sourcePath={currentPath}
        />
      </div>
    </div>
  );
  const renderSections = (node, path, scopePath) => {
    const depth = path.split("/").length - scopePath.split("/").length;
    const Heading = `h${Math.min(2 + Math.max(1, depth), 6)}`;
    const output = [
      <section
        class="dc-qi-section"
        key={path}
        data-scope={path}
        hidden={path !== scopePath && !path.startsWith(`${scopePath}/`)}
      >
        {path !== scopePath ? <Heading>{path.split("/").pop()}</Heading> : null}
        {sortedItems(node.items).map(renderQuestion)}
      </section>,
    ];
    for (const key of sortedKeys(node.children)) {
      output.push(...renderSections(node.children[key], `${path}/${key}`, scopePath));
    }
    return output;
  };

  const renderTopic = (topic) => {
    const topicNode = tree.children[topic.name] ?? { children: {}, items: [] };
    const requestedPath = topic.name === effectiveTopic &&
      (selectedPath === topic.name || selectedPath.startsWith(`${topic.name}/`))
      ? selectedPath : topic.name;
    const requestedNode = nodeAt(tree, requestedPath);
    const scopePath = requestedNode ? requestedPath : topic.name;
    const scopeCount = countItems(requestedNode ?? topicNode);
    const scopeLabel = scopePath.split("/").join(" / ");
    const isDeepScope = scopePath !== topic.name;
    const selectId = `${scopeId}-${encodeURIComponent(topic.name)}`;
    const options = [{ value: topic.name, label: `All ${topic.name}`, count: countItems(topicNode) }];
    const collectOptions = (node, ancestors) => {
      for (const key of sortedKeys(node.children)) {
        const child = node.children[key];
        const path = [...ancestors, key];
        options.push({ value: [topic.name, ...path].join("/"), label: path.join(" / "), count: countItems(child) });
        collectOptions(child, path);
      }
    };
    collectOptions(topicNode, []);

    return (
      <section class="dc-qi-topic-panel" key={topic.name} data-topic={topic.name} hidden={topic.name !== effectiveTopic}>
        <div class="dc-qi-controls">
          <label for={selectId}>Subtopic</label>
          <select id={selectId} value={scopePath} onChange={(event) => setSelectedPath(event.currentTarget.value)}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label} ({option.count})</option>
            ))}
          </select>
        </div>
        <section class="dc-qi-results" aria-label={`${scopeLabel} questions`}>
          <div class={`dc-qi-results-head${isDeepScope ? " has-path" : ""}`}>
            <h2>{scopePath.split("/").pop()}</h2>
            <span class="dc-qi-result-count" role="status" aria-live="polite" aria-atomic="true">
              {plural(scopeCount, "question")}{!done ? " · Updating…" : ""}
            </span>
          </div>
          {isDeepScope ? <p class="dc-qi-path">{scopeLabel}</p> : null}
          {!done && countItems(tree) === 0 ? (
            <p class="dc-qi-loading">Loading questions…</p>
          ) : scopeCount === 0 ? (
            <p class="dc-qi-empty">No questions in this topic yet.</p>
          ) : null}
          {renderSections(topicNode, topic.name, scopePath)}
        </section>
      </section>
    );
  };

  if (!topicHubs.length) {
    return (
      <div class="dc-questions-index">
        <p class="dc-qi-empty">No topic folders are available.</p>
      </div>
    );
  }

  return (
    <div class="dc-questions-index" aria-busy={done ? "false" : "true"}>
      <QuestionTopics
        topics={topicHubs.map((topic) => ({
          ...topic,
          count: countItems(tree.children[topic.name]),
        }))}
        selection={effectiveTopic}
        onSelect={(name) => {
          setSelectedTopic(name);
          setSelectedPath(name);
        }}
      >
        {topicHubs.map(renderTopic)}
      </QuestionTopics>
    </div>
  );
}
```
