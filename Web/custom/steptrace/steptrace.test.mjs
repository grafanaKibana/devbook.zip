import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import {
  globSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { buildSync } from "esbuild"

import {
  catalogOwnership,
  evidenceRoot,
  loadCatalogFixtures,
  repoRoot,
  runtimeOwnership,
} from "./steptrace.catalog.mjs"
import { startWatcher } from "./watch.mjs"

const here = dirname(fileURLToPath(import.meta.url))

function loadModule(...segments) {
  const result = buildSync({
    entryPoints: [join(here, ...segments)],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
  })
  const module = { exports: {} }
  new Function("module", "exports", result.outputFiles[0].text)(module, module.exports)
  return module.exports
}

const styleRolePatterns = {
  radius: /^--_radius-/,
  typography: /^--_(?:font|type|weight|leading|tracking)-/,
  motion: /^--_(?:dur|ease|spring)(?:-|$)/,
  spacing: /^--_space-/,
}
const exceptionCategories = new Set([
  "semantic",
  "responsive",
  "geometry",
  "accessibility",
  "motion",
  "interaction",
  "host-parity",
])

const governedStyleProperties = {
  radius:
    /^(?:border-radius|border-(?:start|end|top|right|bottom|left)(?:-(?:start|end))?-radius)$/,
  typography:
    /^(?:font|font-family|font-size|font-weight|font-stretch|font-style|line-height|letter-spacing|word-spacing)$/,
  motion:
    /^(?:animation|animation-duration|animation-delay|transition|transition-duration|transition-delay)$/,
  spacing:
    /^(?:gap|row-gap|column-gap|padding(?:-(?:block|inline|top|right|bottom|left)(?:-(?:start|end))?)?|margin(?:-(?:block|inline|top|right|bottom|left)(?:-(?:start|end))?)?|inset(?:-(?:block|inline)(?:-(?:start|end))?)?)$/,
}

const governedCustomProperties = {
  radius: /radius/,
  typography: /(?:font|type|weight|leading|tracking|line-height|letter-spacing)/,
  motion: /(?:dur|duration|delay|motion|ease|spring|tween|stagger)/,
  spacing: /(?:space|gap|padding|margin|inset)/,
}

const crossCategoryCanonicalRoles = new Set(["--_stroke-hair"])
const cssNumber = String.raw`-?(?:\d*\.)?\d+`
const cssLengthUnit =
  "(?:cap|ch|cm|cqb|cqh|cqi|cqmax|cqmin|cqw|dvb|dvh|dvi|dvmax|dvmin|dvw|em|ex|ic|in|lh|lvb|lvh|lvi|lvmax|lvmin|lvw|mm|pc|pt|px|q|rcap|rch|rem|rex|ric|rlh|svb|svh|svi|svmax|svmin|svw|vb|vh|vi|vmax|vmin|vw)"

function styleCategory(property) {
  if (property.startsWith("--")) {
    return Object.entries(governedCustomProperties).find(([, pattern]) =>
      pattern.test(property),
    )?.[0]
  }
  return Object.entries(governedStyleProperties).find(([, pattern]) => pattern.test(property))?.[0]
}

function rawStyleLiterals(value, category) {
  const withoutRoles = stripCssVariables(stripScssIgnored(value))
  let pattern
  if (category === "motion") {
    pattern = new RegExp(`${cssNumber}(?:ms|s)\\b`, "gi")
  } else if (category === "typography") {
    pattern = new RegExp(`${cssNumber}(?:${cssLengthUnit}|%)?(?![\\w-])`, "gi")
  } else {
    pattern = new RegExp(`${cssNumber}(?:${cssLengthUnit}|%)(?![\\w-])`, "gi")
  }
  const literals = [...withoutRoles.matchAll(pattern)].map(([literal]) => literal)
  if (category === "motion") {
    literals.push(
      ...[...withoutRoles.matchAll(/\bcubic-bezier\([^)]*\)/g)].map(([literal]) => literal),
    )
  }
  return literals.filter(
    (literal) => !/^0(?:\.0+)?(?:px|r?em|cqi|cqb|cqw|cqh|%|vh|vw)?$/.test(literal),
  )
}

function stripScssIgnored(value) {
  let result = ""
  let quote = ""
  let blockComment = false
  let lineComment = false
  let escaped = false
  for (let index = 0; index < value.length; index++) {
    const character = value[index]
    const next = value[index + 1]
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false
        result += "  "
        index++
      } else result += character === "\n" ? "\n" : " "
      continue
    }
    if (lineComment) {
      result += character === "\n" ? "\n" : " "
      if (character === "\n") lineComment = false
      continue
    }
    if (quote) {
      result += " "
      if (!escaped && character === quote) quote = ""
      escaped = !escaped && character === "\\"
      if (character !== "\\") escaped = false
      continue
    }
    if (character === "/" && next === "*") {
      blockComment = true
      result += "  "
      index++
    } else if (character === "/" && next === "/") {
      lineComment = true
      result += "  "
      index++
    } else if (character === '"' || character === "'") {
      quote = character
      result += " "
    } else result += character
  }
  return result
}

function stripCssVariables(value) {
  let result = ""
  for (let index = 0; index < value.length; index++) {
    if (!value.startsWith("var(", index)) {
      result += value[index]
      continue
    }
    let depth = 1
    let comma = -1
    let end = index + 4
    for (; end < value.length && depth > 0; end++) {
      if (value[end] === "(") depth++
      if (value[end] === ")") depth--
      if (value[end] === "," && depth === 1 && comma === -1) comma = end
    }
    if (depth !== 0) {
      result += value[index]
      continue
    }
    if (comma !== -1) result += stripCssVariables(value.slice(comma + 1, end - 1))
    index = end - 1
  }
  return result
}

