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
from urllib.parse import unquote


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
    {"Vault/Home/index.md", "Vault/Home/Questions.md", "Vault/Home/Credits.md"}
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
    if len(compact) < 200 or not re.search(r"(?m)^#{1,6}\s+\S", note.body):
        issues.append(
            Issue(
                "publish.content",
                note.rel,
                note.body_start_line,
                "`publish: true` requires substantive body content and a Markdown heading",
            )
        )
    if not re.search(r"https?://", note.body):
        issues.append(
            Issue(
                "publish.reference",
                note.rel,
                note.body_start_line,
                "`publish: true` requires at least one real external reference URL",
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
    if "Software Engineering" in note.content:
        issues.append(
            Issue(
                "path.legacy",
                note.rel,
                line_of(note.content, "Software Engineering"),
                "replace the obsolete `Software Engineering` vault path with `Home`",
            )
        )
    return issues


def strip_non_link_markdown(content: str) -> str:
    def preserve_lines(match: re.Match[str]) -> str:
        return "\n" * match.group(0).count("\n")

    content = re.sub(r"<!--.*?-->", preserve_lines, content, flags=re.DOTALL)
    content = re.sub(r"%%.*?%%", preserve_lines, content, flags=re.DOTALL)
    content = re.sub(r"```.*?```", preserve_lines, content, flags=re.DOTALL)
    content = re.sub(r"`[^`\n]*`", "", content)
    return content


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
        raw = match.group(1)
        target = raw.split("|", 1)[0].split("#", 1)[0].strip()
        if index.resolve(note.path, target) is None:
            issues.append(
                Issue(
                    "wikilink.unresolved",
                    note.rel,
                    content.count("\n", 0, match.start()) + 1,
                    f"wikilink target does not resolve in the vault: [[{raw}]]",
                    target.casefold(),
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
        message = next(
            (
                line.strip().removeprefix("Error: ")
                for line in output.splitlines()
                if "steptrace check:" in line or "steptrace build:" in line
            ),
            "StepTrace freshness check failed; run `(cd Web && npm run steptrace:build)`",
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
        issues.extend(validate_residue(note))
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
