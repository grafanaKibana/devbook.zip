#!/usr/bin/env python3
"""Safely migrate DevBook interview callouts from QUESTION to stock Qard.

The utility is intentionally repository-specific. It inventories only Markdown
cards in exact ``# Questions`` sections below ``Vault/Home`` and stores one
manifest used by dry-run, apply, verify, and rollback.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Iterable


VERSION = 1
DEFAULT_REPO_ROOT = Path(__file__).resolve().parent.parent
HEADER_RE = re.compile(
    r"^(?P<prefix>[^\S\r\n]{0,3}>[^\S\r\n]*\[!)(?P<kind>question|qard)"
    r"(?P<suffix>\](?P<fold>[+-]?)(?:[^\S\r\n]+(?P<title>.*))?)(?P<eol>\r\n|\n|\r|)$",
    re.IGNORECASE,
)
NATIVE_QARD_HEADER_RE = re.compile(r"^ {0,3}> ?\[!qard\][+-]?(?:[ \t]+.*)?$", re.IGNORECASE)
QUOTE_RE = re.compile(r"^ {0,3}> ?(?P<text>.*?)(?:\r\n|\n|\r)?$")
FENCE_RE = re.compile(r"^ {0,3}(?P<fence>`{3,}|~{3,})")
QUESTION_HEADING_RE = re.compile(r"^# Questions[ \t]*(?:\r\n|\n|\r)?$")
H1_RE = re.compile(r"^# [^#].*?(?:\r\n|\n|\r)?$")
ID_RE = re.compile(r"^[ \t]*<!--[ \t]*qard-id:[ \t]*([A-Za-z0-9_-]+)[ \t]*-->[ \t]*$")
ID_LOOSE_RE = re.compile(r"^[ \t]*<!--[ \t]*qard-id:[ \t]*(.*?)[ \t]*-->[ \t]*$")
RELATED_RE = re.compile(r"^\s*<!-- qard-(siblings|reverse): ([A-Za-z0-9_-]+) -->\s*$")
RELATED_LOOSE_RE = re.compile(r"^[ \t]*<!--[ \t]*qard-(siblings|reverse):.*?-->[ \t]*$")
LOCATION_RE = re.compile(r"^[ \t]*<!--[ \t]*qard-location:[ \t]*(.+?)[ \t]*-->[ \t]*$")
ANSWER_MARKER = "<!-- qard-answer -->"
METADATA_FIELDS = ("qard-deck", "qard-topic")


class MigrationError(RuntimeError):
    """Raised when applying or rolling back would risk user data."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def semantic_hash(value: str) -> str:
    return sha256(value.strip().encode("utf-8"))


def eol_name(data: bytes) -> str:
    crlf = data.count(b"\r\n")
    bare_lf = data.count(b"\n") - crlf
    bare_cr = data.count(b"\r") - crlf
    kinds = sum(bool(count) for count in (crlf, bare_lf, bare_cr))
    if kinds > 1:
        return "mixed"
    if crlf:
        return "crlf"
    if bare_cr:
        return "cr"
    return "lf"


def detect_eol(text: str) -> str:
    match = re.search(r"\r\n|\n|\r", text)
    return match.group(0) if match else "\n"


def split_lines(text: str) -> list[str]:
    return text.splitlines(keepends=True)


def visible_line(line: str) -> str:
    return line.rstrip("\r\n")


def scan_active_lines(lines: list[str], *, obsidian_comments: bool = True) -> list[bool]:
    active: list[bool] = []
    fence = ""
    comment_end: str | None = None
    in_card = False
    for line in lines:
        raw = visible_line(line)
        quoted = QUOTE_RE.match(raw)
        if in_card and quoted is None:
            # Card fences end with their blockquote, unlike standalone fences.
            fence = ""
            in_card = False
        code_line = quoted.group("text") if in_card and quoted else raw
        card_header = HEADER_RE.match(raw) if not fence else None
        if card_header:
            in_card = True
        # Literal delimiters inside code never change Markdown comment state.
        if fence:
            active.append(False)
            closing = re.match(r"^ {0,3}(`+|~+)\s*$", code_line)
            if closing and closing.group(1)[0] == fence[0] and len(closing.group(1)) >= len(fence):
                fence = ""
            continue
        opening = re.match(r"^ {0,3}(`{3,}|~{3,})", code_line) if comment_end is None else None
        if opening:
            active.append(False)
            fence = opening.group(1)
            continue
        # Inline code may document comment delimiters without opening comments.
        raw = re.sub(r"(?<!`)(`+)(.*?)\1(?!`)", "", raw)
        hidden = comment_end is not None
        remaining = raw
        while remaining:
            if comment_end:
                _, separator, remaining = remaining.partition(comment_end)
                if not separator:
                    break
                comment_end = None
                continue
            opener = re.search(r"<!--|%%" if obsidian_comments else r"<!--", remaining)
            if opener is None:
                break
            # Native Qard starts HTML comments only at the beginning of a line.
            if not obsidian_comments and opener.start() and not remaining[:opener.start()].isspace():
                break
            # A complete HTML metadata comment is active for adjacency checks.
            if opener.group() == "%%":
                hidden = True
            comment_end = "-->" if opener.group() == "<!--" else "%%"
            remaining = remaining[opener.end():]
        active.append(not hidden)
        if card_header and not hidden:
            title_fence = re.match(r"^ {0,3}(`{3,}|~{3,})", card_header.group("title") or "")
            if title_fence:
                fence = title_fence.group(1)
    return active


