---
name: excalidraw
description: >
  Create, edit, and manipulate Excalidraw drawings in Obsidian using the ExcalidrawAutomate scripting API.
  Use this skill whenever the user wants to create diagrams, sketches, illustrations, visual maps,
  flowcharts, concept diagrams, mind maps, or any hand-drawn-style visual in Obsidian Excalidraw.
  Also trigger when .excalidraw or .excalidraw.md files are mentioned, when the user says "draw",
  "sketch", "illustrate", "diagram", or "visualize", or when embedding visuals into Obsidian notes.
  This skill covers both programmatic drawing via the Obsidian CLI eval command and file-based
  creation via MCP tools. Use it even if the user just wants a simple shape or arrow diagram —
  Excalidraw is the right tool whenever hand-drawn-style visuals are involved.
---

# Excalidraw for Obsidian

Create and manipulate Excalidraw drawings inside an Obsidian vault using the **ExcalidrawAutomate** (EA) scripting API. This skill supports two modes of operation depending on what's available in the session.

## Two Modes of Operation

### Mode 1: Obsidian CLI `eval` (preferred)

Run JavaScript directly in the Obsidian app context via:

```bash
obsidian eval code="<javascript>"
```

This gives full access to `window.ExcalidrawAutomate`, the Obsidian `app` object, and live view manipulation. Use this mode when:
- The Obsidian CLI is available and configured (API key set)
- You need to interact with the active drawing view
- You want to create drawings and have them open immediately

### Mode 2: MCP file-based creation (fallback)

Write `.excalidraw.md` files directly using `mcp__mcp-obsidian__obsidian_append_content` or the filesystem. Excalidraw files in Obsidian are markdown files with embedded JSON. Use this mode when:
- The CLI is unavailable or unconfigured
- You're creating static drawings that don't need live interaction
- You want to place drawings into specific vault locations

**Always try Mode 1 first.** If it fails (CLI not found, API key missing), fall back to Mode 2.

---

## Mode 1: ExcalidrawAutomate via CLI eval

### Core Workflow

Every EA script follows three steps:

1. **Initialize and configure styles**
2. **Add elements** (shapes, text, arrows, etc.)
3. **Create the drawing** (new file) or **add to an existing view**

```javascript
const ea = window.ExcalidrawAutomate;
ea.reset();

// 1. Configure styles
ea.style.strokeColor = "#1e1e1e";
ea.style.backgroundColor = "#a5d8ff";
ea.style.fillStyle = "solid";
ea.style.roughness = 1;
ea.style.fontSize = 20;

// 2. Add elements
const rect = ea.addRect(0, 0, 200, 100);
ea.addText(100, 50, "Hello", { textAlign: "center", verticalAlign: "middle", box: false });

// 3. Create the drawing file
await ea.create({ filename: "My Drawing", foldername: "Drawings" });
```

### Multiline Scripts via CLI

The `obsidian eval` command takes a single `code=` string. For multiline scripts, use semicolons or encode carefully. For complex scripts, write to a temp file and use `obsidian eval`:

```bash
obsidian eval code="const ea = window.ExcalidrawAutomate; ea.reset(); ea.style.strokeColor = '#1e1e1e'; ea.addRect(0, 0, 200, 100); await ea.create({filename: 'Test', foldername: 'Drawings'});"
```

For longer scripts, write a `.js` file and execute it:

```bash
cat > /tmp/ea_script.js << 'SCRIPT'
const ea = window.ExcalidrawAutomate;
ea.reset();
// ... your script ...
await ea.create({filename: "My Drawing", foldername: "Drawings"});
SCRIPT
obsidian eval code="$(cat /tmp/ea_script.js | tr '\n' ' ')"
```

### Element Creation Methods

All element methods return a string ID. Use these IDs for grouping, connecting, and referencing.

#### Shapes

```javascript
ea.addRect(x, y, width, height, id?)        // Rectangle
ea.addEllipse(x, y, width, height, id?)     // Ellipse/circle
ea.addDiamond(x, y, width, height, id?)     // Diamond/rhombus
ea.addBlob(x, y, width, height, id?)        // Organic blob shape
ea.addFrame(x, y, width, height, name?)     // Frame container
```

All shapes take top-left corner coordinates (x, y) and dimensions.

#### Text

```javascript
ea.addText(x, y, "Your text", formatting?, id?)
```

The optional `formatting` object supports:
- `width` (number) — fixed width for wrapping
- `textAlign` — `"left"` | `"center"` | `"right"`
- `verticalAlign` — `"top"` | `"middle"`
- `box` (boolean) — wrap text in a box when `true`; when combined with a shape ID, binds text as a label
- `boxPadding` (number) — padding inside the box
- `boxStrokeColor` — override box stroke color

