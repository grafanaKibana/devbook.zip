// DevBook shared FolderNote card map.
//
// Loaded from a FolderNote with:
//   ```datacorejsx
//   const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
//   return <FolderStructureMap />;
//   ```
//
// Fully derived from the current file: it renders the direct child FolderNotes
// (as folder cards, with a note count) and direct child concept notes (as note
// cards) of the folder the current note lives in. Everything topic-specific —
// color and ordering — comes from frontmatter, never from a
// hard-coded map. A published hub only ever links to publishable children.
//
// The card look (border, gradient, hover, icon, title) is NOT defined
// here — it comes from the shared devbook-card.jsx chrome so the home dashboard
// and these hubs stay visually identical. This module adds balanced full-width
// rows and the note-count.

const { CARD_CSS, squashCss } = await dc.require("Assets/components/devbook-card.jsx");

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
      const folderA = hasTag(a, "FolderNote") ? 0 : 1;
      const folderB = hasTag(b, "FolderNote") ? 0 : 1;
      const orderA = Number(a.value("order") ?? Number.MAX_SAFE_INTEGER);
      const orderB = Number(b.value("order") ?? Number.MAX_SAFE_INTEGER);
      return folderA - folderB || orderA - orderB || a.$name.localeCompare(b.$name);
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

  const icons = {
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
    note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
  };

  // Balance row lengths before assigning widths. Larger rows come first, with
  // at most one card's difference; literal CSS survives Syncer's frozen HTML.
  const rowRules = (capacity) => {
    const rows = Math.max(1, Math.ceil(entries.length / capacity));
    const count = Math.max(1, Math.floor(entries.length / rows));
    const largerCards = (entries.length % rows) * (count + 1);
    return `
.folder-structure-map[data-map-count="${entries.length}"] .folder-map-node:nth-child(n) { --map-row-count: ${count}; }
${largerCards ? `.folder-structure-map[data-map-count="${entries.length}"] .folder-map-node:nth-child(-n+${largerCards}) { --map-row-count: ${count + 1}; }` : ""}
`;
  };

  // Shared CARD_CSS supplies the chrome. Container width sets capacity so a
  // narrow Obsidian pane and the published page follow the same layout rules.
  const CSS = `
.folder-structure-map {
  --card-accent: 16, 185, 129;
  --map-gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  margin: 0.5rem 0 0.75rem;
  container-name: folder-map;
  container-type: inline-size;
}
.folder-map-children {
  display: flex;
  flex-wrap: wrap;
  gap: var(--map-gap);
}
.folder-map-node {
  display: flex;
  flex: 1 0 calc((100% - (var(--map-row-count, 1) - 1) * var(--map-gap)) / var(--map-row-count, 1));
  min-width: 0;
  min-height: 3.5rem;
  --db-card-pad: 0.75rem;
}
.folder-map-node .db-card-body {
  width: 100%;
  min-height: 3.5rem;
  justify-content: center;
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
  min-width: 0;
}
.folder-map-node .db-card-title {
  overflow-wrap: anywhere;
}
.folder-map-node-count {
  display: block;
  flex: 0 0 auto;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  white-space: nowrap;
}
/* Empty-section placeholder: reuses the full .db-card chrome (border, accent
   glow gradient, background) so it reads as a regular sub-folder card. It only
   differs in being non-interactive — no pointer cursor, no hover lift — with the
   text centered in the card. */
.folder-map-node-empty {
  cursor: default;
}
.folder-map-node-empty:hover,
.folder-map-node-empty:focus-within {
  border-color: var(--background-modifier-border, var(--lightgray, #d8dee9));
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transform: none;
}
.folder-map-node-empty:hover::before,
.folder-map-node-empty:focus-within::before { opacity: 0.78; }
/* Keep the placeholder centered at every width. */
.folder-structure-map .folder-map-node-empty .db-card-body {
  justify-content: center;
  align-items: center;
  text-align: center;
}
.folder-map-empty-text {
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.25;
}
${[2, 3, 4, 5].map((capacity) => `
@container folder-map (min-width: ${capacity * 14}rem) {
${rowRules(capacity)}
}
`).join("")}
`;

  return (
    <nav class="folder-structure-map" data-map-count={entries.length} aria-label={`${folderName} section map`} style={{ "--card-accent": topicRgb }}>
      <style dangerouslySetInnerHTML={{ __html: squashCss(CARD_CSS + CSS) }} />
      {entries.length > 0 ? (
        <div class="folder-map-children">
          {entries.map((entry) => {
            const isFolder = hasTag(entry, "FolderNote");
            const noteCount = conceptNotesFor(entry).length;
            return (
              <article class="db-card folder-map-node" key={entry.$path}>
                <div class="db-card-body">
                  <div class="folder-map-node-heading">
                    <span class="folder-map-node-title-group">
                      <span
                        class="db-card-icon"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: isFolder ? icons.folder : icons.note }}
                      />
                      <span class="db-card-title" title={entry.$name}>{entry.$name}</span>
                    </span>
                    {isFolder ? (
                      <span class="folder-map-node-count">{noteCount} {noteCount === 1 ? "note" : "notes"}</span>
                    ) : null}
                  </div>
                </div>
                <span class="db-card-hit"><dc.Link link={entry.$link} /></span>
              </article>
            );
          })}
        </div>
      ) : (
        <div class="folder-map-children">
          <article class="db-card folder-map-node folder-map-node-empty">
            <div class="db-card-body">
              <span class="folder-map-empty-text">No notes in this section yet.</span>
            </div>
          </article>
        </div>
      )}
    </nav>
  );
}

return { FolderStructureMap };
