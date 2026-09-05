import { isAlias, isMap, isPair, isScalar, isSeq, parseDocument, type Node as YamlNode } from "yaml"

import type { FlowmaidDiagnostic, FlowmaidObject, FlowmaidValue } from "../domain/types"

export class FlowmaidYamlError extends Error {
  constructor(readonly diagnostic: FlowmaidDiagnostic) {
    super(diagnostic.message)
    this.name = "FlowmaidYamlError"
  }
}

const fail = (message: string, line?: number, column?: number): never => {
  throw new FlowmaidYamlError({ code: "yaml-invalid", path: "$", message, line, column })
}

const inspect = (node: YamlNode | null): void => {
  if (!node) return
  if (isAlias(node)) fail("YAML aliases are not supported")
  if ("tag" in node && node.tag) fail("Explicit YAML tags are not supported")
  if (isMap(node)) {
    for (const item of node.items) {
      if (!isPair(item) || !isScalar(item.key) || typeof item.key.value !== "string")
        fail("YAML mapping keys must be strings")
      const key = (item.key as { value: string }).value
      if (key === "<<") fail("YAML merge keys are not supported")
      if (["__proto__", "constructor", "prototype"].includes(key))
        fail(`Unsafe YAML key ${key} is not supported`)
      inspect(item.value as YamlNode | null)
    }
  } else if (isSeq(node)) {
    node.items.forEach((item) => inspect(item as YamlNode | null))
  } else if (!isScalar(node)) {
    fail("Unsupported YAML value")
  }
}

const admit = (value: unknown, path = "$", seen = new Set<object>()): FlowmaidValue => {
  if (typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (!value || typeof value !== "object") fail(`${path} must contain only JSON-shaped values`)
  const objectValue = value as object
  if (seen.has(objectValue)) fail(`${path} must not be cyclic`)
  seen.add(objectValue)
  if (Array.isArray(value)) {
    const result = value.map((item, index) => admit(item, `${path}[${index}]`, seen))
    seen.delete(value)
    return result
  }
  const prototype = Object.getPrototypeOf(objectValue)
  if (prototype !== Object.prototype && prototype !== null) fail(`${path} must be a plain object`)
  const result: Record<string, FlowmaidValue> = Object.create(null)
  for (const [key, child] of Object.entries(objectValue)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) fail(`${path}.${key} is unsafe`)
    result[key] = admit(child, `${path}.${key}`, seen)
  }
  seen.delete(objectValue)
  return result
}

export const parseFlowmaidYaml = (source: string): FlowmaidObject => {
  const document = parseDocument(source, {
    schema: "core",
    uniqueKeys: true,
    merge: false,
    prettyErrors: false,
  })
  if (document.errors.length) {
    const error = document.errors[0]!
    const position = error.linePos?.[0]
    fail(error.message, position?.line, position?.col)
  }
  if (document.warnings.length) fail(document.warnings[0]!.message)
  inspect(document.contents)
  const value = admit(document.toJS({ maxAliasCount: 0 }))
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Flowmaid YAML must contain one mapping")
  return value as FlowmaidObject
}