def question_scope(lines: list[str], active: list[bool]) -> list[bool]:
    result: list[bool] = []
    inside = False
    for index, line in enumerate(lines):
        if active[index] and QUESTION_HEADING_RE.match(line):
            inside = True
            result.append(False)
            continue
        if active[index] and inside and H1_RE.match(line):
            inside = False
        result.append(inside)
    return result


def frontmatter_span(lines: list[str]) -> tuple[int, int] | None:
    if not lines or visible_line(lines[0]).lstrip("\ufeff") != "---":
        return None
    for index in range(1, len(lines)):
        if visible_line(lines[index]).strip() in {"---", "..."}:
            return 0, index
    return None


def parse_qard_metadata(
    lines: list[str],
) -> tuple[dict[str, str], set[str], list[dict[str, object]]]:
    span = frontmatter_span(lines)
    values: dict[str, str] = {}
    present: set[str] = set()
    issues: list[dict[str, object]] = []
    if span is None:
        return values, present, issues
    _, end = span
    yaml_lines = [visible_line(line) for line in lines[1:end]]
    root_indent = min((len(line) - len(line.lstrip()) for line in yaml_lines if line.strip() and not line.lstrip().startswith("#")), default=0)
    for field in METADATA_FIELDS:
        matches: list[tuple[int, str]] = []
        pattern = re.compile(
            rf"^(?:{re.escape(field)}|\"{re.escape(field)}\"|'{re.escape(field)}')"
            rf"[ \t]*:(.*)$"
        )
        for index in range(1, end):
            match = pattern.match(visible_line(lines[index]))
            if match:
                matches.append((index, match.group(1).strip()))
        suspicious = [
            index
            for index, line in enumerate(lines[1:end], start=1)
            if re.match(
                rf"^(?:\?[ \t]+)?(?:{re.escape(field)}|\"{re.escape(field)}\"|'{re.escape(field)}')"
                rf"(?:[ \t]*:|[ \t]*$)",
                line.rstrip("\r\n"),
            )
        ]
        if root_indent:
            suspicious.extend(
                index for index, line in enumerate(yaml_lines, start=1)
                if pattern.match(line[root_indent:]) and len(line) - len(line.lstrip()) == root_indent
            )
        if suspicious and not matches:
            present.add(field)
            issues.append(
                {
                    "code": "metadata.unsupported",
                    "line": suspicious[0] + 1,
                    "message": f"unsupported YAML form for {field}; migration will not seed over it",
                }
            )
            continue
        if len(matches) > 1:
            present.add(field)
            issues.append(
                {"code": "metadata.duplicate", "line": matches[1][0] + 1, "message": f"duplicate {field}"}
            )
            continue
        if not matches:
            continue
        present.add(field)
        index, raw = matches[0]
        value = parse_qard_string_scalar(raw)
        if value is None:
            issues.append(
                {"code": "metadata.invalid", "line": index + 1, "message": f"{field} must be a nonempty scalar single-line string"}
            )
            continue
        values[field] = value
    return values, present, issues


