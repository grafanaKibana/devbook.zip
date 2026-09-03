declare module "obsidian" {
  export class MarkdownRenderChild {
    readonly containerEl: HTMLElement
    constructor(containerEl: HTMLElement)
    onload(): void
    onunload(): void
  }

  export interface MarkdownPostProcessorContext {
    readonly sourcePath: string
    addChild(child: MarkdownRenderChild): void
    getSectionInfo(el: HTMLElement): { lineStart: number; lineEnd: number } | null
  }

  export class Plugin {
    readonly app: {
      readonly vault: {
        getAbstractFileByPath(path: string): object | null
        cachedRead(file: object): Promise<string>
      }
    }
    registerMarkdownCodeBlockProcessor(
      language: string,
      processor: (
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext,
      ) => void | Promise<void>,
    ): void
  }

  export class SliderComponent {
    readonly sliderEl: HTMLInputElement
    constructor(containerEl: HTMLElement)
    setLimits(min: number, max: number, step: number): this
    setInstant(instant: boolean): this
    setDisplayFormat(format: (value: number) => string): this
    setDynamicTooltip(): this
    setValue(value: number): this
    onChange(callback: (value: number) => void): this
  }
}

declare const require: (id: string) => unknown
declare const module: { exports: unknown }
