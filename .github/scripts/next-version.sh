#!/usr/bin/env bash
# Compute the next release version.
#
# Usage: next-version.sh "<pr-title>"
#   - If the PR title carries a breaking '!' (e.g. `feature!: ...`) the bump is
#     MAJOR. This is the ONLY way to get a major — commits can never force one.
#   - Otherwise the bump is derived from commit subjects since the last v* tag:
#       feature:                      -> minor
#       docs: / bug: / maintenance:   -> patch
#
# Prints two key=value lines so callers can append straight to $GITHUB_OUTPUT:
#   bump=<major|minor|patch|none|initial>
#   next=vX.Y.Z
set -euo pipefail

TITLE="${1:-}"

LAST_TAG=$(git tag --list 'v*' --sort=-v:refname | head -n1 || true)

# ── Decide the bump ─────────────────────────────────────────────────────────
if printf '%s' "$TITLE" | grep -qE '^(feature|docs|bug|maintenance)!:'; then
  BUMP=major
else
  if [ -z "$LAST_TAG" ]; then
    SUBJECTS=""
  else
    SUBJECTS=$(git log "${LAST_TAG}..HEAD" --no-merges --format='%s' || true)
  fi
  BUMP=none
  # Match the base type only (`!?`) so a stray `!` in a commit is ignored —
  # commits never force a major, that comes solely from the PR title.
  if printf '%s\n' "$SUBJECTS" | grep -qE '^feature!?:'; then
    BUMP=minor
  elif printf '%s\n' "$SUBJECTS" | grep -qE '^(docs|bug|maintenance)!?:'; then
    BUMP=patch
  fi
fi

# ── First release ever (no tag yet) ─────────────────────────────────────────
if [ -z "$LAST_TAG" ]; then
  [ "$BUMP" = "none" ] && BUMP=initial
  printf 'bump=%s\nnext=v1.0.0\n' "$BUMP"
  exit 0
fi

VER="${LAST_TAG#v}"
MAJOR=$(echo "$VER" | cut -d. -f1)
MINOR=$(echo "$VER" | cut -d. -f2)
PATCH=$(echo "$VER" | cut -d. -f3)

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  none) : ;;
esac

printf 'bump=%s\nnext=v%s.%s.%s\n' "$BUMP" "$MAJOR" "$MINOR" "$PATCH"
