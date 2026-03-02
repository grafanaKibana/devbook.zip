#!/usr/bin/env python3
"""
Full vault quality audit — scores every page against AGENTS.md quality bar.
Outputs JSON that feeds the HTML report generator.
"""

import os
import re
import json
import sys

VAULT_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "Vault", "Software Engineering")

# Section display names
SECTION_NAMES = {
    "01 Programming": "01 Programming (.NET)",
    "02 Computer Science": "02 Computer Science",
    "03 Data Persistence": "03 Data Persistence",
    "04 Networks": "04 Networks",
    "05 Architecture": "05 Architecture",
    "06 Development Practices": "06 Dev Practices",
    "07 Security": "07 Security",
    "08 SDLC": "08 SDLC",
    "09 DevOps": "09 DevOps",
    "10 Cloud": "10 Cloud",
    "11 AI & ML": "11 AI & ML",
}


def extract_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter from markdown content."""
    fm = {}
    m = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not m:
        return fm
    for line in m.group(1).split('\n'):
        line = line.strip()
        if ':' in line and not line.startswith('-') and not line.startswith('#'):
            key, _, val = line.partition(':')
            key = key.strip()
            val = val.strip()
            if val:
                fm[key] = val
    return fm


def is_folder_note(filepath: str, filename: str) -> bool:
    """Check if file is a FolderNote (hub note matching parent folder name)."""
    parent = os.path.basename(os.path.dirname(filepath))
    name_no_ext = os.path.splitext(filename)[0]
    return parent == name_no_ext


def count_words(content: str) -> int:
    """Count words in content, excluding frontmatter."""
    # Remove frontmatter
    body = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)
    # Remove whats-next block
    body = re.sub(r'<!-- whats-next:start -->.*?<!-- whats-next:end -->', '', body, flags=re.DOTALL)
    return len(body.split())


def analyze_page(filepath: str) -> dict:
    """Analyze a single page for quality signals."""
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    filename = os.path.basename(filepath)
    relpath = os.path.relpath(filepath, VAULT_ROOT)
    name = os.path.splitext(filename)[0]

    fm = extract_frontmatter(content)
    body = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)

    # Quality signals
    words = count_words(content)
    code_blocks = len(re.findall(r'```\w', body))
    ext_refs = len(re.findall(r'\[.*?\]\(https?://', body))
    has_pitfalls = bool(re.search(r'^#{1,3}.*(?:Pitfall|pitfall)', body, re.MULTILINE))
    has_tradeoffs = bool(re.search(r'^#{1,3}.*(?:Tradeoff|Trade-off|tradeoff|trade-off|Comparison|comparison|vs\.?[\s\)])', body, re.MULTILINE))
    has_questions = bool(re.search(r'^#{1,3}.*(?:Question|question|Interview|interview)', body, re.MULTILINE))
    has_mermaid = bool(re.search(r'```mermaid', body))
    headings = len(re.findall(r'^#{2,}', body, re.MULTILINE))

    # Check for substantive intro (more than just a heading after frontmatter)
    intro_lines = []
    in_intro = True
    for line in body.strip().split('\n'):
        if line.startswith('##') and intro_lines:
            break
        if not line.startswith('#') and line.strip():
            intro_lines.append(line.strip())
    intro_words = len(' '.join(intro_lines).split())
    has_intro = intro_words >= 20

    # Determine section
    parts = relpath.split(os.sep)
    section = parts[0] if parts else "root"
    subsection = parts[1] if len(parts) > 2 else ""

    is_hub = is_folder_note(filepath, filename)

    # Check tags for FolderNote
    tags = fm.get('tags', '')
    if 'FolderNote' in tags:
        is_hub = True

    return {
        "name": name,
        "path": relpath,
        "section": section,
        "subsection": subsection,
        "is_hub": is_hub,
        "words": words,
        "status": fm.get('status', ''),
        "priority": fm.get('priority', ''),
        "dg_publish": fm.get('dg-publish', ''),
        "has_intro": has_intro,
        "code_blocks": code_blocks,
        "ext_refs": ext_refs,
        "has_pitfalls": has_pitfalls,
        "has_tradeoffs": has_tradeoffs,
        "has_questions": has_questions,
        "has_mermaid": has_mermaid,
        "headings": headings,
        "intro_words": intro_words,
    }


def score_page(page: dict) -> float:
    """
    Score a concept page 0-5.0 against the AGENTS.md quality bar.

    Scoring dimensions:
    - Depth (word count): 0-1.5
    - Examples (code blocks): 0-1.0
    - References (external links): 0-0.8
    - Production awareness (pitfalls + tradeoffs): 0-1.0
    - Interview readiness (questions): 0-0.4
    - Explanation quality (intro + mermaid): 0-0.3
    """
    score = 0.0
    w = page["words"]

    # Depth (0-1.5)
    if w >= 1500:
        score += 1.5
    elif w >= 1000:
        score += 1.3
    elif w >= 700:
        score += 1.0
    elif w >= 400:
        score += 0.7
    elif w >= 200:
        score += 0.4
    elif w >= 100:
        score += 0.2
    else:
        score += 0.1

    # Examples (0-1.0)
    cb = page["code_blocks"]
    if cb >= 4:
        score += 1.0
    elif cb >= 2:
        score += 0.7
    elif cb >= 1:
        score += 0.4
    # 0 code = 0

    # References (0-0.8)
    refs = page["ext_refs"]
    if refs >= 6:
        score += 0.8
    elif refs >= 4:
        score += 0.6
    elif refs >= 2:
        score += 0.4
    elif refs >= 1:
        score += 0.2

    # Production awareness (0-1.0)
    if page["has_pitfalls"]:
        score += 0.5
    if page["has_tradeoffs"]:
        score += 0.5

    # Interview readiness (0-0.4)
    if page["has_questions"]:
        score += 0.4

    # Explanation quality (0-0.3)
    if page["has_intro"]:
        score += 0.15
    if page["has_mermaid"]:
        score += 0.15

    return round(min(5.0, score), 1)


def classify_tier(score: float) -> str:
    """Classify score into quality tier."""
    if score >= 4.5:
        return "exemplary"
    elif score >= 3.5:
        return "strong"
    elif score >= 2.5:
        return "mid"
    elif score >= 1.5:
        return "below"
    else:
        return "stub"


def estimate_effort(page: dict, score: float) -> str:
    """Estimate remediation effort."""
    if score >= 4.5:
        return "none"
    gaps = []
    if page["words"] < 800:
        gaps.append("expand")
    if page["code_blocks"] < 2:
        gaps.append("code")
    if page["ext_refs"] < 3:
        gaps.append("refs")
    if not page["has_pitfalls"]:
        gaps.append("pitfalls")
    if not page["has_tradeoffs"]:
        gaps.append("tradeoffs")
    if not page["has_questions"]:
        gaps.append("questions")

    if score < 1.5 or len(gaps) >= 5:
        return "rewrite"
    elif score < 2.5 or len(gaps) >= 3:
        return "major"
    elif len(gaps) >= 2:
        return "moderate"
    else:
        return "minor"


def determine_phase(page: dict, score: float, effort: str) -> int:
    """Assign remediation phase 0-4."""
    if effort == "none":
        return -1  # No work needed

    pri = page.get("priority", "Medium")

    # Phase 0: Already near-done, just needs 1-2 additions
    if effort == "minor":
        return 0

    # Phase 1: High priority critical pages
    if pri == "High" and score < 2.0:
        return 1
    if pri == "High" and effort in ("rewrite", "major"):
        return 1

    # Phase 2: Medium priority or moderate effort
    if pri == "High" and effort == "moderate":
        return 2
    if pri == "Medium" and effort in ("rewrite", "major"):
        return 2

    # Phase 3: Everything else
    if pri == "Medium" and effort == "moderate":
        return 3
    if pri == "Low":
        return 3

    return 2  # Default


def get_gaps(page: dict) -> list:
    """List what's missing from a page."""
    gaps = []
    if page["words"] < 300:
        gaps.append("content (<300w)")
    elif page["words"] < 800:
        gaps.append("depth (<800w)")
    if page["code_blocks"] == 0:
        gaps.append("no code examples")
    elif page["code_blocks"] < 2:
        gaps.append("few code examples")
    if page["ext_refs"] == 0:
        gaps.append("no references")
    elif page["ext_refs"] < 3:
        gaps.append("few references")
    if not page["has_intro"]:
        gaps.append("weak intro")
    if not page["has_pitfalls"]:
        gaps.append("no pitfalls")
    if not page["has_tradeoffs"]:
        gaps.append("no tradeoffs")
    if not page["has_questions"]:
        gaps.append("no questions")
    return gaps


