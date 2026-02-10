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


def generate():
    topic_dirs = [
        os.path.join(KNOWLEDGE, n)
        for n in sorted(os.listdir(KNOWLEDGE))
        if os.path.isdir(os.path.join(KNOWLEDGE, n))
    ]

    nodes = []
    edges = []
    state = {"y": 0}

    def place_subtree(tr, dir_abs, depth, parent_id):
        rel = os.path.relpath(hub(dir_abs), VAULT_ROOT)
        cid = nid(rel)
        cx = X_MAIN + depth * X_SUBTOPIC_OFFSET
        nodes.append(
            {
                "id": cid,
                "type": "file",
                "file": rel,
                "x": cx,
                "y": state["y"],
                "width": NODE_W,
                "height": NODE_H,
            }
        )
        edges.append(
            {
                "id": eid(parent_id, cid),
                "fromNode": parent_id,
                "fromSide": "right",
                "toNode": cid,
                "toSide": "left",
            }
        )
        state["y"] += Y_SUBTOPIC_SPACING
        for gc in tr.get(dir_abs, []):
            if depth + 1 <= MAX_DEPTH:
                place_subtree(tr, gc, depth + 1, cid)

    for i, td in enumerate(topic_dirs):
        rel = os.path.relpath(hub(td), VAULT_ROOT)
        tid = nid(rel)
        topic_y = state["y"]
        nodes.append(
            {
                "id": tid,
                "type": "file",
                "file": rel,
                "x": X_MAIN,
                "y": topic_y,
                "width": NODE_W,
                "height": NODE_H,
            }
        )

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
            state["y"] = topic_y
            for c in children:
                place_subtree(tr, c, 1, tid)
            state["y"] = max(state["y"], topic_y + NODE_H) + Y_TOPIC_SPACING
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