function scanScssDeclarations(source) {
  const declarations = []
  const blocks = []
  const blockStack = []
  let statementStart = 0
  let colon = -1
  let parentheses = 0
  let brackets = 0
  let interpolation = 0
  let quote = ""
  let blockComment = false
  let lineComment = false
  let escaped = false

  function finishDeclaration(end) {
    if (colon < statementStart) return
    const prefix = source.slice(statementStart, colon)
    const localProperty = stripScssIgnored(prefix).trim()
    if (!/^(?:--|\$)?[\w-]+$/.test(localProperty)) return
    const propertyPrefix = blockStack.at(-1)?.propertyPrefix
    const property =
      propertyPrefix && !localProperty.startsWith("--") && !localProperty.startsWith("$")
        ? `${propertyPrefix}-${localProperty}`
        : localProperty
    const propertyOffset = prefix.lastIndexOf(localProperty)
    declarations.push({
      property,
      value: source.slice(colon + 1, end).trim(),
      index: statementStart + propertyOffset,
      blockStart: blockStack.at(-1)?.start ?? null,
      selectorContext: blockStack.at(-1)?.selectorContext ?? "<root>",
      emitting: blockStack.at(-1)?.emitting ?? true,
    })
  }

  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    const next = source[index + 1]
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false
        index++
      }
      continue
    }
    if (lineComment) {
      if (character === "\n") lineComment = false
      continue
    }
    if (quote) {
      if (!escaped && character === quote) quote = ""
      escaped = !escaped && character === "\\"
      if (character !== "\\") escaped = false
      continue
    }
    if (character === "/" && next === "*") {
      blockComment = true
      index++
      continue
    }
    if (character === "/" && next === "/" && parentheses === 0) {
      lineComment = true
      index++
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === "#" && next === "{") {
      interpolation++
      index++
      continue
    }
    if (interpolation > 0) {
      if (character === "{") interpolation++
      if (character === "}") interpolation--
      continue
    }
    if (character === "(") parentheses++
    if (character === ")") parentheses--
    if (character === "[") brackets++
    if (character === "]") brackets--
    if (parentheses !== 0 || brackets !== 0) continue
    if (character === ":" && colon === -1) colon = index
    if (character === "{") {
      const nestedProperty =
        colon < statementStart ? "" : stripScssIgnored(source.slice(statementStart, colon)).trim()
      const parentPrefix = blockStack.at(-1)?.propertyPrefix
      const propertyPrefix = /^(?:--|\$)?[\w-]+$/.test(nestedProperty)
        ? [parentPrefix, nestedProperty].filter(Boolean).join("-")
        : null
      if (
        propertyPrefix &&
        styleCategory(propertyPrefix) &&
        source.slice(colon + 1, index).trim()
      ) {
        finishDeclaration(index)
      }
      const header = stripScssIgnored(source.slice(statementStart, index)).trim()
      const emitting =
        (blockStack.at(-1)?.emitting ?? true) &&
        !/^@(?:mixin|function|(?:-\w+-)?keyframes)\b/.test(header)
      const parentSelector = blockStack.at(-1)?.selectorContext
      const normalizedHeader = header.replace(/\s+/g, " ")
      let selectorContext
      if (propertyPrefix || normalizedHeader.startsWith("@")) {
        selectorContext = parentSelector ?? "<root>"
      } else if (parentSelector && parentSelector !== "<root>") {
        selectorContext = normalizedHeader.includes("&")
          ? normalizedHeader.replaceAll("&", parentSelector)
          : `${parentSelector} ${normalizedHeader}`
      } else {
        selectorContext = normalizedHeader
      }
      const block = { start: index, end: -1, propertyPrefix, emitting, selectorContext }
      blocks.push(block)
      blockStack.push(block)
      statementStart = index + 1
      colon = -1
    } else if (character === ";") {
      finishDeclaration(index)
      statementStart = index + 1
      colon = -1
    } else if (character === "}") {
      finishDeclaration(index)
      const block = blockStack.pop()
      if (block) block.end = index
      statementStart = index + 1
      colon = -1
    }
  }
  finishDeclaration(source.length)
  return { declarations, blocks }
}

