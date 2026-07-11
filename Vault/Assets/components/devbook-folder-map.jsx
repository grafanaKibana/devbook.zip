// DevBook shared FolderNote card map.
//
// Loaded from a FolderNote with:
//   ```datacorejsx
//   const { FolderStructureMap } = await dc.require("devbook-folder-map.jsx");
//   return <FolderStructureMap />;
//   ```
//
// Fully derived from the current file: it renders the direct child FolderNotes
// (as folder cards, with a note count) and direct child concept notes (as note
// cards) of the folder the current note lives in. Everything topic-specific —
// color, ordering, per-card summary — comes from frontmatter, never from a
// hard-coded map. A published hub only ever links to publishable children.

function FolderStructureMap() {
  const current = dc.useCurrentFile();
  const dir = current.$path.slice(0, current.$path.lastIndexOf("/"));
  const folderName = dir.slice(dir.lastIndexOf("/") + 1);
  const pages = dc.useQuery(`@page and path("${dir}")`);
  // Scope for resolving the top-level topic's accent color. For a sub-hub
  // (e.g. Computer Science/Data Structures) the immediate folder note often has
  // no `color`, so the accent is inherited from the topic folder note directly
  // under the vault root (e.g. Computer Science).
  const segments = current.$path.split("/");
  const topicRoot = segments.length > 1 ? `${segments[0]}/${segments[1]}` : dir;
  const topicScope = dc.useQuery(`@page and path("${topicRoot}")`);

  const first = (value) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    return normalized == null ? "" : String(normalized).trim();
  };
  const hasTag = (page, tag) =>
    (page.$tags ?? []).some((value) => String(value).replace(/^#/, "") === tag);
  const isPublished = (page) => first(page.value("publish")).toLowerCase() === "true";
  const relativePath = (page) => page.$path.slice(dir.length + 1);
  const hexToRgb = (value) => {
    let hex = first(value).replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map((part) => part + part).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    const number = Number.parseInt(hex, 16);
    return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
  };

  // An unpublished FolderNote is an authoring surface and may show unfinished
  // children. A published FolderNote must never render links to unpublished pages.
  const showUnpublished = !isPublished(current);
  const isVisible = (page) => showUnpublished || isPublished(page);

  const entries = pages
    .filter((page) => {
      if (page.$path === current.$path || hasTag(page, "MetricsIgnore") || !isVisible(page)) return false;
      const parts = relativePath(page).split("/");
      const directNote = parts.length === 1 && !hasTag(page, "FolderNote");
      const directFolder = parts.length === 2 && hasTag(page, "FolderNote");
      return directNote || directFolder;
    })
    .sort((a, b) => {
      const orderA = Number(a.value("order") ?? Number.MAX_SAFE_INTEGER);
      const orderB = Number(b.value("order") ?? Number.MAX_SAFE_INTEGER);
      return orderA - orderB || a.$name.localeCompare(b.$name);
    });

  const conceptNotesFor = (entry) => {
    if (!hasTag(entry, "FolderNote")) return [];
    const entryDir = entry.$path.slice(0, entry.$path.lastIndexOf("/"));
    return pages.filter((page) =>
      page.$path.startsWith(`${entryDir}/`) &&
      !hasTag(page, "FolderNote") &&
      !hasTag(page, "MetricsIgnore") &&
      isVisible(page)
    );
  };

  const topicFolderNote = pages.find((page) =>
    relativePath(page).split("/").length === 1 && hasTag(page, "FolderNote")
  );
  const topLevelTopicNote = topicScope.find((page) =>
    page.$path === `${topicRoot}/${segments[1]}.md`
  );
  // Prefer the top-level topic color, fall back to this folder's own, then neutral.
  const topicRgb =
    hexToRgb(topLevelTopicNote?.value("color")) ||
    hexToRgb(topicFolderNote?.value("color")) ||
    "125, 125, 125";
  // Summaries are shown only when frontmatter supplies one; nothing is fabricated.
  const summaryFor = (page) => first(page.value("summary")) || null;

  const icons = {
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
    note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
  };

  const CSS = `
.folder-structure-map {
  --map-accent: 16, 185, 129;
  --map-gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  margin: 0.5rem 0 0.75rem;
  container-name: folder-map;
  container-type: inline-size;
}
.folder-map-children {
  /* Flex (not grid) so each card sizes to its own title — a long title widens
     its card and pushes to another row instead of being truncated, and rows
     grow to fill the width with no empty tracks when there are few cards. */
  display: flex;
  flex-wrap: wrap;
  gap: var(--map-gap);
}
.folder-map-node {
  position: relative;
  /* No overflow:hidden here: on a flex item that collapses min-width:auto to 0,
     letting the card shrink below its title + note-count and clip them. Without
     it, the card's min size is its content, so long titles widen the card (and
     wrap to another row) instead of being cut off. The accent gradient gets its
     own border-radius below to stay inside the rounded corners. */
  flex: 1 1 12rem;
  min-height: 2.75rem;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.folder-map-node::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--map-accent), 0.09) 0%,
    rgba(var(--map-accent), 0.04) 38%,
    rgba(var(--map-accent), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.folder-map-node:hover,
.folder-map-node:focus-within {
  border-color: rgba(var(--map-accent), 0.55);
  background-color: color-mix(in srgb, rgb(var(--map-accent)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.folder-map-node:hover::before,
.folder-map-node:focus-within::before {
  opacity: 1;
}
.folder-map-node-body {
  position: relative;
  z-index: 0;
  display: flex;
  min-height: 2.75rem;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 0.75rem;
}
.folder-map-node-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.folder-map-node-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.folder-map-entry-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--map-accent));
}
.folder-map-entry-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}
.folder-map-node-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}
.folder-map-node p {
  display: none;
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.folder-map-node-count {
  display: block;
  flex: 0 0 auto;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  white-space: nowrap;
}
.folder-map-hit {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.folder-map-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.folder-map-hit a:focus-visible {
  outline: 2px solid rgb(var(--map-accent));
  outline-offset: -0.3rem;
}
.folder-map-empty {
  margin: 1rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
  .folder-map-node {
    min-height: 6rem;
  }
  .folder-map-node-body {
    min-height: 6rem;
    justify-content: flex-start;
    padding: 0.85rem 0.9rem;
  }
  .folder-map-node p { display: block; }
}
@container folder-map (min-width: 64rem) {
  .folder-map-node,
  .folder-map-node-body { min-height: 6.75rem; }
}
@media (prefers-reduced-motion: reduce) {
  .folder-map-node { transition: none; }
  .folder-map-node::before { transition: none; }
  .folder-map-node:hover,
  .folder-map-node:focus-within { transform: none; }
}
`;

  return (
    <nav class="folder-structure-map" aria-label={`${folderName} section map`} style={{ "--map-accent": topicRgb }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {entries.length > 0 ? (
        <div class="folder-map-children">
          {entries.map((entry) => {
            const isFolder = hasTag(entry, "FolderNote");
            const noteCount = conceptNotesFor(entry).length;
            const summary = summaryFor(entry);
            return (
              <article class="folder-map-node" key={entry.$path}>
                <div class="folder-map-node-body">
                  <div class="folder-map-node-heading">
                    <span class="folder-map-node-title-group">
                      <span
                        class="folder-map-entry-icon"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: isFolder ? icons.folder : icons.note }}
                      />
                      <span class="folder-map-node-title" title={entry.$name}>{entry.$name}</span>
                    </span>
                    {isFolder ? (
                      <span class="folder-map-node-count">{noteCount} {noteCount === 1 ? "note" : "notes"}</span>
                    ) : null}
                  </div>
                  {summary ? <p>{summary}</p> : null}
                </div>
                <span class="folder-map-hit"><dc.Link link={entry.$link} /></span>
              </article>
            );
          })}
        </div>
      ) : (
        <p class="folder-map-empty">No notes in this section yet.</p>
      )}
    </nav>
  );
}

return { FolderStructureMap };
