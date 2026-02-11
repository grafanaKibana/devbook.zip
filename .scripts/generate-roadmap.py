#!/usr/bin/env python3
"""Regenerate Knowledge/Roadmap.canvas from the folder structure under Knowledge/.

Usage:
    python3 .sisyphus/generate-roadmap.py

Called automatically by the git pre-commit hook.
"""

import os
import json
import hashlib
import sys
import datetime
from collections import Counter

VAULT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWLEDGE = os.path.join(VAULT_ROOT, "Knowledge")
CANVAS_PATH = os.path.join(KNOWLEDGE, "Roadmap.canvas")
MAX_DEPTH = 3

NODE_W = 340
NODE_H = 80
X_SUBTOPIC_OFFSET = 420
X_MAIN = 0

# Vertical layout tuning.
NODE_V_GAP = 40
TOPIC_V_GAP = 160
STEP_Y = NODE_H + NODE_V_GAP


# Status values are defined by Templates/Template - Concept Page.md.
# Colors follow JSON Canvas spec: either hex (#RRGGBB) or palette ids "1".."6".
# Palette ids are theme-friendly; hex is used for a neutral gray Not-Started.
STATUS_COLORS = {
    "Not-Started": "1",  # red
    "Creation": "2",  # orange
    "Repetition": "5",  # cyan
    "Ready To Repeat": "6",  # purple
    "Done": "4",  # green
}


PALETTE_NAMES = {
    "1": "red",
    "2": "orange",
    "3": "yellow",
    "4": "green",
    "5": "cyan",
    "6": "purple",
}

# Folder hub nodes are colored based on the rollup of descendant concept pages.
HUB_STATUS_MODE = "rollup"  # "rollup" | "frontmatter"

# Child placement aims to reduce overall vertical height.
CHILD_PLACEMENT = "masonry"  # "alternate" | "masonry"

ADD_LEGEND = True


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
            # Still record the node so rollups/colors can apply to leaf folders.
            t.setdefault(d2, [])
            return
        ch = subdirs(d2)
        t[d2] = ch
        for c in ch:
            walk(c, depth + 1)

    walk(d, 1)
    return t


def is_hub_note_path(md_abs_path):
    d = os.path.dirname(md_abs_path)
    base = os.path.basename(d)
    return os.path.basename(md_abs_path) == base + ".md"


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


def rollup_status_from_counts(counts):
    total = sum(counts.values())
    if total == 0:
        return None
    if counts.get("Done", 0) == total:
        return "Done"
    # Worst-first: if anything is not started, folder isn't done.
    if counts.get("Not-Started", 0) > 0:
        return "Not-Started"
    if counts.get("Creation", 0) > 0:
        return "Creation"
    if counts.get("Repetition", 0) > 0:
        return "Repetition"
    if counts.get("Ready To Repeat", 0) > 0:
        return "Ready To Repeat"
    return "Not-Started"