function referencedCssVariables(value) {
  return [...stripScssIgnored(value).matchAll(/var\(\s*(--[\w-]+)/g)].map(([, name]) => name)
}

function referencedSassVariables(value) {
  return [...stripScssIgnored(value).matchAll(/\$[\w-]+/g)].map(([name]) => name)
}

function usesCssVariable(value, target, definitions, seen = new Set()) {
  for (const name of referencedCssVariables(value)) {
    if (name === target) return true
    if (seen.has(name)) continue
    const branch = new Set([...seen, name])
    if (
      (definitions.get(name) ?? []).some((definition) =>
        usesCssVariable(definition.value, target, definitions, branch),
      )
    ) {
      return true
    }
  }
  return false
}

function isSteptraceSelectorContext({ emitting, selectorContext }) {
  if (!emitting || selectorContext === "<root>") return false
  const selectors = []
  let start = 0
  let parentheses = 0
  for (let index = 0; index < selectorContext.length; index++) {
    if (selectorContext[index] === "(") parentheses++
    if (selectorContext[index] === ")") parentheses--
    if (selectorContext[index] === "," && parentheses === 0) {
      selectors.push(selectorContext.slice(start, index))
      start = index + 1
    }
  }
  selectors.push(selectorContext.slice(start))
  return selectors.every((selector) =>
    /(?:^|[^\w-])\.steptrace(?:__|--|(?=$|[^\w-]))/.test(selector),
  )
}

function cssVariableConsumers(records, name, definitions) {
  const consumers = new Set()
  for (const record of records) {
    for (const declaration of record.declarations) {
      if (
        isSteptraceSelectorContext(declaration) &&
        !declaration.property.startsWith("--") &&
        !declaration.property.startsWith("$") &&
        usesCssVariable(declaration.value, name, definitions)
      ) {
        consumers.add(declaration.selectorContext)
      }
    }
  }
  return [...consumers]
}

function validateExceptionEvidence(path, evidence) {
  assert.equal(
    isAbsolute(evidence) || win32.isAbsolute(evidence),
    false,
    `${path}: exception evidence must be repo-relative`,
  )
  assert.equal(
    evidence.split(/[\\/]/).includes(".."),
    false,
    `${path}: exception evidence must not traverse parents`,
  )
  const root = realpathSync(evidenceRoot)
  const candidate = resolve(repoRoot, evidence)
  const candidateRelative = relative(root, candidate)
  assert.ok(
    candidateRelative &&
      candidateRelative !== ".." &&
      !candidateRelative.startsWith(`..${sep}`) &&
      !isAbsolute(candidateRelative),
    `${path}: exception evidence must be under evidence root`,
  )
  let realCandidate
  try {
    realCandidate = realpathSync(candidate)
  } catch {
    assert.fail(`${path}: missing exception evidence ${evidence}`)
  }
  const realRelative = relative(root, realCandidate)
  assert.ok(
    realRelative &&
      realRelative !== ".." &&
      !realRelative.startsWith(`..${sep}`) &&
      !isAbsolute(realRelative),
    `${path}: exception evidence escapes evidence root`,
  )
  assert.ok(statSync(realCandidate).isFile(), `${path}: exception evidence must be a regular file`)
}

function groupedStyleDeclarations(record, annotation, properties) {
  const block = record.blocks
    .filter(({ start, end }) => start < annotation.index && annotation.index < end)
    .at(-1)
  assert.ok(block, "grouped exception outside rule")
  assert.equal(
    record.source.slice(block.start + 1, annotation.index).trim(),
    "",
    "grouped exception must be first in rule",
  )
  const declarations = record.declarations.filter(
    (declaration) =>
      declaration.blockStart === block.start && properties.includes(declaration.property),
  )
  for (const property of properties) {
    assert.equal(
      declarations.filter((declaration) => declaration.property === property).length,
      1,
      `grouped exception requires one ${property} declaration`,
    )
  }
  return declarations
}

function aliasLiterals(value, category, cssDefinitions, sassDefinitions, seen = new Set()) {
  const literals = rawStyleLiterals(value, category)
  for (const name of referencedCssVariables(value)) {
    if (styleCategory(name) || seen.has(name)) continue
    seen.add(name)
    for (const definition of cssDefinitions.get(name) ?? []) {
      literals.push(
        ...aliasLiterals(definition.value, category, cssDefinitions, sassDefinitions, seen),
      )
    }
  }
  for (const name of referencedSassVariables(value)) {
    if (seen.has(name)) continue
    seen.add(name)
    for (const definition of sassDefinitions.get(name) ?? []) {
      literals.push(
        ...aliasLiterals(definition.value, category, cssDefinitions, sassDefinitions, seen),
      )
    }
  }
  return literals
}

function inspectStyleSystem(sources, authorityPath) {
  const records = sources.map((source) => ({ ...source, ...scanScssDeclarations(source.source) }))
  const authority = records.find(({ path }) => path === authorityPath)
  assert.ok(authority, "missing shared style authority")
  const roleCategory = new Map()
  const roles = {}
  for (const [category, pattern] of Object.entries(styleRolePatterns)) {
    roles[category] = [
      ...new Set(
        authority.declarations
          .map(({ property }) => property)
          .filter((property) => pattern.test(property)),
      ),
    ]
    assert.ok(roles[category].length > 0, `missing shared ${category} roles`)
    for (const role of roles[category]) roleCategory.set(role, category)
  }

  const cssDefinitions = new Map()
  const sassDefinitions = new Map()
  for (const record of records) {
    for (const declaration of record.declarations) {
      const definitions = declaration.property.startsWith("--")
        ? cssDefinitions
        : declaration.property.startsWith("$")
          ? sassDefinitions
          : null
      if (!definitions) continue
      const definition = { ...declaration, path: record.path }
      definitions.set(declaration.property, [
        ...(definitions.get(declaration.property) ?? []),
        definition,
      ])
    }
  }
  for (const [role, category] of roleCategory) {
    const consumers = cssVariableConsumers(records, role, cssDefinitions)
    assert.ok(
      consumers.length >= 2,
      `shared ${category} role ${role} has ${consumers.length} consumer${consumers.length === 1 ? "" : "s"}`,
    )
  }
  for (const role of crossCategoryCanonicalRoles) {
    const definitions = cssDefinitions.get(role) ?? []
    assert.deepEqual(
      definitions.map(({ path }) => path),
      [authorityPath],
      `${role} must be defined once in shared style authority`,
    )
    assert.ok(
      cssVariableConsumers(records, role, cssDefinitions).length >= 2,
      `${role} must have at least two consumers`,
    )
  }

  const names = new Set()
  const annotations = []
  let governedExceptions = 0
  const annotatedByPath = new Map()
  const inventory = Object.fromEntries(
    Object.keys(governedStyleProperties).map((category) => [category, 0]),
  )
  const violations = []
  for (const record of records) {
    const annotatedDeclarations = new Set()
    annotatedByPath.set(record.path, annotatedDeclarations)
    for (const match of record.source.matchAll(/\/\*\s*steptrace-exception:([\s\S]*?)\*\//g)) {
      const metadata = match[1].match(
        /^\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s+\|\s+category=([a-z-]+)\s+\|\s+rationale=([^|\n]+?)\s+\|\s+evidence=([^|\s]+)(?:\s+\|\s+properties=([a-z-]+(?:,[a-z-]+)*))?\s*$/,
      )
      assert.ok(metadata, `${record.path}: malformed steptrace-exception metadata`)
      const [, name, category, rationale, evidence, propertyList] = metadata
      assert.ok(
        exceptionCategories.has(category),
        `${record.path}: invalid exception category ${category}`,
      )
      assert.ok(rationale.trim(), `${record.path}: missing exception rationale`)
      assert.equal(names.has(name), false, `${record.path}: duplicate steptrace-exception ${name}`)
      names.add(name)
      const properties = propertyList?.split(",")
      assert.equal(
        properties ? new Set(properties).size !== properties.length : false,
        false,
        `${record.path}: ${name}`,
      )
      const declarations = properties
        ? groupedStyleDeclarations(record, match, properties)
        : [
            record.declarations.find(
              ({ index }) =>
                index > match.index + match[0].length &&
                record.source.slice(match.index + match[0].length, index).trim() === "",
            ),
          ]
      assert.ok(declarations.every(Boolean), `${record.path}: orphaned steptrace-exception ${name}`)
      for (const declaration of declarations) {
        const governedCategory = styleCategory(declaration.property)
        if (properties) {
          assert.ok(
            governedCategory && rawStyleLiterals(declaration.value, governedCategory).length > 0,
            `${record.path}: ${name} must own a governed raw declaration`,
          )
        }
        if (governedCategory && rawStyleLiterals(declaration.value, governedCategory).length > 0) {
          governedExceptions++
        }
        if (category === "motion") {
          assert.ok(
            /^(?:animation|transition|transform)/.test(declaration.property) ||
              governedCategory === "motion",
            `${record.path}: ${name}`,
          )
        }
        annotatedDeclarations.add(declaration.index)
      }
      validateExceptionEvidence(record.path, evidence)
      annotations.push({
        name,
        category,
        declarations: declarations.map(({ property }) => property),
        evidence,
      })
    }
  }

  for (const record of records) {
    for (const declaration of record.declarations) {
      const { property, value } = declaration
      const line = record.source.slice(0, declaration.index).split("\n").length
      const privateReferences = [...new Set(referencedCssVariables(value))].filter((name) =>
        name.startsWith("--_"),
      )
      if (
        declaration.emitting &&
        declaration.selectorContext !== "<root>" &&
        privateReferences.length &&
        !isSteptraceSelectorContext(declaration)
      ) {
        violations.push(
          `${record.path}:${line} non-StepTrace selector ${declaration.selectorContext} references ${privateReferences.join(", ")}`,
        )
      }
      if (property.startsWith("$")) {
        const category = styleCategory(`--${property.slice(1)}`)
        const literals = category
          ? aliasLiterals(value, category, cssDefinitions, sassDefinitions)
          : []
        if (literals.length) {
          violations.push(
            `${record.path}:${record.source.slice(0, declaration.index).split("\n").length} Sass variable alias ${property}: ${literals.join(", ")}`,
          )
        }
        continue
      }
      const category = styleCategory(property)
      const isRole = roleCategory.has(property)
      if (isRole && record.path !== authorityPath) {
        violations.push(`${record.path}: unauthorized shared role definition ${property}`)
        continue
      }
      if (!category) continue
      inventory[category]++
      if (isRole) continue
      const literals = rawStyleLiterals(value, category)
      if (literals.length && !annotatedByPath.get(record.path).has(declaration.index)) {
        violations.push(`${record.path}:${line} ${property}: ${literals.join(", ")}`)
      }
      for (const name of new Set(referencedCssVariables(value))) {
        if (
          styleCategory(name) ||
          crossCategoryCanonicalRoles.has(name) ||
          !cssDefinitions.has(name)
        ) {
          continue
        }
        const aliasValues = (cssDefinitions.get(name) ?? []).flatMap((definition) =>
          aliasLiterals(definition.value, category, cssDefinitions, sassDefinitions),
        )
        if (aliasValues.length) {
          violations.push(
            `${record.path}:${line} generic custom-property alias ${name}: ${aliasValues.join(", ")}`,
          )
        }
      }
      for (const name of new Set(referencedSassVariables(value))) {
        const aliasValues = (sassDefinitions.get(name) ?? []).flatMap((definition) =>
          aliasLiterals(definition.value, category, cssDefinitions, sassDefinitions),
        )
        if (aliasValues.length) {
          violations.push(
            `${record.path}:${line} Sass variable alias ${name}: ${aliasValues.join(", ")}`,
          )
        }
      }
    }
  }
  assert.deepEqual(violations, [], `unowned raw style literals:\n${violations.join("\n")}`)
  return { roles, annotations, governedExceptions, inventory }
}

test("the engine exposes the shared public contract", () => {
  const { steptrace: api } = loadModule("src", "engine.ts")
  assert.match(api.VERSION, /^\d+\.\d+\.\d+$/)
  for (const name of [
    "kindOf",
    "listAlgorithms",
    "buildFrames",
    "adjacency",
    "mount",
    "registerSort",
    "registerGraph",
  ]) {
    assert.equal(typeof api[name], "function", name)
  }
})

test("algorithm descriptors form valid unique catalogs", () => {
  const { builtInAlgorithms, interactiveStructures } = loadModule("src", "algorithms", "index.ts")
  const { createRegistry } = loadModule("src", "registry.ts")
  const catalogs = [builtInAlgorithms, interactiveStructures]
  const ids = catalogs.flatMap((catalog) => catalog.map(({ id }) => id))
  const configs = new Map(
    loadCatalogFixtures()
      .fixtures.filter(({ descriptorType }) => descriptorType === "frame")
      .map(({ id, config }) => [id, config]),
  )
  const assertRuntimeOwnership = (definitions, registry) => {
    for (const definition of definitions) {
      const config = configs.get(definition.id)
      assert.ok(config, `${definition.id} fixture`)
      assert.equal(
        runtimeOwnership(registry.buildFrames(config)),
        catalogOwnership(definition),
        `${definition.id} runtime ownership`,
      )
    }
  }

  assert.equal(new Set(ids).size, ids.length)
  const registry = createRegistry(builtInAlgorithms)
  assertRuntimeOwnership(builtInAlgorithms, registry)
  const mutable = builtInAlgorithms.find(({ family }) => family && typeof family === "object")
  assert.ok(mutable, "family descriptor for mutation proof")
  const mutated = {
    ...mutable,
    family: { ...mutable.family, id: `${mutable.family.id}-mutation` },
  }
  const mutatedDefinitions = builtInAlgorithms.map((definition) =>
    definition === mutable ? mutated : definition,
  )
  assertRuntimeOwnership(mutatedDefinitions, createRegistry(mutatedDefinitions))
  assert.throws(() => assertRuntimeOwnership(mutatedDefinitions, registry), /runtime ownership/)
  for (const definition of catalogs.flat()) {
    assert.match(definition.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    assert.equal(typeof definition.meta?.label, "string")
    assert.ok(definition.meta.label.length > 0)
  }
  for (const definition of builtInAlgorithms) {
    assert.equal(typeof definition.run, "function")
    if ("adapter" in definition) {
      assert.equal("parse" in definition, false)
      assert.equal("createRecorder" in definition.family, false)
      assert.equal(typeof definition.family.createView, "function")
    } else if ("family" in definition) {
      assert.equal(typeof definition.parse, "function")
      assert.equal(typeof definition.family.createRecorder, "function")
      assert.equal(typeof definition.family.createView, "function")
    }
  }
  for (const definition of interactiveStructures) {
    assert.equal(typeof definition.parse, "function")
    assert.equal(typeof definition.mount, "function")
  }
})

test("the registry routes every public algorithm kind", () => {
  const { createRegistry } = loadModule("src", "registry.ts")
  const registry = createRegistry([])
  const registrations = [
    ["registerSort", "sort", "family:array-sort"],
    ["registerGraph", "graph", "family:graph-state"],
    ["registerSearch", "search", "family:indexed-array-search"],
    ["registerString", "string", "family:string-match"],
    ["registerPointer", "pointers", "family:indexed-pointer-window"],
    ["registerDP", "dp", "family:matrix-grid"],
    ["registerUnionFind", "unionfind", undefined],
    ["registerBits", "bits", "legacy:bit-grid"],
    ["registerBacktrack", "backtrack", "legacy:backtrack-board"],
    ["registerRecTree", "rectree", undefined],
  ]

  for (const [method, kind, ownership] of registrations) {
    const id = `unit-${kind}`
    registry[method](id, { label: kind }, () => {})
    assert.equal(registry.kindOf(id), kind)
    const built = registry.buildFrames({
      algorithm: id,
      array: [3, 1, 2],
      target: 2,
      text: "ABABA",
      pattern: "ABA",
      n: 4,
      width: 4,
      nodes: [0, 1],
      edges: [[0, 1, 1]],
      start: "0",
    })
    assert.equal(runtimeOwnership(built), ownership, `${method} runtime ownership`)
  }
  assert.equal(registry.kindOf("missing"), null)
})

test("family algorithms build frame sequences through the shared registry", () => {
  const { createRegistry } = loadModule("src", "registry.ts")
  const family = {
    id: "unit-family",
    kind: "sort",
    meta: { label: "Unit family" },
    family: {
      id: "array-sort",
      createRecorder: () => ({ frames: [] }),
      createView: () => ({ nodes: [], paint() {} }),
    },
    parse: ({ value }) => ({ value }),
    run: (input, recorder) => recorder.frames.push({ ...input }),
  }
  const registry = createRegistry([family])

  const result = registry.buildFrames({ algorithm: family.id, value: 3 })
  assert.equal(result.kind, family.kind)
  assert.equal(result.family, family.family)
  assert.deepEqual(result.frames, [{ value: 3 }])
  assert.throws(() => registry.buildFrames({ algorithm: "missing" }), /unknown algorithm/)
})

test("the player keeps navigation inside the frame sequence", () => {
  const { Player } = loadModule("src", "player.ts")
  const painted = []
  const player = new Player(["first", "second", "third"], (frame) => painted.push(frame), 1)

  player.stepF()
  player.seek(99)
  player.stepB()
  player.seek(-1)
  player.reset()
  player.destroy()

  assert.deepEqual(painted, ["second", "third", "second", "first", "first"])
  assert.equal(player.i, 0)
  assert.equal(player.playing, false)
  assert.equal(player.timer, null)
})

test("mount reports invalid input locally and destroys cleanly", () => {
  const { createMount } = loadModule("src", "mount.ts")
  const root = {
    textContent: "",
    attributes: new Map(),
    classList: { add() {} },
    closest: () => null,
    setAttribute(name, value) {
      this.attributes.set(name, String(value))
    },
    replaceChildren() {
      this.textContent = ""
    },
  }
  const mount = createMount({
    kindOf: () => null,
    listAlgorithms: () => [],
    buildFrames: () => {
      throw new Error("not reached")
    },
  })

  const handle = mount(root, { algorithm: "missing" })
  assert.match(root.textContent, /unknown algorithm/)
  handle.destroy()
  handle.destroy()
  assert.equal(root.textContent, "")
})

test("renderers keep presentation in Sass", () => {
  const inlineSvgPaint = /<[^>]*\s(?:fill|stroke(?:-[a-z-]+)?)=["'][^"']*["'][^>]*>/
  const renderPath = join(here, "src", "render.ts")
  const tokenPath = join(here, "src", "styles", "_tokens.scss")
  const obsidianHostPath = join(here, "src", "styles", "hosts", "obsidian.scss")
  const quartzHostPath = join(here, "..", "components", "styles", "steptrace.scss")
  const hostPaths = [obsidianHostPath, quartzHostPath]
  const stylePaths = [
    ...new Set([...globSync(join(here, "src", "styles", "**", "*.scss")), ...hostPaths]),
  ]
  const colorLiteral =
    /#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/i
  const rawBorderWidth =
    /^\s*(?:--[^:\n]*border[^:\n]*|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?):\s*1px\b/m
  const rawTransitionDuration = /transition-duration:\s*0ms\b/
  assert.match('<path fill="none" stroke="currentColor"/>', inlineSvgPaint)
  assert.match("border-inline-end: 1px solid currentColor", rawBorderWidth)
  assert.match("transition-duration: 0ms", rawTransitionDuration)
  assert.match("#123456", colorLiteral)
  assert.match("oklch(70% 0.2 30)", colorLiteral)
  for (const path of globSync(join(here, "src", "**", "*.ts"))) {
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /status\.innerHTML\s*=/, path)
    assert.doesNotMatch(
      source,
      /\.style\.(?:background(?:Color)?|border(?:Color|Radius)?|boxShadow|color|display|fill|font|opacity|padding|stroke|transition|zIndex)\s*=/,
      path,
    )
    assert.doesNotMatch(source, /\.style\.cssText\s*=/, path)
    assert.doesNotMatch(source, /setAttribute\(\s*["'](?:fill|stroke|style)["']\s*,/, path)
    assert.doesNotMatch(source, inlineSvgPaint, path)
    assert.doesNotMatch(source, /--steptrace-token-(?:padding|radius)/, path)
    assert.doesNotMatch(source, /--steptrace-hash-size/, path)
    assert.doesNotMatch(source, /\b(?:backgroundColor|borderRadius|boxShadow|padding)\s*:/, path)
    if (path !== renderPath) {
      assert.doesNotMatch(source, /steptrace__(?:status|counts)/, path)
    }
  }
  const renderSource = readFileSync(renderPath, "utf8")
  assert.equal(renderSource.match(/steptrace__status/g)?.length, 1)
  assert.equal(renderSource.match(/steptrace__counts/g)?.length, 1)
  for (const path of stylePaths) {
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, rawBorderWidth, path)
    assert.doesNotMatch(source, rawTransitionDuration, path)
    if (path !== tokenPath) {
      assert.doesNotMatch(source, colorLiteral, path)
    }
  }
  for (const path of hostPaths) {
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /\.steptrace(?:__|--)|\[data-(?:state|role|semantic)/, path)
  }
  const quartzHostSource = readFileSync(quartzHostPath, "utf8")
  assert.match(quartzHostSource, /@use\s+["'][^"']*tokens["'];/, quartzHostPath)
  assert.match(quartzHostSource, /@include\s+tokens\.light-theme;/, quartzHostPath)
  assert.match(quartzHostSource, /@include\s+tokens\.dark-theme;/, quartzHostPath)

  const sharedPath = join(here, "src", "styles", "shared.scss")
  const styleSources = stylePaths.map((path) => ({ path, source: readFileSync(path, "utf8") }))
  const styleSystem = inspectStyleSystem(styleSources, sharedPath)
  assert.equal(styleSystem.governedExceptions, 32)
  assert.equal(styleSystem.annotations.length, 33)
  for (const [property, value] of [
    ["border-radius", "8px"],
    ["font-size", "13px"],
    ["gap", "7px"],
    ["transition-duration", "180ms"],
    ["padding", "1ch"],
    ["line-height", "1lh"],
    ["margin", "1dvh"],
    ["inset", "1vmin"],
    ["gap", ".5%"],
    ["margin", "1%"],
    ["padding", "100%"],
  ]) {
    assert.throws(
      () =>
        inspectStyleSystem(
          [
            ...styleSources,
            {
              path: "mutation.scss",
              source:
                "x {\n  border-radius: var(--_radius-sm);\n  font: var(--_type-ui);\n  transition: var(--_dur-quick);\n  gap: var(--_space-1);\n" +
                `  ${property}: ${value};\n}`,
            },
          ],
          sharedPath,
        ),
      new RegExp(`mutation\\.scss:\\d+ ${property}`),
    )
  }
  assert.throws(
    () =>
      inspectStyleSystem(
        [...styleSources, { path: "mutation.scss", source: "x { border: { radius: 8px; } }" }],
        sharedPath,
      ),
    /mutation\.scss:\d+ border-radius/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [...styleSources, { path: "mutation.scss", source: "x { padding: { left: 100%; } }" }],
        sharedPath,
      ),
    /mutation\.scss:\d+ padding-left: 100%/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources,
          {
            path: "mutation.scss",
            source: "x { margin: 7px { left: var(--_space-1); } }",
          },
        ],
        sharedPath,
      ),
    /mutation\.scss:\d+ margin: 7px/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [...styleSources, { path: "mutation.scss", source: "x{--x:7px;gap:var(--x)}" }],
        sharedPath,
      ),
    /generic custom-property alias --x/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources,
          {
            path: "mutation.scss",
            source: "x{--_stroke-custom:1px;border-radius:var(--_stroke-custom)}",
          },
        ],
        sharedPath,
      ),
    /generic custom-property alias --_stroke-custom/,
  )
  const genericAliasAuthority = styleSources
    .find(({ path }) => path === sharedPath)
    .source.replace(
      ".steptrace {",
      ".steptrace {\n  --x: 7px;\n  gap: var(--x);\n  padding: var(--x);",
    )
  assert.throws(
    () =>
      inspectStyleSystem(
        styleSources.map((source) =>
          source.path === sharedPath ? { ...source, source: genericAliasAuthority } : source,
        ),
        sharedPath,
      ),
    /generic custom-property alias --x/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [...styleSources, { path: "mutation.scss", source: "$x:7px;x{gap:$x}" }],
        sharedPath,
      ),
    /Sass variable alias \$x/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources,
          {
            path: "mutation.scss",
            source: 'x{/* inline; comment */background:url("data:text/plain;a;b");gap:7px}',
          },
        ],
        sharedPath,
      ),
    /mutation\.scss:\d+ gap/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [...styleSources, { path: "mutation.scss", source: "x {\n  gap:\n    7px\n}" }],
        sharedPath,
      ),
    /mutation\.scss:\d+ gap/,
  )
  const oneConsumerAuthority = styleSources
    .find(({ path }) => path === sharedPath)
    .source.replace(".steptrace {", ".steptrace {\n  --_space-mutation: 7px;")
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources,
          { path: "mutation.scss", source: ".complexity { padding: var(--_space-1); }" },
        ],
        sharedPath,
      ),
    /non-StepTrace selector \.complexity references --_space-1/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources.map((source) =>
            source.path === sharedPath ? { ...source, source: oneConsumerAuthority } : source,
          ),
          {
            path: "mutation.scss",
            source: ".steptrace .x{gap:var(--_space-mutation)}",
          },
        ],
        sharedPath,
      ),
    /shared spacing role --_space-mutation has 1 consumer/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources.map((source) =>
            source.path === sharedPath ? { ...source, source: oneConsumerAuthority } : source,
          ),
          {
            path: "mutation.scss",
            source:
              ".steptrace .x{gap:var(--_space-mutation)}\n" +
              ".steptrace .x { padding: var(--_space-mutation); }",
          },
        ],
        sharedPath,
      ),
    /shared spacing role --_space-mutation has 1 consumer/,
  )
  assert.doesNotThrow(() =>
    inspectStyleSystem(
      [
        ...styleSources.map((source) =>
          source.path === sharedPath ? { ...source, source: oneConsumerAuthority } : source,
        ),
        {
          path: "mutation.scss",
          source:
            ".steptrace .x{gap:var(--_space-mutation)}\n" +
            ".steptrace .y { padding: var(--_space-mutation); }",
        },
      ],
      sharedPath,
    ),
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources.map((source) =>
            source.path === sharedPath ? { ...source, source: oneConsumerAuthority } : source,
          ),
          {
            path: "mutation.scss",
            source: ".steptrace .x{gap:var(--_space-mutation);padding:var(--_space-mutation)}",
          },
        ],
        sharedPath,
      ),
    /shared spacing role --_space-mutation has 1 consumer/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources.map((source) =>
            source.path === sharedPath ? { ...source, source: oneConsumerAuthority } : source,
          ),
          {
            path: "mutation.scss",
            source:
              "@mixin first { gap: var(--_space-mutation); }\n" +
              "@mixin second { padding: var(--_space-mutation); }",
          },
        ],
        sharedPath,
      ),
    /shared spacing role --_space-mutation has 0 consumers/,
  )

  const evidenceSelfCheckRoot = mkdtempSync(join(evidenceRoot, ".style-self-check-"))
  const externalSelfCheckRoot = mkdtempSync(join(tmpdir(), "steptrace-style-evidence-"))
  try {
    const externalEvidence = join(externalSelfCheckRoot, "review.json")
    const escapedEvidence = join(evidenceSelfCheckRoot, "escaped-review.json")
    writeFileSync(externalEvidence, "{}")
    symlinkSync(externalEvidence, escapedEvidence)
    for (const [evidence, expected] of [
      [externalEvidence, /exception evidence must be repo-relative/],
      ["../review.json", /exception evidence must not traverse parents/],
      [relative(repoRoot, evidenceSelfCheckRoot), /exception evidence must be a regular file/],
      [relative(repoRoot, escapedEvidence), /exception evidence escapes evidence root/],
    ]) {
      assert.throws(
        () =>
          inspectStyleSystem(
            [
              ...styleSources,
              {
                path: "mutation.scss",
                source: `/* steptrace-exception: mutation-evidence | category=geometry | rationale=proof | evidence=${evidence} */\ngap: 7px;`,
              },
            ],
            sharedPath,
          ),
        expected,
      )
    }
  } finally {
    rmSync(evidenceSelfCheckRoot, { recursive: true, force: true })
    rmSync(externalSelfCheckRoot, { recursive: true, force: true })
  }
  const acceptedEvidence = styleSystem.annotations[0].evidence
  const groupedException = `.steptrace .x {
  /* steptrace-exception: mutation-group | category=geometry | rationale=proof | evidence=${acceptedEvidence} | properties=font-size,gap */
  border-radius: var(--_radius-sm);
  font: var(--_type-ui);
  transition: var(--_dur-quick);
  margin: var(--_space-1);
  font-size: 13px;
  gap: 7px;
}`
  assert.doesNotThrow(() =>
    inspectStyleSystem(
      [...styleSources, { path: "mutation.scss", source: groupedException }],
      sharedPath,
    ),
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources,
          {
            path: "mutation.scss",
            source: groupedException.replace("  gap: 7px;", "  gap: 7px;\n  padding: 1px;"),
          },
        ],
        sharedPath,
      ),
    /mutation\.scss:\d+ padding/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources,
          {
            path: "mutation.scss",
            source: groupedException.replace("font-size,gap", "font-size,padding"),
          },
        ],
        sharedPath,
      ),
    /grouped exception requires one padding declaration/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources,
          {
            path: "mutation.scss",
            source:
              "/* steptrace-exception: mutation | category=geometry | rationale=proof */\npadding: 1px;\n" +
              "x{border-radius:var(--_radius-sm);font:var(--_type-ui);transition:var(--_dur-quick);gap:var(--_space-1)}",
          },
        ],
        sharedPath,
      ),
    /malformed steptrace-exception metadata/,
  )
  assert.throws(
    () =>
      inspectStyleSystem(
        [
          ...styleSources,
          {
            path: "mutation.scss",
            source:
              `/* steptrace-exception: mutation | category=geometry | rationale=proof | evidence=${relative(repoRoot, evidenceRoot)}/missing.json */\npadding: 1px;\n` +
              "x{border-radius:var(--_radius-sm);font:var(--_type-ui);transition:var(--_dur-quick);gap:var(--_space-1)}",
          },
        ],
        sharedPath,
      ),
    /missing exception evidence/,
  )
})

