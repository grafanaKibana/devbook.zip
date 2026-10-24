"""Exercise the setup command in disposable checkouts without network or Obsidian."""
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "setup.sh"


class SetupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / "DevBook checkout with spaces"
        self.repo.mkdir()
        (self.repo / ".scripts").mkdir()
        (self.repo / ".githooks").mkdir()
        (self.repo / "Web").mkdir()
        (self.repo / "Vault").mkdir()
        self.script = self.repo / ".scripts/setup.sh"
        if SCRIPT.exists():
            shutil.copyfile(SCRIPT, self.script)
        (self.repo / "Web/.node-version").write_text("v22.16.0\n")
        (self.repo / "Web/package.json").write_text("{}\n")
        (self.repo / "Web/package-lock.json").write_text("{}\n")
        (self.repo / "Vault/note.md").write_text("Authored note\n")
        (self.repo / ".githooks/pre-commit").write_text("#!/bin/sh\nexit 0\n")
        (self.repo / ".githooks/pre-commit").chmod(0o755)
        (self.repo / ".scripts/sync-quartz.py").write_text('''import os, pathlib, subprocess, sys
if sys.argv[1:] != ["--configure-only"]: raise SystemExit(91)
with pathlib.Path(os.environ["SETUP_LOG"]).open("a") as log: log.write("configure:" + str(pathlib.Path.cwd()) + "\\n")
raise SystemExit(subprocess.run([os.environ["OBSIDIAN_BIN"], "configure-only"]).returncode)
''')
        self.bin = self.root / "bin"
        self.bin.mkdir()
        for tool in ["git", "python3", "uname", "dirname", "cat"]:
            os.symlink(shutil.which(tool), self.bin / tool)
        self.executable("node", '#!/bin/bash\nprintf "%s\\n" "${TEST_NODE_VERSION:-v22.16.0}"\n')
        self.executable("npm", '''#!/bin/bash
[[ "$*" == "ci --include=dev" ]] || exit 92
printf 'npm:%s\n' "$PWD" >> "$SETUP_LOG"
exit "${TEST_NPM_EXIT:-0}"
''')
        self.executable("obsidian", '''#!/bin/bash
[[ "$*" == configure-only ]] || exit 93
printf 'obsidian\n' >> "$SETUP_LOG"
exit "${TEST_OBSIDIAN_EXIT:-0}"
''')
        self.log = self.root / "pipeline.log"
        self.global_config = self.root / "global.gitconfig"
        self.global_config.write_text("[user]\n\tname = Keep my identity\n\temail = untouched@example.invalid\n")
        self.env = {**os.environ, "PATH":str(self.bin), "SETUP_LOG":str(self.log),
                    "OBSIDIAN_BIN":str(self.bin / "obsidian"), "GIT_CONFIG_GLOBAL":str(self.global_config)}
        subprocess.run([shutil.which("git"), "init", "-q", str(self.repo)], check=True, env=self.env)
        self.git("add", ".")

    def executable(self, name, content):
        path = self.bin / name
        if path.is_symlink():
            path.unlink()
        path.write_text(content)
        path.chmod(0o755)

    def git(self, *args, check=True):
        return subprocess.run([shutil.which("git"), "-C", str(self.repo), *args], env=self.env,
                              check=check, capture_output=True, text=True)

    def run_setup(self, **environment):
        return subprocess.run(["/bin/bash", str(self.script)], cwd=self.root,
                              env={**self.env, **environment}, capture_output=True, text=True)

    def test_pipeline_works_from_another_directory_and_reruns_without_source_or_global_mutations(self):
        note = (self.repo / "Vault/note.md").read_bytes()
        index = (self.repo / ".git/index").read_bytes()
        global_config = self.global_config.read_bytes()
        for _ in range(2):
            result = self.run_setup(NODE_ENV="production", NPM_CONFIG_OMIT="dev")
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        lines = self.log.read_text().splitlines()
        self.assertEqual(lines, [f"npm:{self.repo}/Web", f"configure:{self.repo}", "obsidian"] * 2)
        self.assertEqual(self.git("config", "--local", "--get-all", "core.hooksPath").stdout.strip(), ".githooks")
        self.assertEqual((self.repo / "Vault/note.md").read_bytes(), note)
        self.assertEqual((self.repo / ".git/index").read_bytes(), index)
        self.assertEqual(self.global_config.read_bytes(), global_config)

    def test_missing_prerequisite_stops_before_changes(self):
        (self.bin / "npm").unlink()
        result = self.run_setup()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.log.exists())
        self.assertNotEqual(self.git("config", "--local", "--get", "core.hooksPath", check=False).returncode, 0)

    def test_wrong_node_major_stops_before_dependency_installation(self):
        result = self.run_setup(TEST_NODE_VERSION="v24.0.0")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.log.exists())
        self.assertNotEqual(self.git("config", "--local", "--get", "core.hooksPath", check=False).returncode, 0)

    def test_dependency_failure_stops_before_hooks_and_configuration(self):
        result = self.run_setup(TEST_NPM_EXIT="17")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.log.read_text().splitlines(), [f"npm:{self.repo}/Web"])
        self.assertNotEqual(self.git("config", "--local", "--get", "core.hooksPath", check=False).returncode, 0)

    def test_configuration_failure_is_reported_and_can_be_rerun(self):
        failed = self.run_setup(TEST_OBSIDIAN_EXIT="7")
        self.assertNotEqual(failed.returncode, 0)
        self.assertNotIn("Setup complete", failed.stdout)
        self.assertIn("Obsidian", failed.stdout + failed.stderr)
        self.assertEqual(self.git("config", "--local", "--get", "core.hooksPath").stdout.strip(), ".githooks")
        retried = self.run_setup()
        self.assertEqual(retried.returncode, 0, retried.stdout + retried.stderr)

    def test_unsupported_platform_does_not_install_or_configure(self):
        self.executable("uname", "#!/bin/bash\nprintf 'MINGW64_NT\\n'\n")
        result = self.run_setup()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.log.exists())

    def test_local_git_configuration_failure_stops_before_syncer(self):
        real_git = shutil.which("git")
        self.executable("git", f'''#!/bin/bash
if [[ "$*" == 'config --local core.hooksPath .githooks' ]]; then exit 23; fi
exec {shlex.quote(real_git)} "$@"
''')
        result = self.run_setup()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.log.read_text().splitlines(), [f"npm:{self.repo}/Web"])

    def test_nested_directory_cannot_configure_an_unrelated_parent_repository(self):
        shutil.rmtree(self.repo / ".git")
        subprocess.run([shutil.which("git"), "init", "-q", str(self.root)], env=self.env, check=True)
        result = self.run_setup()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.log.exists())
        self.assertNotEqual(self.git("config", "--local", "--get", "core.hooksPath", check=False).returncode, 0)

    def test_old_python_fails_before_dependencies_hooks_or_configuration(self):
        real_python = shlex.quote(shutil.which("python3"))
        self.executable("python3", f"#!/bin/bash\nexec {real_python} -c 'import sys; sys.version_info = (3, 8, 19); exec(sys.argv[1])' \"$2\"\n")
        result = self.run_setup()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Python 3.9+", result.stdout + result.stderr)
        self.assertFalse(self.log.exists())
        self.assertNotEqual(self.git("config", "--local", "--get", "core.hooksPath", check=False).returncode, 0)


if __name__ == "__main__":
    unittest.main()
