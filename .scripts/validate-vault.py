#!/usr/bin/env python3
"""Deterministic validation for the DevBook Obsidian vault.

Usage:
    python3 .scripts/validate-vault.py --staged
    python3 .scripts/validate-vault.py --all

The staged mode validates changed vault files without legacy exemptions. The
full mode validates the whole vault and suppresses only the explicitly recorded
debt in ``vault-validation-baseline.json``. Neither mode changes files.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import unquote, urlsplit


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_REPO_ROOT = SCRIPT_DIR.parent
BASELINE_PATH = SCRIPT_DIR / "vault-validation-baseline.json"

VALID_PRIORITIES = frozenset({"Low", "Medium", "High"})
VALID_STATUSES = frozenset(
    {"Not-Started", "Creation", "Ready to Repeat", "Repetition", "Done"}
)
VALID_LEVELS = frozenset({"1", "2", "3", "4"})
CONCEPT_FIELDS = ("topic", "subtopic", "level", "priority", "status")
SPECIAL_PUBLISHED_PAGES = frozenset(
    {
        "Vault/Home/index.md",
        "Vault/Home/Questions.md",
        "Vault/Home/About.md",
    }
)
# Generated from immutable release/commit history, so it quotes historical vault
# paths that cannot be rewritten.
GENERATED_PAGES = frozenset(
    {
        "Vault/Home/Changelog.md",
    }
)
ATTACHMENT_SUFFIXES = frozenset(
    {
        ".avif",
        ".bmp",
        ".csv",
        ".doc",
        ".docx",
        ".gif",
        ".ico",
        ".jpeg",
        ".jpg",
        ".mov",
        ".mp3",
        ".mp4",
        ".ogg",
        ".pdf",
        ".png",
        ".ppt",
        ".pptx",
        ".svg",
        ".tif",
        ".tiff",
        ".tsv",
        ".wav",
        ".webm",
        ".webp",
        ".xls",
        ".xlsx",
        ".zip",
    }
)
IMAGE_SUFFIXES = frozenset(
    {
        ".avif",
        ".bmp",
        ".gif",
        ".ico",
        ".jpeg",
        ".jpg",
        ".png",
        ".svg",
        ".tif",
        ".tiff",
        ".webp",
    }
)
REFERENCE_LINK_RE = re.compile(
    r"^- \[(?P<title>[^\]\n]+)\]\((?P<url>https?://(?:(?:\\.)|[^()\s]|\([^()\n]*\))+)\)$"
)
REFERENCE_LINK_WITH_TAIL_RE = re.compile(
    r"^- \[[^\]\n]+\]\(https?://(?:(?:\\.)|[^()\s]|\([^()\n]*\))+\)(?P<tail>\s+\S.*)$"
)
TEMPLATE_RESIDUE = (
    "Quick introduction to the concept",
    "What is abc?",
    "Replace or delete these example links.",
    "[Link 1](https://example.com)",
    "Explain this section in plain language",
    "A real question worth being able to answer",
    "<%*",
    "tp.hooks.on_all_templates_executed",
)
QARD_HEADER_RE = re.compile(
    r"^[ \t]{0,3}>[ \t]*\[!(?P<kind>question|qard)\]"
    r"(?P<fold>[+-]?)(?:[ \t]+(?P<title>.*))?$",
    re.IGNORECASE,
)
QARD_QUOTE_RE = re.compile(r"^[ \t]{0,3}>[ \t]?(?P<text>.*)$")
QARD_ID_RE = re.compile(r"^[ \t]*<!--[ \t]*qard-id:[ \t]*([A-Za-z0-9_-]+)[ \t]*-->[ \t]*$")
QARD_ID_LOOSE_RE = re.compile(r"^[ \t]*<!--[ \t]*qard-id:[ \t]*(.*?)[ \t]*-->[ \t]*$")
QARD_LOCATION_RE = re.compile(r"^[ \t]*<!--[ \t]*qard-location:[ \t]*(.+?)[ \t]*-->[ \t]*$")
QARD_ANSWER_MARKER = "<!-- qard-answer -->"


@dataclass(frozen=True)
class FrontmatterValue:
    kind: str
    value: object
    line: int


@dataclass(frozen=True)
class Issue:
    code: str
    path: str
    line: int
    message: str
    discriminator: str = ""

    @property
    def baseline_id(self) -> str:
        suffix = f"|{self.discriminator}" if self.discriminator else ""
        return f"{self.code}|{self.path}{suffix}"

    def render(self) -> str:
        return f"{self.path}:{self.line}: [{self.code}] {self.message}"


@dataclass(frozen=True)
class Note:
    path: Path
    rel: str
    content: str
    frontmatter: dict[str, FrontmatterValue]
    body: str
    body_start_line: int

    @property
    def is_folder_note(self) -> bool:
        tags = self.frontmatter.get("tags")
        return bool(tags and tags.kind == "list" and "FolderNote" in tags.value)


def parse_scalar(raw: str) -> tuple[str, object]:
    value = raw.strip()
    if not value or value in {"null", "Null", "NULL", "~"}:
        return "null", None
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return "list", []
        items = []
        current = []
        quote = ""
        for char in inner:
            if char in {'"', "'"}:
                if quote == char:
                    quote = ""
                elif not quote:
                    quote = char
                current.append(char)
            elif char == "," and not quote:
                items.append("".join(current).strip())
                current = []
            else:
                current.append(char)
        items.append("".join(current).strip())
        return "list", [parse_list_item(item) for item in items]
    if value.lower() in {"true", "false"}:
        return "bool", value.lower() == "true"
    if re.fullmatch(r"[-+]?\d+(?:\.\d+)?", value):
        return "number", float(value) if "." in value else int(value)
    return "string", unquote_yaml_string(value)


def unquote_yaml_string(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def parse_list_item(value: str) -> object:
    kind, parsed = parse_scalar(value)
    return parsed if kind != "null" else None


def split_frontmatter(content: str) -> tuple[dict[str, FrontmatterValue], str, int]:
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, content, 1

    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return {}, content, 1

    values: dict[str, FrontmatterValue] = {}
    i = 1
    while i < end:
        line = lines[i]
        match = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$", line)
        if not match:
            i += 1
            continue
        key, raw = match.group(1), match.group(2) or ""
        line_number = i + 1
        if not raw.strip():
            items: list[object] = []
            j = i + 1
            while j < end:
                item_match = re.match(r"^\s+-\s+(.*?)\s*$", lines[j])
                if not item_match:
                    break
                items.append(parse_list_item(item_match.group(1)))
                j += 1
            if items:
                values[key] = FrontmatterValue("list", items, line_number)
                i = j
                continue
        kind, parsed = parse_scalar(raw)
        values[key] = FrontmatterValue(kind, parsed, line_number)
        i += 1

    body = "\n".join(lines[end + 1 :])
    if content.endswith("\n"):
        body += "\n"
    return values, body, end + 2


def load_note(path: Path, repo_root: Path) -> Note:
    content = path.read_text(encoding="utf-8")
    frontmatter, body, body_start_line = split_frontmatter(content)
    return Note(
        path=path,
        rel=path.relative_to(repo_root).as_posix(),
        content=content,
        frontmatter=frontmatter,
        body=body,
        body_start_line=body_start_line,
    )


def line_of(content: str, needle: str) -> int:
    offset = content.find(needle)
    return 1 if offset < 0 else content.count("\n", 0, offset) + 1


def validate_frontmatter(note: Note) -> list[Issue]:
    issues: list[Issue] = []
    fm = note.frontmatter
    is_concept = not note.is_folder_note and any(field in fm for field in CONCEPT_FIELDS)
    if is_concept:
        for field in CONCEPT_FIELDS:
            if field not in fm:
                issues.append(
                    Issue(
                        "frontmatter.missing",
                        note.rel,
                        1,
                        f"concept note is missing required `{field}` frontmatter",
                        field,
                    )
                )

    for field in ("topic", "subtopic", "level"):
        value = fm.get(field)
        if not value:
            continue
        if value.kind != "list" or any(not isinstance(item, str) for item in value.value):
            issues.append(
                Issue(
                    "frontmatter.type",
                    note.rel,
                    value.line,
                    f"`{field}` must be an array of strings, even with one value",
                    field,
                )
            )

    level = fm.get("level")
    if level and level.kind == "list":
        invalid = [str(item) for item in level.value if item not in VALID_LEVELS]
        if invalid:
            issues.append(
                Issue(
                    "frontmatter.level",
                    note.rel,
                    level.line,
                    f"`level` contains unsupported values: {', '.join(invalid)}; expected 1-4",
                )
            )

    for field, allowed in (("priority", VALID_PRIORITIES), ("status", VALID_STATUSES)):
        value = fm.get(field)
        if not value:
            continue
        if value.kind != "string":
            issues.append(
                Issue(
                    "frontmatter.type",
                    note.rel,
                    value.line,
                    f"`{field}` must be a scalar string",
                    field,
                )
            )
        elif value.value not in allowed:
            choices = ", ".join(sorted(allowed))
            issues.append(
                Issue(
                    f"frontmatter.{field}",
                    note.rel,
                    value.line,
                    f"unsupported `{field}` value {value.value!r}; expected one of: {choices}",
                )
            )

    for field in ("publish", "draft"):
        value = fm.get(field)
        if value and value.kind != "bool":
            issues.append(
                Issue(
                    "frontmatter.type",
                    note.rel,
                    value.line,
                    f"`{field}` must be the boolean `true` or `false`, not a string",
                    field,
                )
            )
    return issues


def validate_folder_note(note: Note, home_root: Path) -> list[Issue]:
    if note.path.parent == home_root:
        return []
    expected = note.path.parent / f"{note.path.parent.name}.md"
    if note.is_folder_note and note.path != expected:
        return [
            Issue(
                "folder-note.name",
                note.rel,
                1,
                f"FolderNote must be named `{expected.name}` to match its folder",
            )
        ]
    return []


def validate_expected_hubs(
    home_root: Path, notes_by_path: dict[Path, Note], directories: Iterable[Path]
) -> list[Issue]:
    issues: list[Issue] = []
    for directory in sorted(set(directories)):
        if directory == home_root or not directory.is_dir():
            continue
        if any(part.startswith(".") for part in directory.relative_to(home_root).parts):
            continue
        if not any(directory.glob("*.md")):
            continue
        expected = directory / f"{directory.name}.md"
        rel = expected.relative_to(home_root.parent.parent).as_posix()
        if not expected.exists():
            issues.append(
                Issue(
                    "folder-note.missing",
                    rel,
                    1,
                    f"folder containing notes must have hub `{expected.name}`",
                )
            )
        elif not notes_by_path[expected].is_folder_note:
            issues.append(
                Issue(
                    "folder-note.tag",
                    rel,
                    1,
                    "folder hub must keep `tags: [FolderNote]`",
                )
            )
    return issues


def validate_published(note: Note) -> list[Issue]:
    publish = note.frontmatter.get("publish")
    if not publish or publish.kind != "bool" or publish.value is not True:
        return []
    if note.rel in SPECIAL_PUBLISHED_PAGES:
        return []

    issues: list[Issue] = []
    body_without_fences = re.sub(r"```.*?```", "", note.body, flags=re.DOTALL)
    compact = re.sub(r"\s+", "", body_without_fences)
    if len(compact) < 200:
        issues.append(
            Issue(
                "publish.content",
                note.rel,
                note.body_start_line,
                "`publish: true` requires substantive body content",
            )
        )
    example_signal = (
        re.search(r"```", note.body)
        or re.search(r"(?m)^\s*[-*+]\s+", note.body)
        or re.search(r"(?m)^\s*\|.*\|\s*$", note.body)
        or re.search(r"`[^`]+`", note.body)
        or re.search(r"\b\d+(?:\.\d+)?\b", note.body)
    )
    if not example_signal:
        issues.append(
            Issue(
                "publish.example",
                note.rel,
                note.body_start_line,
                "`publish: true` needs a concrete signal such as code, a table, a list, or a numeric example",
            )
        )
    return issues


def is_reference_note(note: Note) -> bool:
    if note.rel in SPECIAL_PUBLISHED_PAGES or note.rel in GENERATED_PAGES:
        return False
    return note.is_folder_note or any(
        field in note.frontmatter for field in CONCEPT_FIELDS
    )


def is_direct_image_url(url: str) -> bool:
    # Mechanical boundary only: explicit Markdown images and URLs whose parsed
    # path ends in a known image suffix are rejected. Extensionless image
    # endpoints and HTML pages containing images need editorial review; guessing
    # from providers or response content would make this validator semantic.
    return Path(unquote(urlsplit(url).path)).suffix.casefold() in IMAGE_SUFFIXES


def validate_references(note: Note) -> list[Issue]:
    if not is_reference_note(note):
        return []

    lines = note.body.splitlines()
    visible_lines = strip_non_link_markdown(
        note.body, preserve_inline_code=True
    ).splitlines()
    headings = [
        index for index, line in enumerate(visible_lines) if line == "# References"
    ]
    if not headings:
        return []
    if len(headings) > 1:
        return [
            Issue(
                "references.heading",
                note.rel,
                note.body_start_line + headings[1],
                "concept and FolderNote pages may contain at most one literal `# References` heading",
            )
        ]

    issues: list[Issue] = []
    start = headings[0] + 1
    end = next(
        (
            index
            for index in range(start, len(visible_lines))
            if re.match(r"^#\s+", visible_lines[index])
        ),
        len(lines),
    )
    for index in range(start, end):
        line = lines[index]
        if not line.strip():
            continue
        line_number = note.body_start_line + index
        link = REFERENCE_LINK_RE.fullmatch(line)
        urls = re.findall(r"https?://[^\s)>]+(?:\([^()\n]*\))?[^\s)>]*", line)
        if line.startswith("- ![") or (link and is_direct_image_url(link.group("url"))):
            issues.append(
                Issue(
                    "references.image",
                    note.rel,
                    line_number,
                    "References must not contain Markdown images or direct image-file URLs",
                )
            )
        elif link:
            continue
        elif REFERENCE_LINK_WITH_TAIL_RE.fullmatch(line):
            issues.append(
                Issue(
                    "references.trailing-text",
                    note.rel,
                    line_number,
                    "reference entries must end after the Markdown link; remove trailing explanation",
                )
            )
        elif any(is_direct_image_url(url) for url in urls):
            issues.append(
                Issue(
                    "references.image",
                    note.rel,
                    line_number,
                    "References must not contain Markdown images or direct image-file URLs",
                )
            )
        else:
            issues.append(
                Issue(
                    "references.format",
                    note.rel,
                    line_number,
                    "reference entries must be bare `- [descriptive title](https://...)` bullets",
                )
            )
    return issues


def validate_residue(note: Note) -> list[Issue]:
    issues: list[Issue] = []
    for residue in TEMPLATE_RESIDUE:
        if residue in note.content:
            issues.append(
                Issue(
                    "template.residue",
                    note.rel,
                    line_of(note.content, residue),
                    f"remove template placeholder or Templater residue: {residue!r}",
                    residue,
                )
            )
    if re.search(r'\[\[.*Software Engineering|Software Engineering/', note.content) and note.rel not in GENERATED_PAGES:
        issues.append(
            Issue(
                "path.legacy",
                note.rel,
                line_of(note.content, "Software Engineering"),
                "replace the obsolete `Software Engineering` vault path with `Home`",
            )
        )
    return issues


def validate_code_fences(note: Note) -> list[Issue]:
    issues: list[Issue] = []
    open_code_fence: tuple[str, int] | None = None
    tabsdown_fences: list[tuple[str, int]] = []
    list_indents: list[int] = []
    for index, line in enumerate(note.body.splitlines()):
        line = line.expandtabs(4)
        line = re.sub(r"^(?: {0,3}>[ \t]?)+", "", line)
        if open_code_fence:
            for indent in reversed(list_indents):
                if line.startswith(" " * indent):
                    line = line[indent:]
                    break
        else:
            list_item = re.match(r"^( *)(?:[-+*]|\d+[.)])([ \t]+)(.*)$", line)
            if list_item:
                marker_indent = len(list_item.group(1))
                list_indents = [indent for indent in list_indents if indent <= marker_indent]
                list_indents.append(list_item.start(3))
                line = list_item.group(3)
            else:
                leading_spaces = len(line) - len(line.lstrip(" "))
                while list_indents and line.strip() and leading_spaces < list_indents[-1]:
                    list_indents.pop()
                if list_indents and leading_spaces >= list_indents[-1]:
                    line = line[list_indents[-1]:]
        line = re.sub(r"^(?: {0,3}>[ \t]?)+", "", line)
        match = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if not match:
            continue
        fence, suffix = match.groups()
        if open_code_fence:
            marker, length = open_code_fence
            if fence[0] == marker and len(fence) >= length and not suffix.strip():
                open_code_fence = None
            continue
        if tabsdown_fences:
            marker, length = tabsdown_fences[-1]
            if fence[0] == marker and len(fence) >= length and not suffix.strip():
                tabsdown_fences.pop()
                continue
        language = suffix.strip()
        if language and language.split(maxsplit=1)[0] == "tabsdown":
            tabsdown_fences.append((fence[0], len(fence)))
            continue
        open_code_fence = (fence[0], len(fence))
        if not language:
            issues.append(
                Issue(
                    "markdown.code-fence-language",
                    note.rel,
                    note.body_start_line + index,
                    "fenced code blocks need a language; use `text` when none fits",
                )
            )
    return issues


def active_markdown_lines(lines: list[str]) -> list[bool]:
    active: list[bool] = []
    fence = ""
    in_comment = False
    in_obsidian_comment = False
    for line in lines:
        has_obsidian_marker = "%%" in line
        is_active = not fence and not in_comment and not in_obsidian_comment and not has_obsidian_marker
        active.append(is_active)
        if in_obsidian_comment:
            if line.count("%%") % 2 == 1:
                in_obsidian_comment = False
            continue
        if has_obsidian_marker:
            if line.count("%%") % 2 == 1:
                in_obsidian_comment = True
            continue
        if fence:
            closing = re.match(r"^[ \t]{0,3}(`+|~+)[ \t]*$", line)
            if closing and closing.group(1)[0] == fence[0] and len(closing.group(1)) >= len(fence):
                fence = ""
            continue
        if in_comment:
            if "-->" in line:
                in_comment = False
            continue
        opening = re.match(r"^[ \t]{0,3}(`{3,}|~{3,})", line)
        if opening:
            fence = opening.group(1)
            continue
        start = line.find("<!--")
        if start >= 0 and line.find("-->", start + 4) < 0:
            in_comment = True
    return active


def qard_metadata_issues(note: Note) -> list[Issue]:
    issues: list[Issue] = []
    content_lines = note.content.splitlines()
    frontmatter_end = (
        next(
            (
                index
                for index in range(1, len(content_lines))
                if content_lines[index].strip() in {"---", "..."}
            ),
            0,
        )
        if content_lines and content_lines[0].lstrip("\ufeff") == "---"
        else 0
    )
    for field in ("qard-deck", "qard-topic"):
        pattern = re.compile(
            rf"^[ \t]*(?:{re.escape(field)}|\"{re.escape(field)}\"|'{re.escape(field)}')"
            rf"[ \t]*:(.*)$"
        )
        matches = [
            (index + 1, match.group(1).strip())
            for index, line in enumerate(content_lines[1:frontmatter_end], start=1)
            if (match := pattern.match(line))
        ]
        suspicious = [
            index + 1
            for index, line in enumerate(content_lines[1:frontmatter_end], start=1)
            if re.search(
                rf"(?<![A-Za-z0-9_-]){re.escape(field)}(?![A-Za-z0-9_-])", line
            )
            and not line.lstrip().startswith("#")
        ]
        if suspicious and not matches:
            issues.append(
                Issue(
                    "qard.metadata",
                    note.rel,
                    suspicious[0],
                    f"`{field}` uses an unsupported YAML form",
                    field,
                )
            )
            continue
        if len(matches) > 1:
            issues.append(
                Issue(
                    "qard.metadata",
                    note.rel,
                    matches[1][0],
                    f"`{field}` must occur at most once",
                    field,
                )
            )
            continue
        if not matches:
            continue
        line_number, raw = matches[0]
        kind, value = parse_scalar(raw)
        valid = (
            kind == "string"
            and isinstance(value, str)
            and bool(value.strip())
            and not raw.startswith(("[", "{", "|", ">", "&", "*", "!"))
            and not re.search(r"[\r\n\x00]", value)
            and "\\n" not in value
            and "\\r" not in value
        )
        if not valid:
            issues.append(
                Issue(
                    "qard.metadata",
                    note.rel,
                    line_number,
                    f"`{field}` must be a nonempty scalar single-line string",
                    field,
                )
            )
    return issues


def parse_qard_location(raw: str) -> bool:
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


def qard_card_metadata(lines: list[str], header_index: int) -> tuple[str | None, str | None, bool]:
    card_id: str | None = None
    location: str | None = None
    invalid_id = False
    index = header_index - 1
    while index >= 0 and lines[index].strip():
        id_match = QARD_ID_RE.match(lines[index])
        loose_id = QARD_ID_LOOSE_RE.match(lines[index])
        location_match = QARD_LOCATION_RE.match(lines[index])
        if id_match and card_id is None:
            card_id = id_match.group(1)
        elif loose_id and card_id is None:
            invalid_id = True
        elif location_match and location is None:
            location = location_match.group(1)
        else:
            break
        index -= 1
    return card_id, location, invalid_id


def validate_qard_interviews(note: Note) -> list[Issue]:
    """Validate every Qard card and legacy syntax in ``# Questions`` sections."""

    issues = qard_metadata_issues(note)
    lines = note.body.splitlines()
    active = active_markdown_lines(lines)
    inside_questions = False
    ids: dict[str, list[int]] = {}
    index = 0
    while index < len(lines):
        line = lines[index]
        if active[index] and re.fullmatch(r"# Questions[ \t]*", line):
            inside_questions = True
            index += 1
            continue
        if active[index] and inside_questions and re.match(r"^# [^#]", line):
            inside_questions = False
        match = QARD_HEADER_RE.match(line) if active[index] else None
        if match is None:
            index += 1
            continue
        line_number = note.body_start_line + index
        kind = match.group("kind").casefold()
        if kind == "question" and not inside_questions:
            index += 1
            continue
        if kind == "question":
            issues.append(
                Issue(
                    "qard.legacy-interview",
                    note.rel,
                    line_number,
                    "interview cards under `# Questions` must use `[!qard]`; generic Question callouts remain valid elsewhere",
                )
            )
        body: list[str] = []
        end = index + 1
        while end < len(lines):
            quoted = QARD_QUOTE_RE.match(lines[end])
            if quoted is None or QARD_HEADER_RE.match(lines[end]):
                break
            body.append(quoted.group("text"))
            end += 1
        if kind == "qard":
            markers = [position for position, value in enumerate(body) if value.strip() == QARD_ANSWER_MARKER]
            if len(markers) > 1:
                issues.append(Issue("qard.answer-marker", note.rel, line_number, "Qard card may contain only one `qard-answer` marker"))
                front = back = ""
            elif markers:
                marker = markers[0]
                front = "\n".join([match.group("title") or "", *body[:marker]]).strip()
                back = "\n".join(body[marker + 1 :]).strip()
            else:
                front = (match.group("title") or "").strip()
                back = "\n".join(body).strip()
            front_visible = strip_non_link_markdown(
                front, preserve_inline_code=True
            ).strip()
            back_visible = strip_non_link_markdown(
                back, preserve_inline_code=True
            ).strip()
            if not front_visible:
                issues.append(Issue("qard.empty-front", note.rel, line_number, "Qard card needs a nonempty question"))
            if not back_visible:
                issues.append(Issue("qard.empty-back", note.rel, line_number, "Qard card needs a nonempty answer"))
            card_id, location, invalid_id = qard_card_metadata(lines, index)
            if invalid_id:
                issues.append(Issue("qard.id", note.rel, line_number, "`qard-id` must contain only letters, numbers, underscores, or hyphens"))
            if card_id:
                ids.setdefault(card_id, []).append(line_number)
            if location is not None and not parse_qard_location(location):
                issues.append(Issue("qard.location", note.rel, line_number, "`qard-location` must contain nonempty scalar deck and topic strings up to 200 characters"))
        index = end
    for card_id, line_numbers in ids.items():
        if len(line_numbers) > 1:
            issues.extend(
                Issue("qard.duplicate-id", note.rel, line, f"duplicate qard-id `{card_id}`", card_id)
                for line in line_numbers
            )
    return issues


