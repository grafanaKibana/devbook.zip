"""Isolated desktop export and a generated-files-only GitHub publisher.

The renderer receives no production credentials. Its artifact is untrusted input
until the publisher checks the exact source head, paths and complete receipt.
"""
from __future__ import annotations

import argparse
import base64
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tempfile
from typing import Any, Mapping
from urllib.parse import quote
from urllib.request import Request, urlopen

from . import runtime, sync_export

WORKFLOW = 'devbook-improvement-export.yml'
EXPORT_COMMIT_MESSAGE = 'notes: export reviewed DevBook improvements'
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_TOTAL_BYTES = 50 * 1024 * 1024
PLUGINS = ('quartz-syncer', 'datacore', 'tabsdown', 'obsidian-excalidraw-plugin')


def _head(value: str) -> str:
    if not isinstance(value, str) or not re.fullmatch(r'[0-9a-f]{40}', value):
        raise runtime.UnsafeInput('export requires an exact GitHub commit SHA')
    return value


def _identity(pr: Mapping[str, Any], config: Mapping[str, Any], number: int, branch: str) -> bool:
    marker = runtime.parse_marker(str(pr.get('body') or ''))
    author = pr.get('user') or {}
    allowed = {(row['id'], str(row['login']).casefold()) for row in config.get('owner_allowlist', [])}
    if (author.get('id'), str(author.get('login', '')).casefold()) not in allowed:
        raise runtime.UnsafeInput('managed export PR author is not allowlisted')
    if not marker or pr.get('number') != number:
        raise runtime.UnsafeInput('export PR lacks its managed identity')
    if not runtime.valid_pr_identity(pr, str(config['repo']), str(config.get('base_branch', 'main')), *marker):
        raise runtime.UnsafeInput('export PR identity changed')
    if branch != runtime.expected_managed_branch(*marker):
        raise runtime.UnsafeInput('export branch differs from its managed PR')
    return runtime.lifecycle(pr) == 'open'


def _pr(api: Any, config: Mapping[str, Any], number: int, branch: str, expected_head: str) -> dict[str, Any] | None:
    _head(expected_head)
    if not isinstance(number, int) or isinstance(number, bool) or number < 1:
        raise runtime.UnsafeInput('invalid export PR number')
    pr = api.request('GET', f'/pulls/{number}')
    if not _identity(pr, config, number, branch):
        return None
    ref = api.request('GET', '/git/ref/heads/' + quote(branch, safe=''))
    if pr.get('head', {}).get('sha') != expected_head or ref.get('object', {}).get('sha') != expected_head:
        return None
    return dict(pr)


def dispatch_export(api: Any, pr_number: int, branch: str, expected_head: str, ref: str = 'main') -> None:
    _head(expected_head)
    if not re.fullmatch(r'notes/automated-[a-z0-9-]+-g[1-9][0-9]*', branch) or pr_number < 1:
        raise runtime.UnsafeInput('invalid automatic export dispatch identity')
    api.request('POST', f'/actions/workflows/{WORKFLOW}/dispatches', {
        'ref': ref, 'inputs': {'mode': 'managed', 'pr_number': str(pr_number),
                              'branch': branch, 'expected_head': expected_head},
    })


def _blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def _export_path(path: str) -> bool:
    if not isinstance(path, str) or '\\' in path or any(ord(c) < 32 or ord(c) == 127 for c in path):
        return False
    pure = PurePosixPath(path)
    return (pure.as_posix() == path and not pure.is_absolute() and not any(part in {'.', '..'} for part in path.split('/'))
            and sync_export.is_export_path(path))


