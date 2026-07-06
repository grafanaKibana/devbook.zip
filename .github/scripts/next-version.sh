#!/usr/bin/env bash
# Compute the next release version from git tags + commit subjects.
#
# Usage: next-version.sh [auto|major|minor|patch]   (default: auto)
#   auto   — derive the bump from commit subjects since the last v* tag
#   major  — force a major bump (used for the "if you merge this" preview)
#
# Prints two key=value lines so callers can append straight to $GITHUB_OUTPUT:
#   bump=<major|minor|patch|none|initial>
#   next=vX.Y.Z
set -euo pipefail

MODE="${1:-auto}"

LAST_TAG=$(git tag --list 'v*' --sort=-v:refname | head -n1 || true)

if [ -z "$LAST_TAG" ]; then
  printf 'bump=initial\nnext=v1.0.0\n'
  exit 0
fi

VER="${LAST_TAG#v}"
MAJOR=$(echo "$VER" | cut -d. -f1)
MINOR=$(echo "$VER" | cut -d. -f2)
PATCH=$(echo "$VER" | cut -d. -f3)

case "$MODE" in
  major | minor | patch)
    BUMP="$MODE"
    ;;
  auto)
    SUBJECTS=$(git log "${LAST_TAG}..HEAD" --no-merges --format='%s' || true)
    BUMP=none
    if printf '%s\n' "$SUBJECTS" | grep -qE '^(feature|docs|bug|maintenance)!:'; then
      BUMP=major
    elif printf '%s\n' "$SUBJECTS" | grep -qE '^feature:'; then
      BUMP=minor
    elif printf '%s\n' "$SUBJECTS" | grep -qE '^(docs|bug|maintenance):'; then
      BUMP=patch
    fi
    ;;
  *)
    echo "next-version.sh: unknown mode '$MODE'" >&2
    exit 1
    ;;
esac

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  none) : ;;
esac

printf 'bump=%s\nnext=v%s.%s.%s\n' "$BUMP" "$MAJOR" "$MINOR" "$PATCH"
