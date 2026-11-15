#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$REPO_ROOT"

fail() {
    printf '[setup] %s\n' "$1" >&2
    exit 1
}

case "$(uname -s)" in
    Darwin|Linux) ;;
    *) fail 'This setup requires macOS or Linux. Native Windows is unsupported by the export lock.' ;;
esac

for tool in git dotnet node npm python3 gh; do
    command -v "$tool" >/dev/null 2>&1 || fail "Missing $tool. Install it, activate Node 22 and .NET SDK 10.0.100, and rerun bash .scripts/setup.sh."
done
SDK_VERSION="$(cd "$REPO_ROOT/.scripts" && dotnet --version)" || fail 'Install .NET SDK 10.0.100 and rerun bash .scripts/setup.sh.'
[[ "$SDK_VERSION" == 10.0.100 ]] || fail "This checkout pins .NET SDK 10.0.100; found $SDK_VERSION. Install the pinned SDK and rerun setup."
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail 'Run setup from a complete Git checkout of DevBook.'
[[ "$GIT_ROOT" == "$REPO_ROOT" ]] || fail 'The setup script must belong to the Git checkout root; refusing to configure a parent repository.'
[[ -r Web/.node-version ]] || fail 'Web/.node-version is missing. Restore the complete checkout before setup.'
NODE_PIN="$(<Web/.node-version)"
REQUIRED_MAJOR="${NODE_PIN#v}"
REQUIRED_MAJOR="${REQUIRED_MAJOR%%.*}"
NODE_VERSION="$(node --version)" || fail 'Node could not start. Activate Node 22 and rerun setup.'
NODE_MAJOR="${NODE_VERSION#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
[[ "$NODE_MAJOR" == "$REQUIRED_MAJOR" ]] || fail "Node $REQUIRED_MAJOR is required by Web/.node-version ($NODE_PIN); found $NODE_VERSION. Activate Node $REQUIRED_MAJOR and rerun setup."

printf '[setup] Installing Web dependencies with npm ci --include=dev...\n'
(cd Web && npm ci --include=dev) || fail 'Dependency installation failed. Fix the npm error above, then rerun bash .scripts/setup.sh.'

printf '[setup] Enabling this checkout\047s Git hooks...\n'
git config --local core.hooksPath .githooks || fail 'Could not enable local Git hooks. Check repository permissions and rerun setup.'

cat <<'EOF'
[setup] Setup complete: dependencies installed and local Git hooks enabled.
Remaining manual steps: configure your Git identity and repository authentication if needed.
Commits run source maintenance and validation without Obsidian; CI exports and builds the site.
For native local preview: (cd .scripts && dotnet run --project DevBook.Tooling -- site preview --repo-root ..)
Quartz site plugins install and update during npm run build in Web.
Setup does not export notes, stage changes, commit or push.
EOF
