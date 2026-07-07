# AlgViz — components & interactions

How the algorithm-visualizer framework is split into components, and how one `algviz`
fence becomes a live widget in **both** Obsidian (editor) and Quartz (published site).

> One shared, DOM-free engine + renderer. Two thin host adapters. Two theme bindings.
> Adding an algorithm = one `fn(input, ops)` file + one `register` call.

See the full design + phased plan in the companion artifact; this doc is the visual map.

---

## 1 · Component map

Everything under `Web/custom/algviz/` is the **shared core** — it has no host knowledge.
Each host adapter is a thin wrapper that calls the same `mount()`.

```mermaid
flowchart TB
    subgraph core["Shared core — Web/custom/algviz/ (DOM-free + renderer)"]
        direction TB
        algos["algorithms/*.ts<br/>bubble · insertion · selection<br/>bfs · dfs · dijkstra"]
        engine["engine.ts<br/>Recorders · registries · buildFrames()"]
        renderer["renderer.ts<br/>Player · render() · mount(root, config?)"]
        tokens["theme/renderer.css<br/>--az-* tokens only"]
        algos -- "registerSort / registerGraph" --> engine
        renderer -- "buildFrames(config)" --> engine
        renderer -. "styles via" .-> tokens
    end

    subgraph build["One build — build.mjs (esbuild x2)"]
        qentry["quartz-entry.ts<br/>+ az-bind-quartz.css"]
        oentry["obsidian-entry.ts<br/>+ az-bind-obsidian.css"]
    end

    core --> qentry
    core --> oentry
    qentry -- "IIFE string" --> script["generated/algviz.script.ts<br/>ALGVIZ_SCRIPT"]
    oentry -- "CJS bundle" --> mainjs["devbook-algviz/main.js"]

    subgraph quartz["Quartz host — published site"]
        transformer["algviz-block.ts<br/>fence to [data-algviz]"]
        component["algviz.tsx<br/>afterDOMLoaded = ALGVIZ_SCRIPT"]
        qwire["quartz.ts (wiring)"]
        qwire --> transformer
        qwire --> component
    end

    subgraph obsidian["Obsidian host — editor"]
        plugin["devbook-algviz plugin<br/>registerMarkdownCodeBlockProcessor('algviz')"]
    end

    script --> component
    mainjs --> plugin

    classDef coreCls fill:#eaeee0,stroke:#4c8000,color:#181c11
    classDef qzCls fill:#e8efd6,stroke:#4c8000,color:#181c11
    classDef obsCls fill:#efecfb,stroke:#6c56cc,color:#181c11
    classDef buildCls fill:#f0f0f0,stroke:#6aa80a,color:#181c11
    class algos,engine,renderer,tokens coreCls
    class transformer,component,qwire,script qzCls
    class plugin,mainjs obsCls
    class qentry,oentry buildCls
```

| Component | Layer | Responsibility |
|---|---|---|
| `engine.ts` | core | Frame types, Recorders (sole frame authors), registries, `buildFrames()` |
| `algorithms/*.ts` | core | One file per algorithm — the extension surface |
| `renderer.ts` | core | The only DOM code: `Player`, `render()`, `mount(root, config?)` → `{destroy()}` |
| `theme/*.css` | core | `renderer.css` (tokens only) + one binding sheet per host |
| `build.mjs` | build | Emits `ALGVIZ_SCRIPT` (IIFE) **and** Obsidian `main.js` atomically |
| `algviz-block.ts` | Quartz | Transformer: rewrites the fence into a `[data-algviz]` element |
| `algviz.tsx` | Quartz | Component: ships `ALGVIZ_SCRIPT` + CSS, hydrates on nav |
| `devbook-algviz` | Obsidian | Plugin: registers the `algviz` code-block processor |

---

## 2 · Why one fence is live on both hosts

The keystone. Quartz Syncer only **executes-and-freezes** a fixed allowlist of fence
languages (`QC()` in its bundle). `algviz` isn't on it, so the fence is committed **raw**
— free for the Quartz transformer to hydrate. Datacore/DataviewJS *are* on the allowlist,
which is exactly why they'd publish a dead snapshot.

