#!/usr/bin/env python3
"""Regenerate Vault/Home/Roadmap.canvas from folder structure.

Usage:
    python3 .scripts/generate-roadmap.py

Called automatically by the git pre-commit hook.
"""

import os
import json
import hashlib
import sys
import datetime
from collections import Counter
from typing import Any

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VAULT_ROOT = os.path.join(REPO_ROOT, "Vault")
KNOWLEDGE = os.path.join(VAULT_ROOT, "Home")
CANVAS_PATH = os.path.join(KNOWLEDGE, "Roadmap.canvas")
MAX_DEPTH = 5

DG_ROADMAP_PERMALINK = "/roadmap/"
DG_ROADMAP_FRONTMATTER = {
    "publish": True,
    "permalink": DG_ROADMAP_PERMALINK,
    "title": "Roadmap",
}
CANVAS_METADATA_VERSION = "1.0-1.0"

NODE_W = 340
NODE_H = 80
X_SUBTOPIC_OFFSET = 420
X_MAIN = 0

# Vertical layout tuning.
NODE_V_GAP = 40
TOPIC_V_GAP = 160
STEP_Y = NODE_H + NODE_V_GAP


# Colors follow JSON Canvas spec: either hex (#RRGGBB) or palette ids "1".."6".
# Palette ids are theme-friendly; hex is used for a neutral gray Not-Started.
STATUS_COLORS = {
    "Not-Started": "1",  # red
    "Creation": "2",  # orange
    "Repetition": "5",  # cyan
    "Ready to Repeat": "6",  # purple
    "Done": "4",  # green
}


# Folder hub nodes are colored based on the rollup of descendant concept pages.
HUB_STATUS_MODE = "rollup"  # "rollup" | "frontmatter"

# Child placement aims to reduce overall vertical height.
CHILD_PLACEMENT = "masonry"  # "alternate" | "masonry"

ADD_LEGEND = True

# Legend layout.
LEGEND_CARD_H = 60
LEGEND_CARD_GAP = 16

VALID_STATUSES = frozenset(STATUS_COLORS.keys())


def nid(path):
    return "n_" + hashlib.sha1(path.encode()).hexdigest()[:10]


def eid(a, b):
    return "e_" + hashlib.sha1((a + "->" + b).encode()).hexdigest()[:10]


LEGEND_HEADER_ID = nid("__roadmap_legend_header__")


def hub(d):
    return os.path.join(d, os.path.basename(d) + ".md")


def canvas_title_link(rel_md_path):
    p = rel_md_path
    if p.endswith(".md"):
        p = p[:-3]
    title = os.path.splitext(os.path.basename(rel_md_path))[0]
    return f"# [[{p}|{title}]]"


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
    def split_frontmatter_lines(content):
        if not content.startswith("---"):
            return None

        lines = content.splitlines(keepends=True)
        if not lines:
            return None
        if lines[0].strip() != "---":
            return None

        end_idx = None
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                end_idx = i
                break

        if end_idx is None:
            return None

        return [ln.rstrip("\n") for ln in lines[1:end_idx]]

    def read_scalar_or_first_list_item(fm_lines, key):
        want = key + ":"
        for i, ln in enumerate(fm_lines):
            stripped = ln.strip()
            if not stripped.startswith(want):
                continue

            value = stripped.split(":", 1)[1].strip()
            if value:
                if value.startswith("[") and value.endswith("]"):
                    inner = value[1:-1].strip()
                    if inner:
                        value = inner.split(",", 1)[0].strip()
                if (value.startswith('"') and value.endswith('"')) or (
                    value.startswith("'") and value.endswith("'")
                ):
                    value = value[1:-1]
                return value or None

            for j in range(i + 1, len(fm_lines)):
                s2 = fm_lines[j].strip()
                if not s2:
                    continue
                if s2.startswith("-"):
                    v2 = s2[1:].strip()
                    if (v2.startswith('"') and v2.endswith('"')) or (
                        v2.startswith("'") and v2.endswith("'")
                    ):
                        v2 = v2[1:-1]
                    return v2 or None
                if ":" in s2:
                    return None
            return None

        return None

    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()
    except (FileNotFoundError, UnicodeDecodeError, OSError):
        return None, None

    fm_lines = split_frontmatter_lines(content)
    if fm_lines is None:
        return None, None

    status = read_scalar_or_first_list_item(fm_lines, "status")
    if status is None:
        return None, None
    if status not in VALID_STATUSES:
        return None, status

    return status, None


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


def normalize_canvas_for_comparison(canvas: dict[str, Any]) -> dict[str, Any]:
    normalized = json.loads(json.dumps(canvas))
    for node in normalized.get("nodes", []):
        if node.get("id") != LEGEND_HEADER_ID:
            continue
        text = str(node.get("text", ""))
        text_lines = [ln for ln in text.splitlines() if not ln.startswith("**Generated:**")]
        node["text"] = "\n".join(text_lines)
        break
    return normalized


