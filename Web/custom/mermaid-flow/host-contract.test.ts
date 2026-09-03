import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8")

test("Quartz discovers explicit mounts and owns navigation cleanup without a body observer", () => {
  const browser = source("browser.inline.ts")
  assert.match(browser, /\.mermaid-flow-mount\[data-mermaid-flow-pair\]/u)
  assert.match(browser, /addEventListener\("prenav", destroyAll\)/u)
  assert.match(browser, /addEventListener\("nav", discover\)/u)
  assert.match(browser, /addEventListener\("render", discover\)/u)
  assert.doesNotMatch(browser, /document\.body/u)
  assert.match(browser, /import \{ observePairSvg,/u)
  assert.match(browser, /lifecycle = observePairSvg\(/u)
  assert.doesNotMatch(browser, /new MutationObserver/u)
})

test("Quartz sanitizes only configured native Mermaid popup clones", () => {
  const browser = source("browser.inline.ts")
  assert.match(browser, /button\.expand-button/u)
  assert.match(browser, /pre\[data-mermaid-flow-pair\]/u)
  assert.match(browser, /#mermaid-container\.active \.mermaid-content > svg/u)
  assert.match(
    browser,
    /popupSvg\.replaceWith\(host\.mermaidFlow\.cloneNativeMermaidSvg\(popupSvg\)\)/u,
  )
  assert.match(browser, /document\.addEventListener\("click", sanitizeNativePopup\)/u)
})

test("Obsidian proves the source pair and binds only the preceding local render", () => {
  const obsidian = source("src/entries/obsidian.cts")
  assert.match(obsidian, /registerMarkdownCodeBlockProcessor\("mermaid-flow"/u)
  assert.match(obsidian, /getSectionInfo\(el\)/u)
  assert.match(obsidian, /cachedRead\(file\)/u)
  assert.match(obsidian, /ObsidianPairIndexCache/u)
  assert.match(obsidian, /findPairRecord\(index, section\.lineStart, section\.lineEnd, source\)/u)
  assert.match(obsidian, /onunload\(\): void \{\s*this\.authoring\.clear\(\)/u)
  assert.match(obsidian, /containerEl\.previousElementSibling/u)
  assert.match(obsidian, /renderBlock\?\.previousElementSibling/u)
  assert.match(obsidian, /:scope > \.block-language-mermaid, :scope > \.mermaid/u)
  assert.match(obsidian, /ctx\.addChild\(new MermaidFlowRenderChild/u)
  assert.match(obsidian, /this\.lifecycle\?\.destroy\(\)/u)
  assert.match(obsidian, /this\.handle\?\.destroy\(\)/u)
  assert.doesNotMatch(obsidian, /document\.body|active-leaf-change|layout-change/u)
})

test("the only replacement observer is scoped to its pair root", () => {
  const pairing = source("pairing.ts")
  assert.match(pairing, /observer\.observe\(pairRoot, \{ childList: true, subtree: true \}\)/u)
  assert.doesNotMatch(pairing, /document\./u)
  assert.doesNotMatch(pairing, /split\(\/\\r\?\\n|scanMarkdown|lineStart|lineEnd/u)
})

test("Quartz wires the pair transformer before syntax highlighting", () => {
  const quartz = source("../../quartz.ts")
  assert.match(
    quartz,
    /syntaxHighlightingIdx[\s\S]*ComplexityBlock\(\),[\s\S]*MermaidFlowBlock\(\)/u,
  )
  assert.match(
    quartz,
    /syntaxHighlightingAfterPairIdx[\s\S]*syntaxHighlightingAfterPairIdx \+ 1[\s\S]*MermaidFlowPairMarkers\(\)/u,
  )
})
