// DevBook shared Lucide icons — inner SVG markup by name, sourced from the same
// `lucide-static` package the Quartz Explorer uses (see Web/custom/lib/lucide-icons.ts),
// so a note's `icon:` frontmatter resolves to the exact same glyph in Obsidian and
// on the site. Datacore can't import an npm package at render time, so the icons
// actually referenced across the vault are inlined here once and shared via
// `dc.require`, instead of every note hard-coding raw <svg> path data.
//
// Consume with:
//   const { icon } = await dc.require("Assets/components/devbook-icons.jsx");
//   ...dangerouslySetInnerHTML={{ __html: icon(page.value("icon")) }}
//
// `lucide-static` keeps deprecated names as alias files (code-2, area-chart, …),
// which is why the frontmatter's older names still resolve. Don't hand-edit the
// path data below — it's generated. To add or refresh icons, regenerate the INNER
// map from lucide-static for every distinct `icon:` name in the vault:
//
//   for n in $(grep -rh '^icon:' Vault/Home --include='*.md' | sed 's/.*icon:[[:space:]]*//; s/["'"'"']//g' | sort -u); do
//     printf '  "%s": `%s`,\n' "$n" "$(sed -E '1s/.*<svg[^>]*>//; $s/<\/svg>.*//' "Web/node_modules/lucide-static/icons/$n.svg" | tr -s '[:space:]' ' ')"
//   done
//
// then splice the result into INNER (keep the folder/file-text generics).

// name -> inner SVG (shapes only, no <svg> wrapper)
const INNER = {
  "area-chart": `<path d="M3 3v16a2 2 0 0 0 2 2h16" /> <path d="M7 11.207a.5.5 0 0 1 .146-.353l2-2a.5.5 0 0 1 .708 0l3.292 3.292a.5.5 0 0 0 .708 0l4.292-4.292a.5.5 0 0 1 .854.353V16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" />`,
  "brain": `<path d="M12 18V5" /> <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" /> <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" /> <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" /> <path d="M18 18a4 4 0 0 0 2-7.464" /> <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" /> <path d="M6 18a4 4 0 0 1-2-7.464" /> <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />`,
  "building-2": `<path d="M10 12h4" /> <path d="M10 8h4" /> <path d="M14 21v-3a2 2 0 0 0-4 0v3" /> <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" /> <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />`,
  "cloud": `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />`,
  "code-2": `<path d="m18 16 4-4-4-4" /> <path d="m6 8-4 4 4 4" /> <path d="m14.5 4-5 16" />`,
  "database": `<ellipse cx="12" cy="5" rx="9" ry="3" /> <path d="M3 5V19A9 3 0 0 0 21 19V5" /> <path d="M3 12A9 3 0 0 0 21 12" />`,
  "flask-round": `<path d="M10 2v6.292a7 7 0 1 0 4 0V2" /> <path d="M5 15h14" /> <path d="M8.5 2h7" />`,
  "lock": `<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /> <path d="M7 11V7a5 5 0 0 1 10 0v4" />`,
  "network": `<rect x="16" y="16" width="6" height="6" rx="1" /> <rect x="2" y="16" width="6" height="6" rx="1" /> <rect x="9" y="2" width="6" height="6" rx="1" /> <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /> <path d="M12 12V8" />`,
  "ruler-dimension-line": `<path d="M10 15v-3" /> <path d="M14 15v-3" /> <path d="M18 15v-3" /> <path d="M2 8V4" /> <path d="M22 6H2" /> <path d="M22 8V4" /> <path d="M6 15v-3" /> <rect x="2" y="12" width="20" height="8" rx="2" />`,
  "skull": `<path d="m12.5 17-.5-1-.5 1h1z" /> <path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z" /> <circle cx="15" cy="12" r="1" /> <circle cx="9" cy="12" r="1" />`,
  "folder": `<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />`,
  "file-text": `<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /> <path d="M14 2v5a1 1 0 0 0 1 1h5" /> <path d="M10 9H8" /> <path d="M16 13H8" /> <path d="M16 17H8" />`,
};

const FALLBACK = "folder";

// Full <svg> string for a Lucide icon by name, using Lucide's default stroke
// attributes (currentColor, 24x24). Unknown names fall back to the folder glyph.
const icon = (name) => {
  const key = Array.isArray(name) ? name[0] : name;
  const inner = INNER[String(key ?? "").trim()] ?? INNER[FALLBACK];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
};

return { INNER, icon };