def write_canvas_if_changed(canvas: dict[str, Any], path: str) -> bool:
    new_normalized = normalize_canvas_for_comparison(canvas)

    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            old_normalized = normalize_canvas_for_comparison(existing)
            if old_normalized == new_normalized:
                return False
        except (OSError, json.JSONDecodeError):
            pass

    with open(path, "w", encoding="utf-8") as f:
        json.dump(canvas, f, indent=2)
        f.write("\n")
    return True


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
    invalid_status_by_file = {}

    def file_status(md_abs_path):
        v = file_status_cache.get(md_abs_path, "__MISSING__")
        if v != "__MISSING__":
            return v
        parsed_status, invalid_status = read_frontmatter_status(md_abs_path)
        if invalid_status is not None:
            invalid_status_by_file[md_abs_path] = invalid_status
        file_status_cache[md_abs_path] = parsed_status
        return parsed_status

    def hub_status_for_dir(dir_abs, rollup_status_by_dir):
        if HUB_STATUS_MODE == "frontmatter":
            return file_status(hub(dir_abs))
        else:
            s = rollup_status_by_dir.get(dir_abs)
            # If there are no descendant concept pages, fall back to hub frontmatter.
            if s is None:
                return file_status(hub(dir_abs))
            return s

    def place_subtree(tr, dir_abs, depth, parent_id, y, direction, rollup_status_by_dir):
        rel = os.path.relpath(hub(dir_abs), VAULT_ROOT)
        cid = nid(rel)
        cx = X_MAIN + (direction * depth * X_SUBTOPIC_OFFSET)
        n = {
            "id": cid,
            "type": "text",
            "text": canvas_title_link(rel),
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
            "type": "text",
            "text": canvas_title_link(rel),
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
        ts = datetime.datetime.now().astimezone().strftime("%b %d %Y | %I:%M%p")

        legend_x = min_x - 600
        legend_y = 0
        legend_w = 500

        status_flow = [
            "Not-Started",
            "Creation",
            "Repetition",
            "Ready To Repeat",
            "Done",
        ]

        # Legend group (visual wrapper).
        col_w = 380
        header_h = 110
        pad = 20
        rows = len(status_flow)
        group_w = legend_w + (pad * 2)
        group_h = (
            pad
            + header_h
            + LEGEND_CARD_GAP
            + (rows * LEGEND_CARD_H)
            + ((rows - 1) * LEGEND_CARD_GAP)
            + pad
        )

        # Place group behind the legend nodes.
        nodes.append(
            {
                "id": nid("__roadmap_legend_group__"),
                "type": "group",
                "label": "Legend",
                "x": legend_x - pad,
                "y": legend_y - pad,
                "width": group_w,
                "height": group_h,
            }
        )

        # Header node inside the group.
        nodes.append(
            {
                "id": nid("__roadmap_legend_header__"),
                "type": "text",
                "text": "\n".join(
                    [
                        "#### Roadmap legend",
                        f"**Generated:** {ts}",
                    ]
                ),
                "x": legend_x,
                "y": legend_y,
                "width": legend_w,
                "height": header_h,
            }
        )

        # Status cards in a single column; arrows still alternate sides.
        cards = []
        base_y = legend_y + header_h + LEGEND_CARD_GAP
        left_x = legend_x + 60

        for i, st in enumerate(status_flow):
            cx = left_x
            cy = base_y + i * (LEGEND_CARD_H + LEGEND_CARD_GAP)
            c = STATUS_COLORS.get(st)
            card_id = nid(f"__roadmap_legend__{st}")
            n = {
                "id": card_id,
                "type": "text",
                "text": f"{st}: {node_status_counts.get(st, 0)}",
                "x": cx,
                "y": cy,
                "width": col_w,
                "height": LEGEND_CARD_H,
            }
            if c:
                n["color"] = c
            nodes.append(n)
            cards.append({"id": card_id, "x": cx, "y": cy, "status": st, "color": c})

        # Connect status cards with arrows; edge color matches the source card.
        # Side rules:
        # - Edges alternate start side: right, left, right, left...
        # - If an edge starts from left, it ends on left of the next card.
        # - If an edge starts from right, it ends on right of the next card.
        for idx, (a, b) in enumerate(zip(cards, cards[1:])):
            from_side = "right" if (idx % 2 == 0) else "left"
            to_side = from_side
            e = {
                "id": eid(a["id"], b["id"]),
                "fromNode": a["id"],
                "fromSide": from_side,
                "toNode": b["id"],
                "toSide": to_side,
            }
            if a.get("color"):
                e["color"] = a["color"]
            edges.append(e)

    return (
        {
            "nodes": nodes,
            "edges": edges,
            "metadata": {
                "version": CANVAS_METADATA_VERSION,
                "frontmatter": DG_ROADMAP_FRONTMATTER,
            },
        },
        invalid_status_by_file,
    )


def main():
    canvas, invalid_status_by_file = generate()

    wrote = write_canvas_if_changed(canvas, CANVAS_PATH)

    for path, status in sorted(invalid_status_by_file.items()):
        rel = os.path.relpath(path, REPO_ROOT).replace("\\", "/")
        print(f"[WARN] invalid status {status!r} in {rel}", file=sys.stderr)

    print(
        f"Roadmap.canvas: {len(canvas['nodes'])} nodes, {len(canvas['edges'])} edges ({'updated' if wrote else 'no changes'})"
    )


if __name__ == "__main__":
    main()