def qard_ids(note: Note) -> list[tuple[str, int]]:
    lines = note.body.splitlines()
    active = active_markdown_lines(lines)
    found: list[tuple[str, int]] = []
    for index, line in enumerate(lines):
        header = QARD_HEADER_RE.match(line) if active[index] else None
        if header is None or header.group("kind").casefold() != "qard":
            continue
        card_id, _, _ = qard_card_metadata(lines, index)
        if card_id:
            found.append((card_id, note.body_start_line + index))
    return found


def validate_global_qard_ids(notes: Iterable[Note], selected_paths: set[Path] | None = None) -> list[Issue]:
    found: dict[str, list[tuple[Note, int]]] = {}
    for note in notes:
        for card_id, line in qard_ids(note):
            found.setdefault(card_id, []).append((note, line))
    issues: list[Issue] = []
    for card_id, occurrences in found.items():
        if len(occurrences) < 2:
            continue
        for note, line in occurrences:
            if selected_paths is None or note.path in selected_paths:
                issues.append(Issue("qard.duplicate-id", note.rel, line, f"duplicate qard-id `{card_id}`", card_id))
    return issues


def strip_non_link_markdown(content: str, *, preserve_inline_code: bool = False) -> str:
    def preserve_lines(match: re.Match[str]) -> str:
        return "\n" * match.group(0).count("\n")

    comment_tokens = {
        "<!--": "\ue000",
        "-->": "\ue001",
        "%%": "\ue002",
    }

    def shield_code_span_comments(match: re.Match[str]) -> str:
        delimiter = match.group(1)
        line_start = match.string.rfind("\n", 0, match.start()) + 1
        prefix = match.string[line_start : match.start()].expandtabs(4)
        prefix = re.sub(
            r"^(?:(?: {0,3}>[ \t]?)|(?: {0,3}(?:[-+*]|\d+[.)])[ \t]+))+",
            "",
            prefix,
        )
        if len(delimiter) >= 3 and re.fullmatch(r" {0,3}", prefix):
            return match.group(0)
        span = match.group(0)
        for literal, token in comment_tokens.items():
            span = span.replace(literal, token)
        return span

    content = re.sub(
        r"(?<!`)(`+)(.*?)\1(?!`)",
        shield_code_span_comments,
        content,
        flags=re.DOTALL,
    )
    open_comment_end: str | None = None

    def strip_comments(line: str) -> str:
        nonlocal open_comment_end
        visible_parts: list[str] = []
        while line:
            if open_comment_end:
                _, separator, line = line.partition(open_comment_end)
                if not separator:
                    return "".join(visible_parts)
                open_comment_end = None
                continue
            opener = re.search(r"<!--|%%", line)
            if not opener:
                visible_parts.append(line)
                break
            visible_parts.append(line[: opener.start()])
            line = line[opener.end() :]
            open_comment_end = "-->" if opener.group() == "<!--" else "%%"
        return "".join(visible_parts)

    visible: list[str] = []
    open_code_fence: tuple[str, int] | None = None
    tabsdown_fences: list[tuple[str, int]] = []
    list_indents: list[int] = []
    for raw_line in content.splitlines(keepends=True):
        line_ending = raw_line[len(raw_line.rstrip("\r\n")) :]
        raw_content = raw_line.rstrip("\r\n")
        content_line = raw_content if open_code_fence else strip_comments(raw_content)
        line = content_line.expandtabs(4)
        line = re.sub(r"^(?: {0,3}>[ \t]?)+", "", line)
        if open_code_fence:
            for indent in reversed(list_indents):
                if line.startswith(" " * indent):
                    line = line[indent:]
                    break
        else:
            list_item = re.match(r"^( *)(?:[-+*]|\d+[.)])([ \t]+)(.*)$", line)
            if list_item:
                marker_indent = len(list_item.group(1))
                list_indents = [indent for indent in list_indents if indent <= marker_indent]
                list_indents.append(list_item.start(3))
                line = list_item.group(3)
            else:
                leading_spaces = len(line) - len(line.lstrip(" "))
                while list_indents and line.strip() and leading_spaces < list_indents[-1]:
                    list_indents.pop()
                if list_indents and leading_spaces >= list_indents[-1]:
                    line = line[list_indents[-1] :]
        line = re.sub(r"^(?: {0,3}>[ \t]?)+", "", line)
        match = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if not match:
            is_indented_code = len(line) - len(line.lstrip(" ")) >= 4
            visible.append(
                line_ending
                if open_code_fence or is_indented_code
                else content_line + line_ending
            )
            continue
        fence, suffix = match.groups()
        if open_code_fence:
            marker, length = open_code_fence
            if fence[0] == marker and len(fence) >= length and not suffix.strip():
                open_code_fence = None
            visible.append(line_ending)
            continue
        if tabsdown_fences:
            marker, length = tabsdown_fences[-1]
            if fence[0] == marker and len(fence) >= length and not suffix.strip():
                tabsdown_fences.pop()
                visible.append(line_ending)
                continue
        language = suffix.strip().split(maxsplit=1)[0] if suffix.strip() else ""
        if language == "tabsdown":
            tabsdown_fences.append((fence[0], len(fence)))
        else:
            open_code_fence = (fence[0], len(fence))
        visible.append(line_ending)
    content = "".join(visible)
    content = re.sub(
        r"(?<!`)(`+)(.*?)\1(?!`)",
        lambda match: match.group(2) if preserve_inline_code else preserve_lines(match),
        content,
        flags=re.DOTALL,
    )
    for literal, token in comment_tokens.items():
        content = content.replace(token, literal)
    return content