test("Obsidian binds StepTrace visual roles to host-native theme variables", () => {
  const path = join(here, "src", "styles", "hosts", "obsidian.scss")
  const source = readFileSync(path, "utf8")
  const bindings = {
    "--st-page": "--background-primary",
    "--st-surface": "--background-secondary",
    "--st-text": "--text-normal",
    "--st-muted": "--text-muted",
    "--st-border": "--background-modifier-border-hover",
    "--st-neutral": "--text-faint",
    "--st-accent": "--interactive-accent",
    "--st-on-accent": "--text-on-accent",
    "--st-font-body": "--font-text",
    "--st-font-mono": "--font-monospace",
  }

  for (const [role, hostVariable] of Object.entries(bindings)) {
    assert.match(
      source,
      new RegExp(`${role}:\\s*var\\(${hostVariable}\\);`),
      `Obsidian must bind ${role} to ${hostVariable}`,
    )
  }
  for (const token of [
    "panel-shadow-light",
    "amber-light",
    "violet-light",
    "blue-light",
    "green-light",
    "red",
    "context-text-light",
    "amber-text-light",
    "green-text-light",
    "held-bg-light",
    "on-accent",
    "panel-shadow-dark",
    "amber-dark",
    "violet-dark",
    "blue-dark",
    "green-dark",
    "context-text-dark",
    "red-text-dark",
    "on-red-dark",
    "held-bg-dark",
    "held-fg-dark",
  ]) {
    assert.match(source, new RegExp(`tokens\\.\\$${token}\\b`), `missing shared ${token} token`)
  }
  assert.doesNotMatch(
    source,
    /@include\s+tokens\.(?:light|dark)-theme;/,
    "Obsidian must not include fixed Quartz theme mixins",
  )
  assert.doesNotMatch(
    source,
    /#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/i,
    "Obsidian host bindings must not contain raw color literals",
  )
})