def main():
    pages = []
    for root, dirs, files in os.walk(VAULT_ROOT):
        for f in files:
            if not f.endswith('.md'):
                continue
            filepath = os.path.join(root, f)
            page = analyze_page(filepath)
            page["score"] = score_page(page)
            page["tier"] = classify_tier(page["score"])
            page["effort"] = estimate_effort(page, page["score"])
            page["phase"] = determine_phase(page, page["score"], page["effort"])
            page["gaps"] = get_gaps(page)
            pages.append(page)

    # Sort by section, then score ascending (worst first)
    pages.sort(key=lambda p: (p["section"], p["score"]))

    # Stats
    concept_pages = [p for p in pages if not p["is_hub"]]
    hub_pages = [p for p in pages if p["is_hub"]]

    stats = {
        "total": len(pages),
        "concept_count": len(concept_pages),
        "hub_count": len(hub_pages),
        "total_words": sum(p["words"] for p in pages),
        "avg_words": round(sum(p["words"] for p in concept_pages) / max(1, len(concept_pages))),
        "done_count": len([p for p in concept_pages if p["status"] == "Done"]),
        "done_avg_words": round(sum(p["words"] for p in concept_pages if p["status"] == "Done") / max(1, len([p for p in concept_pages if p["status"] == "Done"]))),
    }

    # Tier distribution
    for tier in ["exemplary", "strong", "mid", "below", "stub"]:
        stats[f"tier_{tier}"] = len([p for p in concept_pages if p["tier"] == tier])

    # Phase distribution
    for phase in range(-1, 5):
        key = f"phase_{phase}" if phase >= 0 else "phase_done"
        stats[key] = len([p for p in concept_pages if p["phase"] == phase])

    # Section stats
    section_stats = {}
    for section_key in sorted(SECTION_NAMES.keys()):
        sp = [p for p in concept_pages if p["section"] == section_key]
        if not sp:
            continue
        section_stats[section_key] = {
            "name": SECTION_NAMES.get(section_key, section_key),
            "count": len(sp),
            "avg_score": round(sum(p["score"] for p in sp) / len(sp), 1),
            "avg_words": round(sum(p["words"] for p in sp) / len(sp)),
            "exemplary": len([p for p in sp if p["tier"] == "exemplary"]),
            "strong": len([p for p in sp if p["tier"] == "strong"]),
            "mid": len([p for p in sp if p["tier"] == "mid"]),
            "below": len([p for p in sp if p["tier"] == "below"]),
            "stub": len([p for p in sp if p["tier"] == "stub"]),
        }

    # Effort estimates per phase
    effort_est = {}
    for phase in range(0, 4):
        pp = [p for p in concept_pages if p["phase"] == phase]
        # Rough time estimates: minor=15min, moderate=30min, major=45min, rewrite=60min
        time_map = {"minor": 15, "moderate": 30, "major": 45, "rewrite": 60}
        total_min = sum(time_map.get(p["effort"], 30) for p in pp)
        effort_est[phase] = {
            "count": len(pp),
            "total_hours": round(total_min / 60, 1),
            "pages": [p["name"] for p in pp],
        }

    output = {
        "stats": stats,
        "section_stats": section_stats,
        "effort_estimates": effort_est,
        "concept_pages": [{k: v for k, v in p.items()} for p in concept_pages],
        "hub_pages": [{k: v for k, v in p.items()} for p in hub_pages],
    }

    json.dump(output, sys.stdout, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