#### Lines and Arrows

```javascript
ea.addLine(points, id?)     // points: [[x1,y1], [x2,y2], ...]
ea.addArrow(points, formatting?, id?)
```

Arrow formatting options:
- `startArrowHead` — `"arrow"` | `"bar"` | `"dot"` | `"none"`
- `endArrowHead` — `"arrow"` | `"bar"` | `"dot"` | `"none"`

#### Connections Between Objects

```javascript
ea.connectObjects(
  objectA_id, "right",    // from element, from side
  objectB_id, "left",     // to element, to side
  {
    numberOfPoints: 2,
    startArrowHead: "none",
    endArrowHead: "arrow",
    padding: 10
  }
);
```

Sides: `"top"` | `"right"` | `"bottom"` | `"left"`

#### Special Elements

```javascript
ea.addImage(x, y, imageFile, scale?, anchor?)   // Embed an image
ea.addLaTex(x, y, texString, scaleX?, scaleY?)  // LaTeX formula
ea.addMermaid(diagramString, groupElements?)     // Mermaid diagram
ea.addIFrame(x, y, w, h, url?, file?)           // Embedded iframe
```

### Grouping and Frames

```javascript
// Group elements together
const groupId = ea.addToGroup([id1, id2, id3]);

// Add elements to a frame
ea.addElementsToFrame(frameId, [id1, id2]);
```

### Style Properties

Set these on `ea.style` **before** creating elements — they apply to all subsequently created elements.

| Property | Values | Default |
|---|---|---|
| `strokeColor` | Hex string (`"#1e1e1e"`) or color name | `"#1e1e1e"` |
| `backgroundColor` | Hex string or `"transparent"` | `"transparent"` |
| `fillStyle` | `"hachure"`, `"cross-hatch"`, `"solid"` | `"hachure"` |
| `strokeWidth` | Number (line thickness) | `1` |
| `strokeStyle` | `"solid"`, `"dashed"`, `"dotted"` | `"solid"` |
| `roughness` | `0` (Architect), `1` (Artist), `2` (Cartoonist) | `1` |
| `opacity` | `0` to `100` | `100` |
| `fontSize` | Number in pixels | `20` |
| `fontFamily` | `1` (Hand-drawn), `2` (Normal), `3` (Monospace) | `1` |
| `textAlign` | `"left"`, `"center"`, `"right"` | `"left"` |
| `verticalAlign` | `"top"`, `"middle"` | `"top"` |
| `startArrowHead` | `"arrow"`, `"bar"`, `"dot"`, `"none"` | `"none"` |
| `endArrowHead` | `"arrow"`, `"bar"`, `"dot"`, `"none"` | `"arrow"` |
| `angle` | Radians | `0` |

You can also use setter functions for enum-style properties:
- `ea.setFillStyle(0)` → `"hachure"`, `(1)` → `"cross-hatch"`, `(2)` → `"solid"`
- `ea.setStrokeStyle(0)` → `"solid"`, `(1)` → `"dashed"`, `(2)` → `"dotted"`
- `ea.setFontFamily(1)` → Hand-drawn, `(2)` → Normal, `(3)` → Monospace
- `ea.setStrokeSharpness(0)` → `"round"`, `(1)` → `"sharp"`

### Canvas Properties

```javascript
ea.canvas.theme = "light";           // or "dark"
ea.canvas.viewBackgroundColor = "#ffffff";
ea.canvas.gridSize = 20;
```

### Creating and Saving

```javascript
// Create a new .excalidraw.md file in the vault
await ea.create({
  filename: "Drawing Name",    // without extension
  foldername: "Path/In/Vault", // folder path from vault root
  templatePath: "path/to/template.excalidraw",  // optional
  onNewPane: false             // true to open in new pane
});

// Or add elements to an already-open drawing
ea.setView(view);              // target an open Excalidraw view
await ea.addElementsToView();  // commit elements to that view

// Export to image formats
const svg = await ea.createSVG();
const png = await ea.createPNG();
```

### Working with Existing Drawings

```javascript
// Load elements from a file
const scene = await ea.getSceneFromFile(file);

// Copy view elements to the workbench for editing
ea.copyViewElementsToEAforEditing();

// Get specific elements
const elements = ea.getViewElements();
const selected = ea.getViewSelectedElements();

// Delete elements
ea.deleteViewElements([id1, id2]);

// Zoom to specific elements
ea.viewZoomToElements([id1, id2]);
```

### Utility Methods