def parse_qard_string_scalar(raw: str) -> str | None:
    raw = raw.strip()
    if not raw or raw.startswith(("[", "{", "|", ">", "&", "*", "!")):
        return None
    if raw[0] in {'"', "'"}:
        if len(raw) < 2 or raw[-1] != raw[0]:
            return None
        if raw[0] == '"':
            try:
                value = json.loads(raw)
            except json.JSONDecodeError:
                return None
        else:
            value = raw[1:-1].replace("''", "'")
    else:
        lowered = raw.casefold()
        if lowered in {"null", "~", "true", "false", ".nan", ".inf", "+.inf", "-.inf"}:
            return None
        if re.fullmatch(
            r"[-+]?(?:0|[1-9][0-9_]*)(?:\.[0-9_]+)?(?:[eE][-+]?[0-9]+)?",
            raw,
        ) or re.fullmatch(r"[-+]?0(?:x[0-9a-fA-F_]+|o[0-7_]+)", raw):
            return None
        value = raw
    if not isinstance(value, str) or not value.strip() or re.search(r"[\r\n\x00]", value):
        return None
    return value


def preceding_card_metadata(lines: list[str], header_index: int) -> tuple[str | None, str | None]:
    card_id: str | None = None
    location: str | None = None
    related_fields: set[str] = set()
    index = header_index - 1
    if index >= 0 and not visible_line(lines[index]).strip():
        index -= 1
    active = scan_active_lines(lines)
    while index >= 0 and active[index]:
        raw = visible_line(lines[index]).strip()
        if not raw:
            break
        id_match = ID_RE.match(raw)
        location_match = LOCATION_RE.match(raw)
        if id_match and card_id is None:
            card_id = id_match.group(1)
        elif location_match and location is None:
            location = location_match.group(1)
        elif (related := RELATED_RE.match(raw)) and related.group(1) not in related_fields:
            related_fields.add(related.group(1))
        else:
            break
        index -= 1
    return card_id, location


def validate_location(raw: str | None) -> bool:
    if raw is None:
        return True
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return False
    if not isinstance(value, dict) or set(value) != {"deck", "topic"}:
        return False
    return all(
        isinstance(value[key], str)
        and bool(value[key].strip())
        and not re.search(r"[\r\n\x00]", value[key])
        and len(value[key]) <= 200
        for key in ("deck", "topic")
    )


def semantic_parts(title: str, body: list[str]) -> tuple[str, str, bool]:
    active = scan_active_lines([title, *body])
    marker_indexes = [index for index, value in enumerate(body) if active[index + 1] and value.strip() == ANSWER_MARKER]
    if len(marker_indexes) > 1:
        return "", "", False
    if marker_indexes:
        marker = marker_indexes[0]
        front = "\n".join([title, *body[:marker]]).strip()
        back = "\n".join(body[marker + 1 :]).strip()
        return front, back, True
    return title.strip(), "\n".join(body).strip(), True


def strip_hidden_comments(content: str) -> str:
    tokens = {"<!--": "\ue000", "-->": "\ue001", "%%": "\ue002"}

    def shield_inline_code(match: re.Match[str]) -> str:
        span = match.group(0)
        for literal, token in tokens.items():
            span = span.replace(literal, token)
        return span

    content = re.sub(r"(?<!`)(`+)(.*?)\1(?!`)", shield_inline_code, content, flags=re.DOTALL)
    visible: list[str] = []
    comment_end: str | None = None
    fence = ""
    for raw_line in content.splitlines(keepends=True):
        line = raw_line.rstrip("\r\n")
        ending = raw_line[len(line) :]
        fence_match = re.match(r"^ {0,3}(`{3,}|~{3,})", line)
        if fence:
            visible.append(raw_line)
            if (
                fence_match
                and fence_match.group(1)[0] == fence[0]
                and len(fence_match.group(1)) >= len(fence)
            ):
                fence = ""
            continue
        if fence_match and comment_end is None:
            fence = fence_match.group(1)
            visible.append(raw_line)
            continue
        parts: list[str] = []
        remaining = line
        while remaining:
            if comment_end:
                _, separator, remaining = remaining.partition(comment_end)
                if not separator:
                    remaining = ""
                else:
                    comment_end = None
                continue
            opener = re.search(r"<!--|%%", remaining)
            if opener is None:
                parts.append(remaining)
                break
            parts.append(remaining[: opener.start()])
            remaining = remaining[opener.end() :]
            comment_end = "-->" if opener.group() == "<!--" else "%%"
        visible.append("".join(parts) + ending)
    result = "".join(visible)
    for literal, token in tokens.items():
        result = result.replace(token, literal)
    return result


