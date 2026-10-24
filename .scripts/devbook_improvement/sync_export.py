"""Bind a local official Syncer export to its exact Git source and output trees.

Receipts detect stale exports; their hashes are not a cryptographic attestation
that Syncer produced the files. Local execution and manual review supply provenance.
"""
from __future__ import annotations

import argparse
import base64
import fcntl
import json
import os
from pathlib import Path
import runpy
import subprocess
from typing import Any, Mapping, Sequence

RECEIPT_PATH = '.devbook-improvement/syncer-export.json'
OUTPUTS = ('Web/content', 'Web/quartz/styles/syncer', 'Web/quartz/styles/custom.scss')
POLICY_PATHS = (
    '.scripts/sync-quartz.py', '.scripts/quartz-syncer.defaults.json',
    'Vault/.obsidian/plugins/quartz-syncer/main.js',
    'Vault/.obsidian/plugins/quartz-syncer/manifest.json',
)


def is_export_path(path: str) -> bool:
    if not isinstance(path, str) or path.startswith('/') or '..' in path.split('/'):
        return False
    return path == RECEIPT_PATH or any(path == prefix or path.startswith(prefix + '/') for prefix in OUTPUTS)


def needs_export(before: Mapping[str, str], candidate: Mapping[str, str]) -> bool:
    return any(path.startswith('Vault/Home/') and path.endswith('.md') and before.get(path) != text
               for path, text in candidate.items())


def _groups(entries: Sequence[Mapping[str, Any]]) -> dict[str, dict[str, dict[str, str]]]:
    groups: dict[str, dict[str, dict[str, str]]] = {'sources': {}, 'outputs': {}, 'policy': {}}
    for entry in entries:
        path = entry.get('path', '')
        if not isinstance(path, str) or path.startswith('/') or '..' in path.split('/'):
            raise ValueError('unsafe Git tree path')
        if entry.get('type') == 'tree':
            continue
        group = ('policy' if path in POLICY_PATHS else
                 'sources' if path.startswith('Vault/') and not path.startswith('Vault/.obsidian/') else
                 'outputs' if path != RECEIPT_PATH and is_export_path(path) else None)
        if group is None:
            continue
        mode, sha = entry.get('mode'), entry.get('sha')
        if entry.get('type') != 'blob' or mode not in {'100644', '100755'}:
            raise ValueError(f'export input/output must be a regular Git blob: {path}')
        if not isinstance(sha, str) or len(sha) not in {40, 64} or any(c not in '0123456789abcdef' for c in sha):
            raise ValueError(f'invalid Git blob hash: {path}')
        if path in groups[group]:
            raise ValueError(f'duplicate Git tree path: {path}')
        groups[group][path] = {'sha': sha, 'mode': mode}
    if set(groups['policy']) != set(POLICY_PATHS) or not groups['sources'] or not groups['outputs']:
        raise ValueError('incomplete source, generated output, or Syncer policy tree')
    return groups


def make_receipt(entries: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    return {'version': 1, **_groups(entries)}


def validate_receipt(receipt: Mapping[str, Any], tree_entries: Sequence[Mapping[str, Any]]) -> bool:
    if not isinstance(receipt, Mapping) or dict(receipt) != make_receipt(tree_entries):
        raise ValueError('Syncer export receipt is missing or stale for this source/output/policy tree')
    return True



def remote_receipt(api: Any, head_sha: str) -> tuple[dict[str, Any], bool]:
    """Verify a receipt using the exact remote Git tree; never trust partial trees."""
    from . import runtime
    tree = api.request('GET', f'/git/trees/{head_sha}?recursive=1')
    if not isinstance(tree, Mapping) or tree.get('truncated') is not False or not isinstance(tree.get('tree'), list):
        raise runtime.Conflict('complete remote Git tree is required to verify the Syncer receipt')
    entries = tree['tree']
    receipts = [entry for entry in entries if entry.get('path') == RECEIPT_PATH]
    if len(receipts) != 1 or receipts[0].get('mode') != '100644' or receipts[0].get('type') != 'blob':
        raise runtime.Conflict('official local Syncer export receipt is missing')
    blob = api.request('GET', f"/git/blobs/{receipts[0]['sha']}")
    try:
        if blob.get('encoding') != 'base64' or not isinstance(blob.get('content'), str) or len(blob['content']) > 8_000_000:
            raise ValueError('invalid or oversized receipt blob')
        receipt = json.loads(base64.b64decode(blob['content']))
        current = make_receipt(entries)
        old_sources = receipt.get('sources')
        if not isinstance(old_sources, dict) or not old_sources:
            raise ValueError('invalid source binding')
        historical_entries = [entry for entry in entries if entry.get('path') not in current['sources']]
        for path, value in old_sources.items():
            if (not isinstance(path, str) or not path.startswith('Vault/')
                    or path.startswith('Vault/.obsidian/') or not isinstance(value, dict)
                    or set(value) != {'sha', 'mode'}):
                raise ValueError('invalid historical source entry')
            historical_entries.append({'path': path, 'type': 'blob', **value})
        # Historical sources can be stale after a later owner correction. The
        # generated outputs and exporter policy must still match exactly.
        validate_receipt(receipt, historical_entries)
    except (ValueError, TypeError, AttributeError) as error:
        raise runtime.Conflict('official local Syncer export output/policy receipt is invalid') from error
    return receipt, receipt['sources'] == current['sources']


def _git(root: Path, *args: str) -> bytes:
    return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.PIPE)