def normalize_heading_containers(content: str) -> str:
    content = re.sub(
        r"^[ ]{0,3}<(?P<tag>[A-Za-z][\w-]*)\b[^>]*>.*?^[ ]{0,3}</(?P=tag)>[ \t]*(?=\r?$)",
        lambda match: "\n" * match.group(0).count("\n"),
        content,
        flags=re.MULTILINE | re.DOTALL | re.IGNORECASE,
    )
    normalized: list[str] = []
    list_indents: list[int] = []
    for raw_line in content.splitlines():
        line = raw_line.expandtabs(4)
        line = re.sub(r"^(?: {0,3}>[ \t]?)+", "", line)
        list_item = re.match(r"^( {0,3})(?:[-+*]|\d+[.)])([ \t]+)(.*)$", line)
        if list_item:
            marker_indent = len(list_item.group(1))
            list_indents = [indent for indent in list_indents if indent <= marker_indent]
            list_indents.append(list_item.start(3))
            line = list_item.group(3)
        else:
            leading_spaces = len(line) - len(line.lstrip(" "))
            while list_indents and line.strip() and leading_spaces < list_indents[-1]:
                list_indents.pop()
            if list_indents and leading_spaces >= list_indents[-1]:
                line = line[list_indents[-1] :]
        normalized.append(
            re.sub(
                r"^(?:(?: {0,3}>[ \t]?)|(?: {0,3}(?:[-+*]|\d+[.)])[ \t]+))+",
                "",
                line,
            )
        )
    return "\n".join(normalized)