def scan_note(path: Path, repo_root: Path) -> dict[str, object]:
    data = path.read_bytes()
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as error:
        return {
            "path": path.relative_to(repo_root).as_posix(),
            "data": data,
            "lines": [],
            "cards": [],
            "generic": 0,
            "issues": [{"code": "file.encoding", "line": 1, "message": str(error)}],
            "metadata": {},
        }
    lines = split_lines(text)
    active = scan_active_lines(lines)
    scope = question_scope(lines, active)
    metadata, metadata_present, issues = parse_qard_metadata(lines)
    native_active = scan_active_lines(lines, obsidian_comments=False)
    attached_ids: set[int] = set()
    for position, raw in enumerate(lines):
        header = HEADER_RE.match(raw)
        if not header:
            continue
        kind = header.group("kind").casefold()
        if kind == "qard" and native_active[position] and not active[position]:
            issues.append({"code": "card.hidden", "line": position + 1, "message": "Qard indexes this card despite Markdown/Obsidian comment hiding"})
        if not active[position] or (kind == "question" and not scope[position]):
            continue
        previous = position - 1
        if previous >= 0 and not visible_line(lines[previous]).strip():
            previous -= 1
        related_fields: set[str] = set()
        while previous >= 0 and active[previous] and (
            ID_LOOSE_RE.match(visible_line(lines[previous])) or LOCATION_RE.match(visible_line(lines[previous]))
            or RELATED_LOOSE_RE.match(visible_line(lines[previous]))
        ):
            raw_metadata = visible_line(lines[previous])
            related = RELATED_LOOSE_RE.match(raw_metadata)
            if related:
                if not RELATED_RE.match(raw_metadata) or related.group(1) in related_fields:
                    issues.append({"code": "card.identity-metadata", "line": previous + 1, "message": "Malformed or repeated related metadata interrupts native Qard identity attachment"})
                    break
                related_fields.add(related.group(1))
            if ID_LOOSE_RE.match(visible_line(lines[previous])):
                attached_ids.add(previous)
            previous -= 1
    for position, raw in enumerate(lines):
        id_match = ID_LOOSE_RE.match(visible_line(raw)) if active[position] else None
        if id_match and position not in attached_ids:
            issues.append({"code": "card.orphan-id", "line": position + 1, "message": "qard-id must be adjacent metadata for a card"})
        elif id_match and not ID_RE.match(visible_line(raw)):
            issues.append({"code": "card.invalid-id", "line": position + 1, "message": "qard-id must contain only letters, numbers, underscores, or hyphens"})
    cards: list[dict[str, object]] = []
    generic = 0
    index = 0
    while index < len(lines):
        match = HEADER_RE.match(lines[index]) if active[index] else None
        if match is None:
            index += 1
            continue
        kind = match.group("kind").casefold()
        if not scope[index] and kind == "question":
            generic += 1
            index += 1
            continue
        body: list[str] = []
        title_fence = re.match(r"^ {0,3}(`{3,}|~{3,})", match.group("title") or "")
        card_fence = title_fence.group(1) if title_fence else ""
        end = index + 1
        while end < len(lines):
            quoted = QUOTE_RE.match(lines[end])
            if quoted is None or (active[end] and HEADER_RE.match(lines[end])):
                break
            text = quoted.group("text")
            fence_match = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", text)
            if card_fence:
                if fence_match and fence_match.group(1)[0] == card_fence[0] and len(fence_match.group(1)) >= len(card_fence) and not fence_match.group(2).strip():
                    card_fence = ""
            elif fence_match:
                card_fence = fence_match.group(1)
            body.append(text)
            end += 1
        if card_fence:
            issues.append({"code": "card.unclosed-fence", "line": index + 1, "message": "Qard card has an unclosed code fence"})
        title = match.group("title") or ""
        front, back, marker_valid = semantic_parts(title, body)
        # Fence delimiters alone are not an answer; literal code contents are.
        def has_content(value: str) -> bool:
            visible = strip_hidden_comments(value)
            return bool(re.sub(r"(?m)^ {0,3}(?:`{3,}|~{3,})[^\n]*$", "", visible).strip())

        front_nonempty = has_content(front)
        back_nonempty = has_content(back)
        card_id, location = preceding_card_metadata(lines, index)
        card = {
            "line": index + 1,
            "end_line": end,
            "kind": kind,
            "interview_scope": scope[index],
            "fold": match.group("fold") or "",
            "front_sha256": semantic_hash(front),
            "back_sha256": semantic_hash(back),
            "front_nonempty": front_nonempty,
            "back_nonempty": back_nonempty,
            "qard_id": card_id,
            "qard_location": location,
            "header": lines[index],
        }
        cards.append(card)
        if kind == "qard" and not NATIVE_QARD_HEADER_RE.fullmatch(visible_line(lines[index])):
            issues.append({"code": "card.header", "line": index + 1, "message": "Qard header does not match native callout whitespace syntax"})
        if kind == "qard" and match.group("fold") != "-":
            issues.append({"code": "card.collapsed", "line": index + 1, "message": "Qard cards must use collapsed callouts"})
        if not marker_valid:
            issues.append({"code": "card.ambiguous-answer", "line": index + 1, "message": "card has more than one qard-answer marker"})
        if not front_nonempty:
            issues.append({"code": "card.empty-front", "line": index + 1, "message": "Qard card needs a question"})
        if not back_nonempty:
            issues.append({"code": "card.empty-back", "line": index + 1, "message": "Qard card needs an answer"})
        if not validate_location(location):
            issues.append({"code": "card.invalid-location", "line": index + 1, "message": "qard-location must contain nonempty scalar deck and topic strings"})
        index = end
    if any(card["kind"] == "question" for card in cards) and set(METADATA_FIELDS) - metadata_present:
        span = frontmatter_span(lines)
        yaml_lines = [visible_line(line) for line in lines[1:span[1]]] if span else []
        root_indent = min((len(line) - len(line.lstrip()) for line in yaml_lines if line.strip() and not line.lstrip().startswith("#")), default=0)
        if root_indent:
            issues.append({"code": "metadata.unsupported", "line": 2, "message": "cannot safely seed Qard metadata into an indented root mapping"})
    return {
        "path": path.relative_to(repo_root).as_posix(),
        "data": data,
        "lines": lines,
        "cards": cards,
        "generic": generic,
        "issues": issues,
        "metadata": metadata,
        "metadata_present": metadata_present,
    }


