import type { Root } from "mdast"
import remarkParse from "remark-parse"
import { unified } from "unified"

import { buildPairIndex, type AuthoringNode, type PairIndex } from "./pair-index"

const parser = unified().use(remarkParse)
const parseMarkdown = (source: string): AuthoringNode => parser.parse(source) as Root

export class ObsidianPairIndexCache {
  private readonly entries = new Map<string, { source: string; index: PairIndex }>()

  constructor(
    private readonly capacity = 8,
    private readonly parse: (source: string) => AuthoringNode = parseMarkdown,
  ) {}

  get(sourcePath: string, source: string): PairIndex {
    const cached = this.entries.get(sourcePath)
    if (cached?.source === source) {
      this.entries.delete(sourcePath)
      this.entries.set(sourcePath, cached)
      return cached.index
    }

    const index = buildPairIndex(this.parse(source))
    this.entries.delete(sourcePath)
    this.entries.set(sourcePath, { source, index })
    if (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!)
    return index
  }

  clear(): void {
    this.entries.clear()
  }
}