def visible_heading_text(heading: str) -> str:
    heading = re.sub(
        r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]",
        lambda match: match.group(2) or Path(match.group(1)).name,
        heading,
    )
    heading = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", heading)
    heading = re.sub(r"~~(.+?)~~", r"\1", heading)
    heading = re.sub(r"(\*\*|__)(.+?)\1", r"\2", heading)
    heading = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"\1", heading)
    heading = re.sub(r"(?<!_)_([^_\n]+)_(?!_)", r"\1", heading)
    return re.sub(r"\\([\\`*_{}\[\]()#+\-.!|>~])", r"\1", heading)


class VaultIndex:
    def __init__(self, vault_root: Path):
        self.vault_root = vault_root
        self.by_relative: dict[str, Path] = {}
        self.by_name: dict[str, list[Path]] = {}
        for path in vault_root.rglob("*"):
            if not path.is_file() or any(part.startswith(".") for part in path.relative_to(vault_root).parts):
                continue
            rel = path.relative_to(vault_root).as_posix()
            candidates = {rel, rel.removesuffix(path.suffix)}
            for candidate in candidates:
                self.by_relative[candidate.casefold()] = path
            names = {path.name, path.stem}
            for name in names:
                self.by_name.setdefault(name.casefold(), []).append(path)

    def resolve(self, source: Path, raw_target: str) -> Path | None:
        target = unquote(raw_target.strip().replace("\\", "/"))
        if not target or target.startswith(("#", "^")):
            return source
        if target.startswith(("http://", "https://", "mailto:", "obsidian://")):
            return source
        target = target.lstrip("/")
        candidates = [target]
        try:
            source_parent = source.parent.relative_to(self.vault_root).as_posix()
            candidates.insert(0, f"{source_parent}/{target}")
        except ValueError:
            pass
        if not target.startswith("Home/"):
            candidates.append(f"Home/{target}")
        for candidate in candidates:
            normalized = Path(candidate).as_posix().lstrip("./").casefold()
            found = self.by_relative.get(normalized)
            if found:
                return found
        name = Path(target).name.casefold()
        matches = self.by_name.get(name, [])
        return matches[0] if matches else None