def path_seeds(path: Path, repo_root: Path) -> dict[str, str]:
    home = repo_root / "Vault/Home"
    relative = path.relative_to(home)
    if len(relative.parts) < 2:
        raise MigrationError(f"cannot derive Qard deck/topic for {relative.as_posix()}")
    return {"qard-deck": relative.parts[0], "qard-topic": relative.with_suffix("").as_posix().split("/", 1)[1]}


def issue_with_path(path: str, issue: dict[str, object]) -> dict[str, object]:
    return {"path": path, **issue}


def create_manifest(repo_root: Path) -> dict[str, object]:
    repo_root = repo_root.resolve()
    home = repo_root / "Vault/Home"
    if not home.is_dir():
        raise MigrationError(f"missing vault home: {home}")
    scans = [scan_note(path, repo_root) for path in sorted(home.rglob("*.md"))]
    issues = [issue_with_path(scan["path"], issue) for scan in scans for issue in scan["issues"]]
    ids: dict[str, list[tuple[str, int]]] = {}
    for scan in scans:
        for card in scan["cards"]:
            if card["qard_id"]:
                ids.setdefault(str(card["qard_id"]), []).append((str(scan["path"]), int(card["line"])))
    for card_id, locations in ids.items():
        if len(locations) > 1:
            for path, line in locations:
                issues.append({"code": "card.duplicate-id", "path": path, "line": line, "message": f"duplicate qard-id {card_id!r}"})

    files: list[dict[str, object]] = []
    for scan in scans:
        legacy = [card for card in scan["cards"] if card["kind"] == "question"]
        if not legacy:
            continue
        path = repo_root / str(scan["path"])
        seeds = path_seeds(path, repo_root)
        metadata_blocked = any(
            str(issue["code"]).startswith("metadata.") for issue in scan["issues"]
        )
        seed_values = (
            {}
            if metadata_blocked
            else {
                field: value
                for field, value in seeds.items()
                if field not in scan["metadata_present"]
            }
        )
        entry: dict[str, object] = {
            "path": scan["path"],
            "original_sha256": sha256(scan["data"]),
            "eol": eol_name(scan["data"]),
            "final_newline": scan["data"].endswith((b"\n", b"\r")),
            "headers": [
                {
                    "line": card["line"],
                    "original_b64": base64.b64encode(str(card["header"]).encode("utf-8")).decode("ascii"),
                    "front_sha256": card["front_sha256"],
                    "back_sha256": card["back_sha256"],
                    "fold": card["fold"],
                }
                for card in legacy
            ],
            "seed_values": seed_values,
            "preserved_metadata": scan["metadata"],
            "qard_locations": [card["qard_location"] for card in scan["cards"] if card["qard_location"]],
        }
        entry["planned_sha256"] = sha256(render_applied_bytes(repo_root, entry, source=scan["data"]))
        files.append(entry)

    manifest: dict[str, object] = {
        "version": VERSION,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "files": files,
        "issues": sorted(issues, key=lambda issue: (str(issue["path"]).casefold(), int(issue["line"]), str(issue["code"]))),
        "summary": {
            "home_notes": len(scans),
            "target_files": len(files),
            "legacy_interview_cards": sum(card["kind"] == "question" for scan in scans for card in scan["cards"]),
            "native_qard_cards": sum(card["kind"] == "qard" for scan in scans for card in scan["cards"]),
            "generic_question_cards": sum(int(scan["generic"]) for scan in scans),
            "issues": len(issues),
        },
    }
    return manifest


