from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "generate-roadmap.py"
SPEC = importlib.util.spec_from_file_location("generate_roadmap", SCRIPT)
assert SPEC and SPEC.loader
generate_roadmap = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = generate_roadmap
SPEC.loader.exec_module(generate_roadmap)


class RoadmapGeneratorTests(unittest.TestCase):
    def test_hidden_top_level_directories_are_excluded(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            vault_root = Path(temp) / "Vault"
            home = vault_root / "Home"
            topic = home / "Topic"
            runtime = home / ".omc" / "state" / "sessions" / "session-id"
            topic.mkdir(parents=True)
            runtime.mkdir(parents=True)
            (topic / "Topic.md").write_text("---\nstatus: Creation\n---\n", encoding="utf-8")

            with (
                patch.object(generate_roadmap, "VAULT_ROOT", str(vault_root)),
                patch.object(generate_roadmap, "KNOWLEDGE", str(home)),
            ):
                canvas, _invalid = generate_roadmap.generate()

            node_text = [str(node.get("text", "")) for node in canvas["nodes"]]
            self.assertTrue(any("Home/Topic/Topic" in text for text in node_text))
            self.assertFalse(any(".omc" in text for text in node_text))


if __name__ == "__main__":
    unittest.main()