def validate_wikilinks(note: Note, index: VaultIndex) -> list[Issue]:
    issues: list[Issue] = []
    content = strip_non_link_markdown(note.content)
    for match in re.finditer(r"\[\[([^\]\n]+)\]\]", content):
        prefix = content[: match.start()]
        if (len(prefix) - len(prefix.rstrip("\\"))) % 2:
            continue
        raw = match.group(1)
        link = raw.split("|", 1)[0].removesuffix("\\")
        target, separator, anchor = link.partition("#")
        target = target.strip()
        resolved = index.resolve(note.path, target)
        line = content.count("\n", 0, match.start()) + 1
        if resolved is None:
            issues.append(
                Issue(
                    "wikilink.unresolved",
                    note.rel,
                    line,
                    f"wikilink target does not resolve in the vault: [[{raw}]]",
                    target.casefold(),
                )
            )
        elif (
            resolved.suffix.casefold() == ".md"
            and separator
            and anchor
            and not anchor.startswith("^")
            and not target.casefold().startswith(("http://", "https://", "mailto:", "obsidian://"))
        ):
            _, target_body, _ = split_frontmatter(resolved.read_text(encoding="utf-8"))
            target_content = strip_non_link_markdown(target_body, preserve_inline_code=True)
            heading_content = normalize_heading_containers(target_content)
            raw_headings = re.findall(
                r"^[ \t]{0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?$",
                heading_content,
                re.MULTILINE,
            )
            raw_headings.extend(
                re.findall(r"^([^\n]+)\r?\n[ \t]{0,3}(?:=+|-+)[ \t]*$", heading_content, re.MULTILINE)
            )
            headings = {
                re.sub(r"\s+", " ", visible_heading_text(heading)).strip().casefold()
                for heading in raw_headings
            }
            normalized_anchor = re.sub(r"\s+", " ", unquote(anchor)).strip().casefold()
            if normalized_anchor not in headings:
                issues.append(
                    Issue(
                        "wikilink.heading-unresolved",
                        note.rel,
                        line,
                        f"wikilink heading does not exist in the target note: [[{raw}]]",
                        f"{target.casefold()}#{normalized_anchor}",
                    )
                )
    return issues