def qard_header(original: str) -> str:
    match = HEADER_RE.match(original)
    if match is None or match.group("kind").casefold() != "question":
        raise MigrationError("manifest header no longer describes a legacy interview card")
    title = match.group("title")
    return "> [!qard]-" + (" " + title if title is not None else "") + match.group("eol")


def render_applied_bytes(repo_root: Path, entry: dict[str, object], source: bytes | None = None) -> bytes:
    data = source if source is not None else (repo_root / str(entry["path"])).read_bytes()
    text = data.decode("utf-8")
    lines = split_lines(text)
    active = scan_active_lines(lines)
    scope = question_scope(lines, active)
    for header in entry["headers"]:
        line_index = int(header["line"]) - 1
        original = base64.b64decode(str(header["original_b64"])).decode("utf-8")
        if line_index >= len(lines):
            raise MigrationError(f"header line missing in {entry['path']}:{line_index + 1}")
        if not active[line_index] or not scope[line_index]:
            raise MigrationError(
                f"manifest header is outside an active # Questions section in "
                f"{entry['path']}:{line_index + 1}"
            )
        if lines[line_index] == qard_header(original):
            continue
        if lines[line_index] != original:
            raise MigrationError(f"header drift in {entry['path']}:{line_index + 1}")
        lines[line_index] = qard_header(original)
    seeds = dict(entry["seed_values"])
    if seeds:
        span = frontmatter_span(lines)
        if span is None:
            raise MigrationError(f"cannot seed metadata without frontmatter: {entry['path']}")
        _, present, metadata_issues = parse_qard_metadata(lines)
        if metadata_issues or present.intersection(seeds):
            raise MigrationError(f"manifest would overwrite existing Qard metadata: {entry['path']}")
        expected_seeds = path_seeds(repo_root / str(entry["path"]), repo_root)
        if any(expected_seeds.get(field) != value for field, value in seeds.items()):
            raise MigrationError(f"manifest contains noncanonical initial seed: {entry['path']}")
        _, end = span
        eol = detect_eol(text)
        seed_lines = [f"{field}: {json.dumps(value, ensure_ascii=False)}{eol}" for field, value in seeds.items()]
        if all(seed.rstrip("\r\n") in {visible_line(line) for line in lines} for seed in seed_lines):
            pass
        else:
            lines[end:end] = seed_lines
    return "".join(lines).encode("utf-8")


def render_rollback_bytes(entry: dict[str, object], data: bytes) -> bytes:
    text = data.decode("utf-8")
    lines = split_lines(text)
    seed_count = len(entry["seed_values"])
    for header in entry["headers"]:
        original_line = int(header["line"]) - 1
        applied_line = original_line + seed_count
        original = base64.b64decode(str(header["original_b64"])).decode("utf-8")
        if applied_line >= len(lines) or lines[applied_line] != qard_header(original):
            raise MigrationError(f"cannot locate migration-owned header in {entry['path']}:{applied_line + 1}")
        lines[applied_line] = original
    if entry["seed_values"]:
        eol = detect_eol(text)
        expected = [f"{field}: {json.dumps(value, ensure_ascii=False)}{eol}" for field, value in dict(entry["seed_values"]).items()]
        for seed in expected:
            indexes = [index for index, line in enumerate(lines) if line == seed]
            if len(indexes) != 1:
                raise MigrationError(f"cannot uniquely remove migration-owned metadata in {entry['path']}")
            del lines[indexes[0]]
    return "".join(lines).encode("utf-8")


