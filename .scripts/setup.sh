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

for tool in git dotnet node npm; do
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

printf '[setup] Configuring Quartz Syncer for this checkout...\n'
if ! (cd "$REPO_ROOT/.scripts" && dotnet run --no-cache --file DevBook.Tooling/Scripts/SyncQuartz.cs -- --repo-root "$REPO_ROOT" --configure-only); then
    cat >&2 <<'EOF'
[setup] Quartz Syncer configuration failed. Complete these steps, then rerun bash .scripts/setup.sh:
  - Open this checkout's Vault directory as a vault in Obsidian.
  - Enable community plugins, including bundled Quartz Syncer and Datacore.
    Enable Obsidian Git too if you commit from the app.
  - Register the Obsidian command line interface in Settings > General.
Dependencies and local Git hooks may already be installed; rerunning setup is safe.
EOF
    exit 1
fi

cat <<'EOF'
[setup] Setup complete: dependencies installed, local Git hooks enabled, Quartz Syncer configured.
Remaining manual steps: configure your Git identity and repository authentication if needed.
Keep this Vault open in Obsidian and wait for Datacore and metadata indexing before committing notes.
Quartz site plugins install and update during npm run build in Web.
Setup does not export notes, stage changes, commit or push.
EOF