def validate_attachment_locations(vault_root: Path, paths: Iterable[Path]) -> list[Issue]:
    issues: list[Issue] = []
    assets_root = vault_root / "Assets"
    repo_root = vault_root.parent
    for path in sorted(set(paths)):
        if not path.is_file() or path.suffix.casefold() not in ATTACHMENT_SUFFIXES:
            continue
        if not path.is_relative_to(vault_root):
            continue
        try:
            path.relative_to(assets_root)
        except ValueError:
            issues.append(
                Issue(
                    "attachment.location",
                    path.relative_to(repo_root).as_posix(),
                    1,
                    "attachments belong under `Vault/Assets/`, never beside notes",
                )
            )
    return issues


def validate_roadmap(repo_root: Path) -> list[Issue]:
    generator_path = repo_root / ".scripts" / "generate-roadmap.py"
    canvas_path = repo_root / "Vault" / "Home" / "Roadmap.canvas"
    rel = canvas_path.relative_to(repo_root).as_posix()
    if not generator_path.exists() or not canvas_path.exists():
        return [Issue("generated.roadmap", rel, 1, "Roadmap generator or canvas is missing")]

    spec = importlib.util.spec_from_file_location("devbook_generate_roadmap", generator_path)
    if not spec or not spec.loader:
        return [Issue("generated.roadmap", rel, 1, "cannot load Roadmap generator")]
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    expected, _invalid = module.generate()
    try:
        actual = json.loads(canvas_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [Issue("generated.roadmap", rel, 1, f"Roadmap canvas is unreadable: {error}")]
    if module.normalize_canvas_for_comparison(actual) != module.normalize_canvas_for_comparison(expected):
        return [
            Issue(
                "generated.roadmap",
                rel,
                1,
                "Roadmap.canvas is stale; run `python3 .scripts/generate-roadmap.py`",
            )
        ]
    return []


def validate_steptrace(repo_root: Path) -> list[Issue]:
    build = repo_root / "Web" / "custom" / "steptrace" / "build.mjs"
    if not build.exists():
        return [
            Issue(
                "generated.steptrace",
                "Web/custom/steptrace",
                1,
                "StepTrace build script is missing",
            )
        ]
    try:
        result = subprocess.run(
            ["node", "custom/steptrace/build.mjs", "--check"],
            cwd=repo_root / "Web",
            check=False,
            text=True,
            capture_output=True,
        )
    except OSError as error:
        message = f"cannot run StepTrace freshness check: {error}"
    else:
        if result.returncode == 0:
            return []
        output = "\n".join((result.stderr, result.stdout))
        # A genuine staleness/build failure is reported by build.mjs on a line
        # tagged `steptrace check:`/`steptrace build:`. If one is present, use it
        # (it names the stale artifacts and the fix).
        reported = next(
            (
                line.strip().removeprefix("Error: ")
                for line in output.splitlines()
                if "steptrace check:" in line or "steptrace build:" in line
            ),
            None,
        )
        if reported is not None:
            message = reported
        else:
            # The check crashed before it could compare anything (e.g. missing
            # Web/node_modules → esbuild import error). Surface the raw error so
            # it is not mistaken for stale artifacts — `steptrace:build` would
            # rebuild identical bytes and not help. Prefer the first error line
            # over trailing noise like node's `Node.js vXX` footer.
            lines = [line.strip() for line in output.splitlines() if line.strip()]
            markers = ("Error", "ERR_", "not found", "Traceback")
            detail = (
                # Prefer the human-readable error message ...
                next((l for l in lines if l.startswith("Error") or "Cannot find" in l), None)
                # ... else any error-ish line (skips code frames / the version footer) ...
                or next((l for l in lines if any(m in l for m in markers)), None)
                # ... else fall back to whatever the process printed last.
                or (lines[-1] if lines else f"exit code {result.returncode}")
            )
            message = (
                f"StepTrace freshness check could not run (are Web dependencies "
                f"installed? run `npm ci` in Web): {detail}"
            )
    return [Issue("generated.steptrace", "Web/custom/steptrace", 1, message)]


def staged_paths(repo_root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        cwd=repo_root,
        check=True,
        text=True,
        capture_output=True,
    )
    return [repo_root / line for line in result.stdout.splitlines() if line]


def load_baseline(path: Path) -> set[str]:
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != 1 or not isinstance(data.get("violations"), list):
        raise ValueError(f"invalid vault validation baseline: {path}")
    return set(data["violations"])


def validate(repo_root: Path, mode: str, use_baseline: bool = True) -> tuple[list[Issue], int, int]:
    vault_root = repo_root / "Vault"
    home_root = vault_root / "Home"
    all_note_paths = sorted(home_root.rglob("*.md"))
    all_notes = {path: load_note(path, repo_root) for path in all_note_paths}
    selected_paths: list[Path]
    changed: list[Path] = []
    if mode == "staged":
        changed = staged_paths(repo_root)
        selected_paths = [
            path for path in changed if path.suffix.casefold() == ".md" and path in all_notes
        ]
    else:
        selected_paths = all_note_paths

    selected_notes = [all_notes[path] for path in selected_paths]
    index = VaultIndex(vault_root)
    issues: list[Issue] = []
    for note in selected_notes:
        issues.extend(validate_frontmatter(note))
        issues.extend(validate_folder_note(note, home_root))
        issues.extend(validate_published(note))
        issues.extend(validate_references(note))
        issues.extend(validate_residue(note))
        issues.extend(validate_code_fences(note))
        issues.extend(validate_qard_interviews(note))

    issues.extend(
        validate_global_qard_ids(
            all_notes.values(), set(selected_paths) if mode == "staged" else None
        )
    )

    link_notes = all_notes.values() if mode == "staged" and selected_paths else selected_notes
    for note in link_notes:
        issues.extend(validate_wikilinks(note, index))

    if mode == "all":
        hub_directories = [path for path in home_root.rglob("*") if path.is_dir()]
        attachment_paths = vault_root.rglob("*")
        issues.extend(validate_expected_hubs(home_root, all_notes, hub_directories))
        issues.extend(validate_attachment_locations(vault_root, attachment_paths))
        issues.extend(validate_roadmap(repo_root))
        issues.extend(validate_steptrace(repo_root))
    elif changed:
        hub_directories = [
            parent
            for path in selected_paths
            for parent in (path.parent,)
        ]
        issues.extend(validate_expected_hubs(home_root, all_notes, hub_directories))
        issues.extend(validate_attachment_locations(vault_root, changed))
        if any(path.is_relative_to(home_root) for path in changed):
            issues.extend(validate_roadmap(repo_root))
        steptrace_surface = (
            repo_root / "Web" / "custom" / "steptrace",
            repo_root / "Web" / "custom" / "emitters" / "steptrace-static.ts",
            repo_root / "Web" / "quartz" / "static" / "steptrace",
            repo_root / "Vault" / ".obsidian" / "plugins" / "steptrace",
        )
        if any(any(path.is_relative_to(root) for root in steptrace_surface) for path in changed):
            issues.extend(validate_steptrace(repo_root))

    issues = sorted(set(issues), key=lambda item: (item.path.casefold(), item.line, item.code))
    suppressed = 0
    if mode == "all" and use_baseline:
        baseline = load_baseline(repo_root / ".scripts" / BASELINE_PATH.name)
        kept = []
        for issue in issues:
            if issue.baseline_id in baseline:
                suppressed += 1
            else:
                kept.append(issue)
        issues = kept
    return issues, len(selected_notes), suppressed


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--staged", action="store_true", help="validate staged vault changes")
    mode.add_argument("--all", action="store_true", help="validate the complete vault")
    parser.add_argument(
        "--no-baseline",
        action="store_true",
        help="show known legacy violations during a full-vault run",
    )
    parser.add_argument("--repo-root", type=Path, default=DEFAULT_REPO_ROOT, help=argparse.SUPPRESS)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    mode = "staged" if args.staged else "all"
    try:
        issues, checked, suppressed = validate(
            args.repo_root.resolve(), mode, use_baseline=not args.no_baseline
        )
    except (OSError, subprocess.CalledProcessError, ValueError) as error:
        print(f"[vault-validation] error: {error}", file=sys.stderr)
        return 2

    if issues:
        print(f"[vault-validation] FAILED: {len(issues)} actionable violation(s)")
        for issue in issues:
            print(f"- {issue.render()}")
        if mode == "all" and suppressed:
            print(f"[vault-validation] {suppressed} known baseline violation(s) suppressed")
        return 1

    scope = "staged" if mode == "staged" else "full vault"
    baseline_note = f"; {suppressed} known baseline violation(s) suppressed" if suppressed else ""
    print(f"[vault-validation] OK: {checked} note(s) checked ({scope}){baseline_note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