def atomic_write(path: Path, data: bytes) -> None:
    mode = path.stat().st_mode if path.exists() else 0o644
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.name}.", delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    try:
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def assert_manifest(manifest: dict[str, object], repo_root: Path | None = None) -> None:
    if manifest.get("version") != VERSION or not isinstance(manifest.get("files"), list):
        raise MigrationError("invalid migration manifest")
    seen: set[str] = set()
    home = (repo_root / "Vault/Home").resolve() if repo_root is not None else None
    for entry in manifest["files"]:
        if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
            raise MigrationError("invalid migration manifest entry")
        raw_path = entry["path"]
        relative = PurePosixPath(raw_path)
        if (
            relative.is_absolute()
            or "\\" in raw_path
            or relative.suffix.casefold() != ".md"
            or len(relative.parts) < 3
            or relative.parts[:2] != ("Vault", "Home")
            or any(part in {"", ".", ".."} for part in relative.parts)
            or raw_path in seen
        ):
            raise MigrationError(f"unsafe migration manifest path: {raw_path!r}")
        seen.add(raw_path)
        if home is not None:
            candidate = (repo_root / Path(*relative.parts)).resolve()
            if not candidate.is_relative_to(home):
                raise MigrationError(f"migration manifest path escapes Vault/Home: {raw_path!r}")
        seeds = entry.get("seed_values")
        if not isinstance(seeds, dict) or not set(seeds).issubset(METADATA_FIELDS):
            raise MigrationError(f"invalid seed fields for {raw_path}")
        if any(
            not isinstance(value, str)
            or not value.strip()
            or re.search(r"[\r\n\x00]", value)
            for value in seeds.values()
        ):
            raise MigrationError(f"invalid seed value for {raw_path}")
        for hash_field in ("original_sha256", "planned_sha256"):
            if not re.fullmatch(r"[0-9a-f]{64}", str(entry.get(hash_field, ""))):
                raise MigrationError(f"invalid {hash_field} for {raw_path}")
        if entry.get("post_apply_sha256") not in {None, entry["planned_sha256"]}:
            raise MigrationError(f"invalid post_apply_sha256 for {raw_path}")


def preflight(repo_root: Path, manifest: dict[str, object], allowed: Iterable[str]) -> None:
    repo_root = repo_root.resolve()
    assert_manifest(manifest, repo_root)
    allowed_set = set(allowed)
    drift: list[str] = []
    for entry in manifest["files"]:
        path = repo_root / str(entry["path"])
        digest = sha256(path.read_bytes()) if path.is_file() else "missing"
        expected = {str(entry[key]) for key in allowed_set if entry.get(key)}
        if digest not in expected:
            drift.append(f"{entry['path']}: {digest}")
    if drift:
        raise MigrationError("compare-and-swap check failed:\n" + "\n".join(drift))


def mark_applied_hashes(repo_root: Path, manifest: dict[str, object]) -> None:
    for entry in manifest["files"]:
        digest = sha256((repo_root / str(entry["path"])).read_bytes())
        if digest != entry["planned_sha256"]:
            raise MigrationError(f"post-write verification failed for {entry['path']}")
        entry["post_apply_sha256"] = entry["planned_sha256"]


def apply_manifest(repo_root: Path, manifest: dict[str, object]) -> list[str]:
    repo_root = repo_root.resolve()
    assert_manifest(manifest, repo_root)
    if manifest.get("issues"):
        raise MigrationError(f"inventory contains {len(manifest['issues'])} blocking issue(s)")
    preflight(repo_root, manifest, ("original_sha256", "planned_sha256", "post_apply_sha256"))
    changed: list[str] = []
    outputs: list[tuple[Path, bytes]] = []
    for entry in manifest["files"]:
        path = repo_root / str(entry["path"])
        current = path.read_bytes()
        if sha256(current) in {entry.get("planned_sha256"), entry.get("post_apply_sha256")}:
            continue
        output = render_applied_bytes(repo_root, entry, source=current)
        if sha256(output) != entry["planned_sha256"]:
            raise MigrationError(f"planned output mismatch for {entry['path']}")
        outputs.append((path, output))
        changed.append(str(entry["path"]))
    entries = {str(entry["path"]): entry for entry in manifest["files"]}
    for path, output in outputs:
        entry = entries[path.relative_to(repo_root).as_posix()]
        if sha256(path.read_bytes()) != entry["original_sha256"]:
            raise MigrationError(f"compare-and-swap recheck failed for {entry['path']}")
        atomic_write(path, output)
    mark_applied_hashes(repo_root, manifest)
    return changed