def tree_entries(root: Path, ref: str = 'HEAD') -> list[dict[str, str]]:
    result = []
    for record in _git(root, 'ls-tree', '-rz', '--full-tree', ref).split(b'\0'):
        if record:
            header, name = record.split(b'\t', 1)
            mode, kind, sha = header.decode('ascii').split()
            result.append({'path': os.fsdecode(name), 'mode': mode, 'type': kind, 'sha': sha})
    return result


def _index_entries(root: Path) -> list[dict[str, str]]:
    result = []
    for record in _git(root, 'ls-files', '--stage', '-z').split(b'\0'):
        if not record:
            continue
        header, name = record.split(b'\t', 1)
        mode, sha, stage = header.decode('ascii').split()
        if stage != '0':
            raise ValueError('unresolved index conflicts')
        result.append({'path': os.fsdecode(name), 'mode': mode, 'type': 'blob', 'sha': sha})
    return result


def _changed_paths(root: Path, *args: str) -> list[str]:
    return [os.fsdecode(path) for path in _git(root, 'diff', '--name-only', '-z', *args).split(b'\0') if path]


def verify(root: Path, base_ref: str, head_ref: str) -> bool:
    if not head_ref.startswith('notes/automated-'):
        return False
    changes = _changed_paths(root, base_ref, 'HEAD', '--', 'Vault/Home')
    if not any(path.endswith('.md') for path in changes):
        return False
    try:
        receipt = json.loads(_git(root, 'show', f'HEAD:{RECEIPT_PATH}'))
        validate_receipt(receipt, tree_entries(root))
    except (ValueError, subprocess.CalledProcessError) as error:
        head = _git(root, 'rev-parse', 'HEAD').decode().strip()
        raise ValueError('Official local Quartz export required before merge. In a clean dedicated checkout '
                         'with its Vault open in Obsidian, run: python3 -m devbook_improvement.sync_export '
                         f'export --expected-head {head} (PYTHONPATH=.scripts). Commit and push the staged '
                         'generated outputs and receipt after reviewing them.') from error
    return True


def export(root: Path, expected_head: str) -> dict[str, Any]:
    if _git(root, 'rev-parse', 'HEAD').decode().strip() != expected_head:
        raise ValueError('checkout HEAD differs from expected PR head')
    branch = _git(root, 'symbolic-ref', '--short', 'HEAD').decode().strip()
    if not branch.startswith('notes/automated-'):
        raise ValueError('local export requires a managed notes/automated-* branch')
    if _git(root, 'status', '--porcelain', '--untracked-files=all').strip():
        raise ValueError('local export requires a clean dedicated checkout, index, and generated outputs')
    original = make_receipt(tree_entries(root))
    syncer = runpy.run_path(str(root / '.scripts/sync-quartz.py'))
    lock_path = Path(os.fsdecode(_git(root, 'rev-parse', '--git-path', 'quartz-sync.lock')).strip())
    if not lock_path.is_absolute():
        lock_path = root / lock_path
    with lock_path.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        # Explicit committed-head path: the ordinary hook exits when no source
        # is staged. Its export helper performs the full identity/index checks.
        syncer['guard_source'](root)
        syncer['guard_output'](root)
        syncer['export'](root)
        current = make_receipt(_index_entries(root))
        if current['sources'] != original['sources'] or current['policy'] != original['policy']:
            raise ValueError('source or export policy changed during official export')
        if _git(root, 'rev-parse', 'HEAD').decode().strip() != expected_head:
            raise ValueError('checkout HEAD changed during official export')
        changed = _changed_paths(root, '--cached', 'HEAD')
        if any(not is_export_path(path) for path in changed):
            raise ValueError('export staged files outside generated output boundaries')
        if _changed_paths(root):
            raise ValueError('unstaged tracked files changed during export')
        destination = root / RECEIPT_PATH
        if destination.is_symlink() or destination.parent.is_symlink():
            raise ValueError('receipt destination cannot be a symlink')
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(current, indent=2, sort_keys=True) + '\n')
        _git(root, 'add', '--', RECEIPT_PATH)
        validate_receipt(current, _index_entries(root))
        return current


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_subparsers(dest='mode', required=True)
    check = modes.add_parser('verify')
    check.add_argument('--base-ref', required=True)
    check.add_argument('--head-ref', default=os.environ.get('DEVBOOK_EXPORT_HEAD_REF', ''))
    local = modes.add_parser('export')
    local.add_argument('--expected-head', required=True)
    args = parser.parse_args()
    root = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip())
    try:
        if args.mode == 'verify':
            required = verify(root, args.base_ref, args.head_ref)
            print('Syncer export receipt verified.' if required else 'No managed-note export handoff required.')
        else:
            export(root, args.expected_head)
            print('Official export and receipt staged. Review, then commit and push explicitly.')
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'{error}\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
