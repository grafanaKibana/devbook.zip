"""Isolated repository inputs for credential-free pipeline tests."""

from pathlib import Path
import shutil
import tempfile

from devbook_improvement import core


def pipeline_root(test, source: Path) -> Path:
    temporary = tempfile.TemporaryDirectory()
    test.addCleanup(temporary.cleanup)
    root = Path(temporary.name)
    for relative in (*core.CONTENT_AUTHORITIES, ".scripts/validate-vault.py"):
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / relative, target)
    return root