```javascript
ea.measureText("Hello", { fontSize: 20 })  // → {width, height}
ea.getBoundingBox([id1, id2])               // → {x, y, width, height}
ea.wrapText("Long text...", 40)             // Wrap at character limit
ea.generateElementId()                       // New unique ID
ea.clear()                                   // Clear workbench
ea.reset()                                   // Full reset to defaults

// Color utilities
ea.hexStringToRgb("#ff0000")                // → [255, 0, 0]
ea.rgbToHexString(255, 0, 0)               // → "#ff0000"
ea.colorNameToHex("red")                    // → "#ff0000"
```

---

## Mode 2: File-Based Creation via MCP

When the CLI isn't available, create Excalidraw files by writing the raw file format directly.

### Excalidraw File Structure in Obsidian

An `.excalidraw.md` file in Obsidian has this structure:

```markdown
---
excalidraw-plugin: parsed
tags: [excalidraw]
---
==⚠ Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==

# Excalidraw Data
## Text Elements

## Drawing
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://github.com/zsviczian/obsidian-excalidraw-plugin",
  "elements": [],
  "appState": {
    "theme": "light",
    "viewBackgroundColor": "#ffffff",
    "gridSize": null
  },
  "files": {}
}
```
%%
```

### Element JSON Format

Each element in the `elements` array is a JSON object. Here are the core element types:

#### Rectangle
```json
{
  "type": "rectangle",
  "id": "unique-id-here",
  "x": 0, "y": 0,
  "width": 200, "height": 100,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "angle": 0,
  "seed": 12345,
  "version": 1,
  "isDeleted": false,
  "boundElements": null,
  "groupIds": [],
  "roundness": {"type": 3}
}
```

#### Text
```json
{
  "type": "text",
  "id": "text-id",
  "x": 50, "y": 30,
  "width": 100, "height": 25,
  "text": "Hello World",
  "fontSize": 20,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "roughness": 1,
  "opacity": 100,
  "angle": 0,
  "seed": 67890,
  "version": 1,
  "isDeleted": false,
  "containerId": null,
  "originalText": "Hello World",
  "lineHeight": 1.25
}
```

#### Arrow
```json
{
  "type": "arrow",
  "id": "arrow-id",
  "x": 200, "y": 50,
  "width": 150, "height": 0,
  "points": [[0, 0], [150, 0]],
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 1,
  "opacity": 100,
  "angle": 0,
  "seed": 11111,
  "version": 1,
  "isDeleted": false,
  "startBinding": null,
  "endBinding": null
}
```

### Creating a File via MCP

Use the Obsidian MCP to write the file:

```
Tool: mcp__mcp-obsidian__obsidian_append_content
filepath: "Drawings/My Diagram.excalidraw.md"
content: <the full .excalidraw.md content>
```

Or create the note first, then set content. The file will be recognized by the Excalidraw plugin when opened.

### ID Generation for File Mode

Generate random IDs for elements. Any unique string works — Excalidraw uses random alphanumeric strings like `"aBcDeFgHiJ"` (typically 8-10 chars). Consistency matters more than format.

---

## Layout Strategies

When creating diagrams programmatically, plan the layout before placing elements.

### Grid Layout
For uniform arrangements (org charts, tables):
- Pick a cell size (e.g., 220×120 with 30px gap)
- Place elements at `(col * cellW, row * cellH)`

### Flow Layout
For sequential processes:
- Place items left-to-right or top-to-bottom
- Connect with arrows using `connectObjects`
- Leave 60-100px between elements for arrow spacing

### Radial Layout
For concept maps with a central node:
- Place center element at (0, 0)
- Calculate positions using `cos(angle) * radius` and `sin(angle) * radius`
- Connect spokes from center to each outer node

### Measuring and Positioning Text
Use `ea.measureText()` to get the pixel dimensions of text before placing it — this prevents text from overflowing containers. When centering text in a shape, calculate:
```javascript
const textSize = ea.measureText("My Label", { fontSize: 20 });
const textX = shapeX + (shapeWidth - textSize.width) / 2;
const textY = shapeY + (shapeHeight - textSize.height) / 2;
```

---

## Embedding Drawings in Notes

Excalidraw drawings can be embedded in regular Obsidian markdown notes:

```markdown
![[My Drawing.excalidraw]]           Full drawing
![[My Drawing.excalidraw|300]]       With width constraint
![[My Drawing.excalidraw|300x200]]   With width and height
```

To embed as an auto-updating SVG or PNG (rendered image, not interactive):
- In Excalidraw plugin settings, configure auto-export to SVG/PNG
- Then embed: `![[My Drawing.svg]]`

---

## Reference

For the complete TypeScript API definitions (100+ methods), see [references/API.md](references/API.md).