def decode_bundle(bundle: Mapping[str, Any]) -> dict[str, bytes | None]:
    if not isinstance(bundle, Mapping) or set(bundle) != {'version', 'expected_head', 'branch', 'pr_number', 'files'} or bundle['version'] != 1:
        raise runtime.UnsafeInput('invalid export artifact schema')
    _head(bundle['expected_head'])
    files = bundle['files']
    if not isinstance(files, dict) or not files or len(files) > 2000:
        raise runtime.UnsafeInput('invalid export artifact files')
    decoded: dict[str, bytes | None] = {}
    total = 0
    for path, value in files.items():
        if not _export_path(path):
            raise runtime.UnsafeInput('export artifact contains a non-generated path')
        if value is None:
            decoded[path] = None
            continue
        if not isinstance(value, str) or len(value) > 4 * ((MAX_FILE_BYTES + 2) // 3):
            raise runtime.UnsafeInput('invalid or oversized generated file')
        try:
            data = base64.b64decode(value, validate=True)
        except ValueError as error:
            raise runtime.UnsafeInput('generated artifact is not strict base64') from error
        total += len(data)
        if len(data) > MAX_FILE_BYTES or total > MAX_TOTAL_BYTES:
            raise runtime.UnsafeInput('generated artifact exceeds the export size bound')
        decoded[path] = data
    if not decoded.get(sync_export.RECEIPT_PATH):
        raise runtime.UnsafeInput('export artifact requires its complete receipt')
    return decoded


def _tree_entries(api: Any, head: str) -> dict[str, dict[str, Any]]:
    tree = api.request('GET', f'/git/trees/{head}?recursive=1')
    if not isinstance(tree, dict) or tree.get('truncated') is not False or not isinstance(tree.get('tree'), list):
        raise runtime.Conflict('complete remote tree is required before export publication')
    entries = {entry['path']: dict(entry) for entry in tree['tree']}
    if len(entries) != len(tree['tree']):
        raise runtime.UnsafeInput('duplicate remote Git tree paths')
    return entries


def _predicted_entries(api: Any, expected: str, files: Mapping[str, bytes | None]) -> dict[str, dict[str, Any]]:
    entries = _tree_entries(api, expected)
    for path, data in files.items():
        prior = entries.get(path)
        if prior and (prior.get('type') != 'blob' or prior.get('mode') != '100644'):
            raise runtime.UnsafeInput('generated output is not a regular file')
        if data is None:
            if path == sync_export.RECEIPT_PATH or prior is None:
                raise runtime.UnsafeInput('invalid generated deletion')
            entries.pop(path)
        else:
            entries[path] = {'path': path, 'mode': '100644', 'type': 'blob', 'sha': _blob_sha(data)}
    try:
        receipt = json.loads(files[sync_export.RECEIPT_PATH])
        sync_export.validate_receipt(receipt, list(entries.values()))
    except (ValueError, TypeError) as error:
        raise runtime.UnsafeInput('generated artifact does not match the exact source/output/policy tree') from error
    return entries


def _leaf_tree(entries: Mapping[str, Mapping[str, Any]]) -> dict[str, tuple[Any, Any, Any]]:
    return {path: (row.get('mode'), row.get('type'), row.get('sha'))
            for path, row in entries.items() if row.get('type') != 'tree'}


def _resume_validation(api: Any, config: Mapping[str, Any], bundle: Mapping[str, Any],
                       files: Mapping[str, bytes | None]) -> dict[str, Any]:
    """Recognize this exact applied artifact before retrying its downstream check."""
    stale = {'status': 'stale', 'model_calls': 0}
    number, branch, expected = bundle['pr_number'], bundle['branch'], bundle['expected_head']
    pr = api.request('GET', f'/pulls/{number}')
    if not _identity(pr, config, number, branch):
        return stale
    head = _head(pr.get('head', {}).get('sha'))
    if _pr(api, config, number, branch, head) is None:
        return stale
    commit = api.request('GET', f'/git/commits/{head}')
    parents = commit.get('parents')
    if (commit.get('message') != EXPORT_COMMIT_MESSAGE or not isinstance(parents, list)
            or len(parents) != 1 or not isinstance(parents[0], dict) or parents[0].get('sha') != expected):
        return stale
    predicted = _predicted_entries(api, expected, files)
    if _leaf_tree(_tree_entries(api, head)) != _leaf_tree(predicted):
        return stale
    if _pr(api, config, number, branch, head) is None:
        return stale
    runtime.dispatch_vault_validation(api, branch)
    return {'status': 'exported', 'commit_sha': head, 'pr_number': number, 'model_calls': 0, 'resumed': True}


def publish_bundle(api: Any, config: Mapping[str, Any], bundle: Mapping[str, Any]) -> dict[str, Any]:
    """Write only verified generated bytes, never source notes or automation code."""
    files = decode_bundle(bundle)
    expected = bundle['expected_head']
    branch, number = bundle['branch'], bundle['pr_number']
    current = _pr(api, config, number, branch, expected)
    if current is None:
        return _resume_validation(api, config, bundle, files)
    _predicted_entries(api, expected, files)
    # All artifact checks precede writes. Stale retries return without side effects.
    if _pr(api, config, number, branch, expected) is None:
        return {'status': 'stale', 'model_calls': 0}
    parent = api.request('GET', f'/git/commits/{expected}')
    changes = []
    for path, data in sorted(files.items()):
        if data is None:
            changes.append({'path': path, 'mode': '100644', 'type': 'blob', 'sha': None})
        else:
            blob = api.request('POST', '/git/blobs', {'encoding': 'base64', 'content': base64.b64encode(data).decode()})
            if blob.get('sha') != _blob_sha(data):
                raise runtime.RuntimeFailure('GitHub blob hash differs from verified export')
            changes.append({'path': path, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
    new_tree = api.request('POST', '/git/trees', {'base_tree': parent['tree']['sha'], 'tree': changes})
    commit = api.request('POST', '/git/commits', {'message': EXPORT_COMMIT_MESSAGE,
        'tree': new_tree['sha'], 'parents': [expected]})
    latest = _pr(api, config, number, branch, expected)
    if latest is None:
        return {'status': 'stale', 'model_calls': 0}
    runtime.ensure_draft_for_mutation(api, latest)
    ref_path = '/git/refs/heads/' + quote(branch, safe='')
    if api.request('GET', ref_path)['object']['sha'] != expected:
        return {'status': 'stale', 'model_calls': 0}
    api.request('PATCH', ref_path, {'sha': commit['sha'], 'force': False})
    runtime.dispatch_vault_validation(api, branch)
    return {'status': 'exported', 'commit_sha': commit['sha'], 'pr_number': number, 'model_calls': 0}


class ReadOnlyApi:
    """GET-only renderer preflight; production tokens never enter this job."""
    def __init__(self, repo: str, token: str | None = None):
        if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
            raise runtime.UnsafeInput('invalid renderer repository')
        self.repo, self.token = repo, token

    def request(self, method: str, path: str, payload: Any = None, *, paginate: bool = False) -> Any:
        if method != 'GET' or payload is not None or not path.startswith('/') or any(part in {'.', '..'} for part in path.split('?', 1)[0].split('/')):
            raise runtime.UnsafeInput('renderer transport is read-only')
        if paginate:
            rows = []
            for page in range(1, 11):
                result = self.request('GET', f'{path}{"&" if "?" in path else "?"}page={page}')
                if not isinstance(result, list):
                    raise runtime.RuntimeFailure('invalid renderer pagination')
                rows.extend(result)
                if len(result) < 100:
                    return rows
            raise runtime.RuntimeFailure('renderer pagination bound exceeded')
        headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'DevBookVerifiedExport'}
        if self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        with urlopen(Request(f'https://api.github.com/repos/{self.repo}{path}', headers=headers), timeout=60) as response:
            data = response.read(20 * 1024 * 1024 + 1)
        if len(data) > 20 * 1024 * 1024:
            raise runtime.RuntimeFailure('renderer response exceeds its bound')
        return json.loads(data)


def _git(root: Path, *args: str) -> bytes:
    return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.PIPE)


def bundle_checkout(root: Path, number: int, branch: str, expected: str) -> dict[str, Any]:
    if _git(root, 'rev-parse', 'HEAD').decode().strip() != expected:
        raise runtime.Conflict('export checkout moved before artifact collection')
    files: dict[str, str | None] = {}
    for raw in _git(root, 'diff', '--cached', '--name-only', '-z').split(b'\0'):
        if not raw:
            continue
        path = os.fsdecode(raw)
        if not _export_path(path):
            raise runtime.UnsafeInput('export staged a non-generated path')
        staged = _git(root, 'ls-files', '--stage', '-z', '--', path)
        if not staged:
            files[path] = None
            continue
        mode = staged.split(b' ', 1)[0]
        if mode != b'100644':
            raise runtime.UnsafeInput('export staged an unsafe file mode')
        files[path] = base64.b64encode(_git(root, 'show', ':' + path)).decode()
    bundle = {'version': 1, 'expected_head': expected, 'branch': branch, 'pr_number': number, 'files': files}
    decode_bundle(bundle)
    return bundle


@contextmanager
def _owned_checkout(prefix: str):
    """Retain the whole checkout when the desktop adapter retains recovery data."""
    temporary = Path(tempfile.mkdtemp(prefix=prefix))
    failure = None
    try:
        yield temporary
    except BaseException as error:
        failure = error
        raise
    finally:
        backups = list((temporary / 'repo').glob('.desktop-export-*/settings'))
        if backups:
            raise runtime.RuntimeFailure(
                f'{failure}; desktop export checkout retained for recovery at {temporary}; original settings: {backups[0]}'
            ) from failure
        shutil.rmtree(temporary)


def render_managed(trusted: Path, api: Any, config: Mapping[str, Any], number: int, branch: str,
                   expected: str, app_bundle: Path, *, timeout_seconds: int = 600) -> dict[str, Any]:
    pr = _pr(api, config, number, branch, expected)
    if pr is None:
        return {'status': 'stale'}
    files = api.request('GET', f'/pulls/{number}/files?per_page=100', paginate=True)
    for entry in files:
        path = entry.get('filename', '')
        if not (path.startswith('Vault/Home/') and path.endswith('.md') and '..' not in path.split('/')) and not _export_path(path):
            raise runtime.UnsafeInput('managed export PR changes files outside notes/generated output')
    base_sha = pr.get('base', {}).get('sha')
    _head(base_sha)
    comparison = api.request('GET', f'/compare/{base_sha}...{expected}')
    if comparison.get('merge_base_commit', {}).get('sha') != base_sha:
        return {'status': 'stale', 'reason': 'topic branch needs the current base'}
    with _owned_checkout('devbook-managed-export-') as temp:
        checkout = Path(temp) / 'repo'
        subprocess.run(['git', 'clone', '--no-hardlinks', '--quiet', str(trusted), str(checkout)], check=True)
        _git(checkout, 'checkout', '-B', branch, expected)
        # Never execute PR-provided exporter scripts or plugin bundles. The
        # trusted workflow checkout supplies the implementation at this run.
        trusted_paths = (*sync_export.POLICY_PATHS, '.scripts/validate-vault.py')
        for path in trusted_paths:
            if (checkout / path).is_symlink() or (checkout / path).read_bytes() != (trusted / path).read_bytes():
                raise runtime.UnsafeInput('candidate export policy differs from trusted workflow checkout')
        for plugin in PLUGINS:
            for name in ('main.js', 'manifest.json', 'styles.css'):
                candidate, source = checkout / 'Vault/.obsidian/plugins' / plugin / name, trusted / 'Vault/.obsidian/plugins' / plugin / name
                if candidate.exists() != source.exists() or (candidate.exists() and (candidate.is_symlink() or candidate.read_bytes() != source.read_bytes())):
                    raise runtime.UnsafeInput('candidate renderer plugin differs from trusted workflow checkout')
        from .desktop_export import export_checkout
        export_checkout(checkout, expected, app_bundle, timeout_seconds=timeout_seconds)
        result = bundle_checkout(checkout, number, branch, expected)
        sync_export.validate_receipt(json.loads(base64.b64decode(result['files'][sync_export.RECEIPT_PATH])), sync_export._index_entries(checkout))
        return {'status': 'rendered', 'bundle': result}


def fixture_export(trusted: Path, app_bundle: Path, *, timeout_seconds: int = 600) -> dict[str, Any]:
    """A genuine desktop smoke, confined to a synthetic non-production vault."""
    with _owned_checkout('devbook-export-fixture-') as temp:
        root = Path(temp) / 'repo'
        root.mkdir()
        scripts = _git(trusted, 'ls-files', '-z', '--', ':(glob).scripts/*.py',
                       '.scripts/quartz-syncer.defaults.json').decode().split('\0')
        for path in filter(None, scripts):
            source, target = trusted / path, root / path
            if source.is_symlink() or not source.is_file():
                raise runtime.UnsafeInput('fixture tooling must be regular tracked files')
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        for plugin in PLUGINS:
            destination = root / 'Vault/.obsidian/plugins' / plugin
            destination.mkdir(parents=True, exist_ok=True)
            for name in ('main.js', 'manifest.json', 'styles.css'):
                source = trusted / 'Vault/.obsidian/plugins' / plugin / name
                if source.exists():
                    shutil.copyfile(source, destination / name)
        note = root / 'Vault/Home/Topic/Example.md'
        note.parent.mkdir(parents=True)
        note.write_text('''---\npublish: true\ncreated: 2026-10-01T00:00:00.000Z\nmodified: 2026-10-01T00:00:00.000Z\n---\n\n%% tabs %%\n%% tab: Example %%\nAn isolated fixture.\n%% endtabs %%\n\n> [!qard]- What does this fixture prove?\n> Genuine isolated export preserves the card.\n\n![[Assets/pixel.png]]\n''')
        questions = root / 'Vault/Home/Questions.md'
        questions.write_text('''---\npublish: true\ncreated: 2026-10-01T00:00:00.000Z\nmodified: 2026-10-01T00:00:00.000Z\n---\n\n```datacorejsx\nreturn <div className="dc-questions-index">FIXTURE_DATACORE_RENDERED</div>;\n```\n''')
        asset = root / 'Vault/Assets/pixel.png'
        asset.parent.mkdir()
        asset.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='))
        (root / 'Web').mkdir()
        shutil.copyfile(trusted / 'Web/quartz.config.yaml', root / 'Web/quartz.config.yaml')
        output = root / 'Web/content/Topic/Example.md'
        output.parent.mkdir(parents=True)
        output.write_text('---\ncreated: 2026-10-01T00:00:00.000Z\nmodified: 2026-10-01T00:00:00.000Z\npublished: 2026-10-01T00:00:00.000Z\n---\nOld fixture output.\n')
        _git(root, 'init', '-q', '-b', 'notes/automated-fixture-g1')
        _git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'add', '.')
        _git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'notes: seed export fixture')
        expected = _git(root, 'rev-parse', 'HEAD').decode().strip()
        source_hashes = {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in (note, questions, asset)}
        from .desktop_export import export_checkout
        export_checkout(root, expected, app_bundle, timeout_seconds=timeout_seconds)
        result = bundle_checkout(root, 1, 'notes/automated-fixture-g1', expected)
        exported = base64.b64decode(result['files']['Web/content/Topic/Example.md']).decode()
        dashboard = base64.b64decode(result['files']['Web/content/Questions.md']).decode()
        if ('%% tabs %%' not in exported or '%% endtabs %%' not in exported
                or 'Genuine isolated export preserves the card.' not in exported
                or 'FIXTURE_DATACORE_RENDERED' not in dashboard or 'dc-questions-index' not in dashboard
                or re.search(r'^\s*```datacore', dashboard, flags=re.M)):
            raise runtime.RuntimeFailure('genuine export did not preserve markers/cards or render Datacore')
        if base64.b64decode(result['files']['Web/content/Assets/pixel.png']) != asset.read_bytes():
            raise runtime.RuntimeFailure('genuine export changed fixture media bytes')
        if any(hashlib.sha256((root / path).read_bytes()).hexdigest() != digest for path, digest in source_hashes.items()):
            raise runtime.RuntimeFailure('genuine exporter changed fixture source')
        receipt = json.loads(base64.b64decode(result['files'][sync_export.RECEIPT_PATH]))
        sync_export.validate_receipt(receipt, sync_export._index_entries(root))
        return {'status': 'fixture_exported', 'source_unchanged': True, 'rendered_datacore': True,
                'preserved_markers': True, 'media_unchanged': True, 'file_count': len(result['files']),
                'bundle': result}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='mode', required=True)
    fixture = commands.add_parser('fixture')
    fixture.add_argument('--app-bundle', type=Path, required=True)
    fixture.add_argument('--output', type=Path, required=True)
    render = commands.add_parser('render')
    render.add_argument('--app-bundle', type=Path, required=True)
    render.add_argument('--output', type=Path, required=True)
    render.add_argument('--pr', type=int, required=True)
    render.add_argument('--branch', required=True)
    render.add_argument('--expected-head', required=True)
    publish = commands.add_parser('publish')
    publish.add_argument('--bundle', type=Path, required=True)
    args = parser.parse_args()
    trusted = Path(__file__).resolve().parents[2]
    config = json.loads((trusted / '.github/devbook-improvement.json').read_text())
    try:
        if args.mode == 'fixture':
            result = fixture_export(trusted, args.app_bundle)
        elif args.mode == 'render':
            api = ReadOnlyApi(config['repo'], os.environ.get('DEVBOOK_EXPORT_READ_TOKEN'))
            result = render_managed(trusted, api, config, args.pr, args.branch, args.expected_head, args.app_bundle)
        else:
            runtime.require_apply_activation()
            if args.bundle.stat().st_size > MAX_TOTAL_BYTES * 2:
                raise runtime.UnsafeInput('export bundle file exceeds its bound')
            result = publish_bundle(runtime.GhApi(config['repo']), config, json.loads(args.bundle.read_text()))
        if args.mode in {'fixture', 'render'}:
            args.output.mkdir(parents=True, exist_ok=True)
            artifact = result.pop('bundle', None)
            if artifact:
                (args.output / 'bundle.json').write_text(json.dumps(artifact, sort_keys=True) + '\n')
            (args.output / 'result.json').write_text(json.dumps(result, sort_keys=True) + '\n')
            if os.environ.get('GITHUB_OUTPUT'):
                with Path(os.environ['GITHUB_OUTPUT']).open('a') as output:
                    output.write('ready=' + ('true' if artifact else 'false') + '\n')
        print(json.dumps(result, sort_keys=True))
    except (runtime.RuntimeFailure, ValueError, OSError, subprocess.CalledProcessError) as error:
        print(json.dumps({'status': 'error', 'message': str(error)}))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