```mermaid
flowchart LR
    fence["algviz fence<br/>in a note"] --> syncer{"Quartz Syncer<br/>QC() gate"}
    syncer -- "dataview / dataviewjs / datacore*<br/>(on allowlist)" --> frozen["executed + serialized<br/>frozen static HTML"]
    syncer -- "algviz<br/>(NOT on allowlist)" --> raw["committed RAW<br/>untouched"]
    raw --> tf["AlgVizBlock transformer<br/>at Quartz build"]
    tf --> live["live widget on<br/>published page"]
    frozen --> dead["dead snapshot<br/>(why datacore is wrong here)"]

    classDef ok fill:#e8efd6,stroke:#4c8000,color:#181c11
    classDef bad fill:#fbeadb,stroke:#a8480a,color:#181c11
    classDef gate fill:#eaeee0,stroke:#6c56cc,color:#181c11
    class raw,tf,live ok
    class frozen,dead bad
    class syncer gate
```

---

## 3 · Runtime — Obsidian (editor)

The plugin intercepts the code block directly and mounts the shared engine, cleaning up
via `MarkdownRenderChild` so no Player timers leak across re-renders.

```mermaid
sequenceDiagram
    participant A as Author (note)
    participant P as devbook-algviz plugin
    participant M as mount() [shared]
    participant E as engine (Recorder)
    participant R as renderer / Player
    A->>P: algviz code block (config)
    P->>P: JSON.parse(source)
    P->>M: mount(root, config)
    M->>E: buildFrames(config)
    E->>E: algorithm fn(input, ops) to frozen Frame[]
    E-->>M: frames[]
    M->>R: new Player(frames), render(0)
    R-->>A: live, Obsidian-themed widget
    Note over P,R: MarkdownRenderChild.onunload to handle.destroy()
```

---

## 4 · Runtime — Quartz (published site)

Publish-time transform + a client component that re-hydrates on SPA navigation (mirroring
`explorer-icons.tsx`: `nav`/`render` listeners + `window.addCleanup`).

```mermaid
sequenceDiagram
    participant A as Author (note)
    participant S as Quartz Syncer
    participant T as AlgVizBlock transformer
    participant C as AlgViz component
    participant M as mount() [shared]
    participant R as renderer / Player
    A->>S: publish note with algviz fence
    S->>S: fence off QC() allowlist, commit RAW
    Note over T: Quartz build
    T->>T: mdast code[lang=algviz] to div[data-algviz]
    C->>C: afterDOMLoaded on nav / render
    C->>M: scan [data-algviz], mount(root)
    M->>R: buildFrames + Player + render(0)
    R-->>A: live, Quartz-themed widget
    Note over C,R: window.addCleanup to handle.destroy()
```

Both hosts converge on the **same `mount()`** — the only difference is where the config
comes from (explicit arg in Obsidian, a `data-*` marker in Quartz) and which theme binding
was compiled in.

---

## 5 · The ops / Recorder contract

The interaction that makes "add an algorithm = one function" work. The algorithm never
builds a frame; it only calls `ops.*`. The Recorder owns state and is the sole frame
author, so frames are **precomputed once** — which is what makes step-back free and
deterministic.

```mermaid
sequenceDiagram
    participant F as algorithm fn(input, ops)
    participant Rec as Recorder (owns state)
    participant Fr as frames[] (frozen)
    participant Pl as Player
    participant Rn as render(i)
    Note over F,Fr: Phase 1 — precompute (run the algorithm ONCE)
    F->>Rec: ops.compare / swap / overwrite / markSorted
    Rec->>Rec: mutate array + counters
    Rec->>Fr: push(Object.freeze(Frame))
    Note over Pl,Rn: Phase 2 — playback (index precomputed frames)
    Pl->>Rn: render(frames[i])
    Rn-->>Pl: paint DOM (state via --az-* tokens)
    Note over Pl: step-back = render(i-1), free and deterministic
```

---

### Legend

- 🟢 **Green** — Quartz / published path (DevBook's `--secondary`)
- 🟣 **Purple** — Obsidian / editor path (Obsidian's brand hue)
- ⚪ **Grey/olive** — shared, host-blind core and the single build

*Companion: the full design doc + 7-phase build plan (see the AlgViz artifact). The two
runnable prototypes live beside this file: `sorting.html`, `graph.html`.*
