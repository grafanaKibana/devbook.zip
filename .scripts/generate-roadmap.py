#!/usr/bin/env python3
"""Regenerate Knowledge/Roadmap.canvas from the folder structure under Knowledge/.

Usage:
    python3 .sisyphus/generate-roadmap.py

Called automatically by the git pre-commit hook.
"""

import os, json, hashlib, sys

VAULT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWLEDGE = os.path.join(VAULT_ROOT, "Knowledge")
CANVAS_PATH = os.path.join(KNOWLEDGE, "Roadmap.canvas")
MAX_DEPTH = 3

NODE_W = 340
NODE_H = 80
Y_TOPIC_SPACING = 220
X_SUBTOPIC_OFFSET = 420
Y_SUBTOPIC_SPACING = 120
X_MAIN = 0


STATUS_COLORS = {
    # Using hex so we can get a neutral gray for Not-Started.
    # Status values are defined by Templates/Template - Concept Page.md.
    "Not-Started": "#9CA3AF",
    "Creation": "#F59E0B",
    "Repetition": "#06B6D4",
    "Ready To Repeat": "#A855F7",
    "Done": "#10B981",
}


def nid(path):
    return "n_" + hashlib.sha1(path.encode()).hexdigest()[:10]


def eid(a, b):
    return "e_" + hashlib.sha1((a + "->" + b).encode()).hexdigest()[:10]


def hub(d):
    return os.path.join(d, os.path.basename(d) + ".md")


def subdirs(d):
    try:
        entries = os.listdir(d)
    except FileNotFoundError:
        return []
    return sorted(
        [
            os.path.join(d, e)
            for e in entries
            if not e.startswith(".") and os.path.isdir(os.path.join(d, e))
        ]
    )


def build_tree(d):
    t = {}

    def walk(d2, depth):
        if depth > MAX_DEPTH:
            return
        ch = subdirs(d2)
        t[d2] = ch
        for c in ch:
            walk(c, depth + 1)

    walk(d, 1)
    return t


def read_frontmatter_status(abs_path):
    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            first = f.readline()
            if first.strip() != "---":
                return None
            in_status_block = False
            for line in f:
                s = line.rstrip("\n")
                stripped = s.strip()
                if stripped == "---":
                    break

                if in_status_block:
                    st = stripped
                    if not st:
                        continue

                    # Handle list-form status:
                    # status:\n  - Done
                    if st.startswith("-"):
                        v = st[1:].strip()
                        if (v.startswith('"') and v.endswith('"')) or (
                            v.startswith("'") and v.endswith("'")
                        ):
                            v = v[1:-1]
                        return v or None

                    # Stop if we hit another key.
                    if ":" in st:
                        break
                    continue

                if not stripped.lower().startswith("status:"):
                    continue

                v = stripped.split(":", 1)[1].strip()

                # status: Done
                if v:
                    if v.startswith("[") and v.endswith("]"):
                        inner = v[1:-1].strip()
                        if inner:
                            first_item = inner.split(",", 1)[0].strip()
                            v = first_item
                    if (v.startswith('"') and v.endswith('"')) or (
                        v.startswith("'") and v.endswith("'")
                    ):
                        v = v[1:-1]
                    return v or None

                # status: (with value on following lines)
                in_status_block = True
    except (FileNotFoundError, UnicodeDecodeError, OSError):
        return None
    return None


def color_for_status(status):
    if not status:
        return None
    return STATUS_COLORS.get(status)


def generate():
    topic_dirs = [
        os.path.join(KNOWLEDGE, n)
        for n in sorted(os.listdir(KNOWLEDGE))
        if os.path.isdir(os.path.join(KNOWLEDGE, n))
    ]

    nodes = []
    edges = []
    state = {"y": 0}
    status_cache = {}

    def node_color(rel_path):
        c = status_cache.get(rel_path, "__MISSING__")
        if c != "__MISSING__":
            return c
        abs_path = os.path.join(VAULT_ROOT, rel_path)
        status = read_frontmatter_status(abs_path)
        c = color_for_status(status)
        status_cache[rel_path] = c
        return c

    def place_subtree(tr, dir_abs, depth, parent_id, y, direction):
        rel = os.path.relpath(hub(dir_abs), VAULT_ROOT)
        cid = nid(rel)
        cx = X_MAIN + (direction * depth * X_SUBTOPIC_OFFSET)
        n = {
            "id": cid,
            "type": "file",
            "file": rel,
            "x": cx,
            "y": y,
            "width": NODE_W,
            "height": NODE_H,
        }
        c = node_color(rel)
        if c:
            n["color"] = c
        nodes.append(n)
        if direction >= 0:
            from_side, to_side = "right", "left"
        else:
            from_side, to_side = "left", "right"
        edges.append(
            {
                "id": eid(parent_id, cid),
                "fromNode": parent_id,
                "fromSide": from_side,
                "toNode": cid,
                "toSide": to_side,
            }
        )
        y += Y_SUBTOPIC_SPACING
        for gc in tr.get(dir_abs, []):
            if depth + 1 <= MAX_DEPTH:
                y = place_subtree(tr, gc, depth + 1, cid, y, direction)
        return y

    for i, td in enumerate(topic_dirs):
        rel = os.path.relpath(hub(td), VAULT_ROOT)
        tid = nid(rel)
        topic_y = state["y"]
        n = {
            "id": tid,
            "type": "file",
            "file": rel,
            "x": X_MAIN,
            "y": topic_y,
            "width": NODE_W,
            "height": NODE_H,
        }
        c = node_color(rel)
        if c:
            n["color"] = c
        nodes.append(n)

        if i > 0:
            prev_rel = os.path.relpath(hub(topic_dirs[i - 1]), VAULT_ROOT)
            pid = nid(prev_rel)
            edges.append(
                {
                    "id": eid(pid, tid),
                    "fromNode": pid,
                    "fromSide": "bottom",
                    "toNode": tid,
                    "toSide": "top",
                }
            )

        tr = build_tree(td)
        children = tr.get(td, [])
        if children:
            left_y = topic_y
            right_y = topic_y
            for ci, c in enumerate(children):
                if ci % 2 == 0:
                    right_y = place_subtree(tr, c, 1, tid, right_y, +1)
                else:
                    left_y = place_subtree(tr, c, 1, tid, left_y, -1)
            state["y"] = max(left_y, right_y, topic_y + NODE_H) + Y_TOPIC_SPACING
        else:
            state["y"] = topic_y + NODE_H + Y_TOPIC_SPACING

    return {"nodes": nodes, "edges": edges}


def main():
    canvas = generate()
    with open(CANVAS_PATH, "w", encoding="utf-8") as f:
        json.dump(canvas, f, indent=2)
        f.write("\n")
    print(
        f"Roadmap.canvas: {len(canvas['nodes'])} nodes, {len(canvas['edges'])} edges"
    )


if __name__ == "__main__":
    main()