def verify_manifest(repo_root: Path, manifest: dict[str, object]) -> list[str]:
    repo_root = repo_root.resolve()
    assert_manifest(manifest, repo_root)
    errors: list[str] = []
    for entry in manifest["files"]:
        path = repo_root / str(entry["path"])
        if not path.is_file():
            errors.append(f"missing: {entry['path']}")
            continue
        data = path.read_bytes()
        if sha256(data) not in {entry.get("planned_sha256"), entry.get("post_apply_sha256")}:
            errors.append(f"hash mismatch: {entry['path']}")
            continue
        scan = scan_note(path, repo_root)
        legacy = [card for card in scan["cards"] if card["kind"] == "question"]
        if legacy:
            errors.append(f"legacy interview cards remain: {entry['path']}")
        expected = Counter(
            (header["front_sha256"], header["back_sha256"], "-")
            for header in entry["headers"]
        )
        actual = Counter(
            (card["front_sha256"], card["back_sha256"], card["fold"])
            for card in scan["cards"]
        )
        missing = expected - actual
        for signature, count in missing.items():
            errors.append(
                f"semantic tuple missing ({count}): {entry['path']} {signature[0][:12]}"
            )
    return errors


def rollback_manifest(repo_root: Path, manifest: dict[str, object]) -> list[str]:
    repo_root = repo_root.resolve()
    assert_manifest(manifest, repo_root)
    preflight(repo_root, manifest, ("original_sha256", "planned_sha256", "post_apply_sha256"))
    changed: list[str] = []
    outputs: list[tuple[Path, bytes]] = []
    for entry in manifest["files"]:
        path = repo_root / str(entry["path"])
        current = path.read_bytes()
        if sha256(current) == entry["original_sha256"]:
            continue
        output = render_rollback_bytes(entry, current)
        if sha256(output) != entry["original_sha256"]:
            raise MigrationError(f"rollback projection mismatch for {entry['path']}")
        outputs.append((path, output))
        changed.append(str(entry["path"]))
    entries = {str(entry["path"]): entry for entry in manifest["files"]}
    for path, output in outputs:
        entry = entries[path.relative_to(repo_root).as_posix()]
        if sha256(path.read_bytes()) not in {
            entry.get("planned_sha256"),
            entry.get("post_apply_sha256"),
        }:
            raise MigrationError(f"rollback compare-and-swap recheck failed for {entry['path']}")
        atomic_write(path, output)
    return changed


def load_manifest(path: Path) -> dict[str, object]:
    data = json.loads(path.read_text(encoding="utf-8"))
    assert_manifest(data)
    return data


def save_manifest(path: Path, manifest: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    if path.exists() and path.read_bytes() == payload:
        return
    atomic_write(path, payload)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("inventory", "dry-run", "apply", "verify", "rollback"):
        command = commands.add_parser(name)
        command.add_argument("--repo-root", type=Path, default=DEFAULT_REPO_ROOT)
        command.add_argument("--manifest", type=Path, required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    repo_root = args.repo_root.resolve()
    try:
        if args.command == "inventory":
            manifest = create_manifest(repo_root)
            save_manifest(args.manifest, manifest)
            print(json.dumps(manifest["summary"], sort_keys=True))
            return 0
        manifest = load_manifest(args.manifest)
        if args.command == "dry-run":
            if manifest.get("issues"):
                raise MigrationError(f"inventory contains {len(manifest['issues'])} blocking issue(s)")
            preflight(repo_root, manifest, ("original_sha256", "planned_sha256", "post_apply_sha256"))
            print(json.dumps(manifest["summary"], sort_keys=True))
        elif args.command == "apply":
            changed = apply_manifest(repo_root, manifest)
            save_manifest(args.manifest, manifest)
            print(json.dumps({"changed": changed}, sort_keys=True))
        elif args.command == "verify":
            errors = verify_manifest(repo_root, manifest)
            if errors:
                raise MigrationError("verification failed:\n" + "\n".join(errors))
            print(json.dumps({"verified_files": len(manifest["files"])}, sort_keys=True))
        else:
            changed = rollback_manifest(repo_root, manifest)
            save_manifest(args.manifest, manifest)
            print(json.dumps({"rolled_back": changed}, sort_keys=True))
    except (OSError, UnicodeError, json.JSONDecodeError, MigrationError) as error:
        print(f"[qard-migration] error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