def generate():
    topic_dirs = [
        os.path.join(KNOWLEDGE, n)
        for n in sorted(os.listdir(KNOWLEDGE))
        if os.path.isdir(os.path.join(KNOWLEDGE, n))
    ]

    nodes = []
    edges = []
    state = {"y": 0}
    file_status_cache = {}
    node_status_counts = Counter()

    def file_status(md_abs_path):
        v = file_status_cache.get(md_abs_path, "__MISSING__")
        if v != "__MISSING__":
            return v
        v = read_frontmatter_status(md_abs_path)
        file_status_cache[md_abs_path] = v
        return v

    def hub_status_for_dir(dir_abs, rollup_status_by_dir):
        if HUB_STATUS_MODE == "frontmatter":
            return file_status(hub(dir_abs))
        else:
            s = rollup_status_by_dir.get(dir_abs)
            # If there are no descendant concept pages, fall back to hub frontmatter.
            if s is None:
                return file_status(hub(dir_abs))
            return s

    def hub_color_for_dir(dir_abs, rollup_status_by_dir):
        return color_for_status(hub_status_for_dir(dir_abs, rollup_status_by_dir))

    def place_subtree(tr, dir_abs, depth, parent_id, y, direction, rollup_status_by_dir):
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
        st = hub_status_for_dir(dir_abs, rollup_status_by_dir)
        if st:
            node_status_counts[st] += 1
        c = color_for_status(st)
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
        y += STEP_Y
        for gc in tr.get(dir_abs, []):
            if depth + 1 <= MAX_DEPTH:
                y = place_subtree(
                    tr, gc, depth + 1, cid, y, direction, rollup_status_by_dir
                )
        return y

    def subtree_node_count(tr, dir_abs, depth):
        if depth > MAX_DEPTH:
            return 0
        total = 1
        for ch in tr.get(dir_abs, []):
            total += subtree_node_count(tr, ch, depth + 1)
        return total

    def build_rollup_status_by_dir(tr, root_dir_abs):
        # Aggregate statuses from ALL descendant concept pages (non-hub notes),
        # regardless of MAX_DEPTH used for the canvas layout.
        dirs = set(tr.keys())
        counts_by_dir = {d: Counter() for d in dirs}

        for dirpath, dirnames, filenames in os.walk(root_dir_abs):
            dirnames[:] = [dn for dn in dirnames if not dn.startswith(".")]
            for fn in filenames:
                if fn.startswith(".") or not fn.endswith(".md"):
                    continue
                p = os.path.join(dirpath, fn)
                if is_hub_note_path(p):
                    continue

                s = file_status(p)
                if not s:
                    continue

                cur = dirpath
                while True:
                    if cur in counts_by_dir:
                        counts_by_dir[cur][s] += 1
                    if cur == root_dir_abs:
                        break
                    parent = os.path.dirname(cur)
                    if parent == cur:
                        break
                    if not cur.startswith(root_dir_abs):
                        break
                    cur = parent

        out = {}
        for d in dirs:
            out[d] = rollup_status_from_counts(counts_by_dir.get(d, Counter()))
        return out

    for i, td in enumerate(topic_dirs):
        rel = os.path.relpath(hub(td), VAULT_ROOT)
        tid = nid(rel)
        topic_y = state["y"]

        tr = build_tree(td)
        rollup_status_by_dir = build_rollup_status_by_dir(tr, td)

        n = {
            "id": tid,
            "type": "file",
            "file": rel,
            "x": X_MAIN,
            "y": topic_y,
            "width": NODE_W,
            "height": NODE_H,
        }
        st = hub_status_for_dir(td, rollup_status_by_dir)
        if st:
            node_status_counts[st] += 1
        c = color_for_status(st)
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

        children = tr.get(td, [])
        if children:
            left_y = topic_y
            right_y = topic_y
            for ci, cdir in enumerate(children):
                if CHILD_PLACEMENT == "alternate":
                    side = +1 if (ci % 2 == 0) else -1
                else:
                    h = subtree_node_count(tr, cdir, 1) * STEP_Y
                    right_score = max(right_y + h, left_y)
                    left_score = max(left_y + h, right_y)
                    side = +1 if right_score <= left_score else -1

                if side >= 0:
                    right_y = place_subtree(
                        tr, cdir, 1, tid, right_y, +1, rollup_status_by_dir
                    )
                else:
                    left_y = place_subtree(
                        tr, cdir, 1, tid, left_y, -1, rollup_status_by_dir
                    )

            state["y"] = max(left_y, right_y, topic_y + NODE_H) + TOPIC_V_GAP
        else:
            state["y"] = topic_y + NODE_H + TOPIC_V_GAP

    if ADD_LEGEND and nodes:
        min_x = min(n.get("x", 0) for n in nodes)
        min_y = min(n.get("y", 0) for n in nodes)
        ts = datetime.datetime.now().astimezone().isoformat(timespec="seconds")

        legend_x = min_x
        legend_y = min_y - (STEP_Y * 4)

        legend_w = 380

        nodes.append(
            {
                "id": nid("__roadmap_legend_header__"),
                "type": "text",
                "text": "\n".join(
                    [
                        "#### Roadmap legend",
                        f"**Generated:** {ts}",
                        f"**Hub status mode:** {HUB_STATUS_MODE}",
                    ]
                ),
                "x": legend_x,
                "y": legend_y,
                "width": legend_w,
                "height": 140,
            }
        )

        status_order = [
            "Not-Started",
            "Creation",
            "Ready To Repeat",
            "Repetition",
            "Done",
        ]

        row_y = legend_y + 160
        for st in status_order:
            c = STATUS_COLORS.get(st)
            n = {
                "id": nid(f"__roadmap_legend__{st}"),
                "type": "text",
                "text": f"{st}: {node_status_counts.get(st, 0)}",
                "x": legend_x,
                "y": row_y,
                "width": legend_w,
                "height": 60,
            }
            if c:
                n["color"] = c
            nodes.append(n)
            row_y += 70

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