test("status helper preserves safe text and live-region semantics", () => {
  const originalDocument = globalThis.document
  const makeElement = (tag) => ({
    tag,
    className: "",
    attributes: new Map(),
    children: [],
    setAttribute(name, value) {
      this.attributes.set(name, value)
    },
    replaceChildren(...children) {
      this.children = children
    },
    append(...children) {
      this.children.push(...children)
    },
  })
  globalThis.document = {
    createElement: makeElement,
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  }
  try {
    const { setStatus, statusEl } = loadModule("src", "render.ts")
    const status = statusEl()
    setStatus(status, "<unsafe>", "· 2 checks")
    assert.equal(status.attributes.get("role"), "status")
    assert.equal(status.attributes.get("aria-live"), "polite")
    assert.equal(status.children[0].textContent, "<unsafe>")
    assert.equal(status.children[2].className, "steptrace__counts")
    assert.equal(status.children[2].textContent, "· 2 checks")
    setStatus(status, "plain")
    assert.deepEqual(
      status.children.map(({ textContent }) => textContent),
      ["plain"],
    )
  } finally {
    globalThis.document = originalDocument
  }
})

test("keyboard operation focus survives hash locks and disabling heap renders", async () => {
  const originalDocument = globalThis.document
  const originalMouseEvent = globalThis.MouseEvent
  const originalMutationObserver = globalThis.MutationObserver
  const body = {}
  const observers = []
  class MouseEvent {
    constructor(_type, { detail }) {
      this.detail = detail
    }
  }
  class MutationObserver {
    constructor(callback) {
      this.callback = callback
      this.disconnected = false
      observers.push(this)
    }
    observe() {
      this.disconnected = false
    }
    disconnect() {
      this.disconnected = true
    }
    trigger() {
      if (!this.disconnected) this.callback()
    }
  }
  const control = (label, initialDisabled = false) => {
    let disabled = initialDisabled
    return {
      tagName: "BUTTON",
      textContent: label,
      get disabled() {
        return disabled
      },
      set disabled(value) {
        disabled = value
        if (value && globalThis.document.activeElement === this)
          globalThis.document.activeElement = body
      },
      hidden: false,
      isConnected: true,
      getAttribute: () => null,
      closest: () => null,
      getClientRects: () => [1],
      focus() {
        globalThis.document.activeElement = this
      },
    }
  }
  const controls = (...items) => ({ querySelectorAll: () => items })
  globalThis.MouseEvent = MouseEvent
  globalThis.MutationObserver = MutationObserver
  globalThis.document = { activeElement: null, body }
  try {
    const { withOperationFocus } = loadModule("src", "families", "interactive-structure.ts")

    const trigger = control("Add")
    const reset = control("Reset")
    const all = [trigger, reset]
    globalThis.document.activeElement = trigger
    withOperationFocus(controls(...all), trigger, new MouseEvent("click", { detail: 0 }), () => {
      for (const item of all) item.disabled = true
      for (const item of all) item.disabled = false
    })
    await Promise.resolve()
    assert.equal(
      globalThis.document.activeElement,
      trigger,
      "keyboard-generated click survives a same-handler lock",
    )

    const merge = control("Merge")
    const hiddenAction = control("Hidden action")
    hiddenAction.hidden = true
    const resetHeap = control("Reset")
    globalThis.document.activeElement = merge
    withOperationFocus(
      controls(merge, hiddenAction, resetHeap),
      merge,
      new MouseEvent("click", { detail: 0 }),
      () => (merge.disabled = true),
    )
    await Promise.resolve()
    assert.equal(globalThis.document.activeElement, resetHeap, "heap merge advances to Reset")

    const external = {}
    const lockedAdd = control("Add")
    globalThis.document.activeElement = lockedAdd
    withOperationFocus(
      controls(lockedAdd),
      lockedAdd,
      new MouseEvent("click", { detail: 0 }),
      () => (lockedAdd.disabled = true),
    )
    await Promise.resolve()
    lockedAdd.disabled = false
    globalThis.document.activeElement = external
    const observer = observers.at(-1)
    observer.trigger()
    assert.equal(globalThis.document.activeElement, external, "later user focus is not trapped")
    assert.equal(observer.disconnected, true, "external focus disconnects the observer")
    globalThis.document.activeElement = external
    observer.trigger()
    assert.equal(globalThis.document.activeElement, external, "later mutations cannot steal focus")

    const mouseAction = control("Add")
    globalThis.document.activeElement = mouseAction
    const pending = withOperationFocus(
      controls(mouseAction),
      mouseAction,
      new MouseEvent("click", { detail: 1 }),
      () => {
        mouseAction.disabled = true
        mouseAction.disabled = false
      },
    )
    await Promise.resolve()
    assert.equal(pending, null)
    assert.equal(globalThis.document.activeElement, body, "mouse focus behavior is unchanged")
  } finally {
    globalThis.document = originalDocument
    globalThis.MouseEvent = originalMouseEvent
    globalThis.MutationObserver = originalMutationObserver
  }
})

test("the watcher performs and closes one generic build", async () => {
  const watcher = new EventEmitter()
  let builds = 0
  let closed = false
  watcher.close = async () => {
    closed = true
  }
  const session = startWatcher({
    watch: () => watcher,
    onBuild: async () => {
      builds++
      return { artifacts: 1, quartzPublicSynced: false }
    },
    logger: { log() {}, error() {} },
  })

  await session.run()
  await session.close()
  assert.equal(builds, 1)
  assert.equal(closed, true)
})
