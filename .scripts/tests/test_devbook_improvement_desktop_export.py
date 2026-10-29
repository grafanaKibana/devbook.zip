"""Desktop export isolation and deterministic inputs, without launching Obsidian."""
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.scripts'))
from devbook_improvement import desktop_export, sync_export


class DesktopExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'repo'
        self.root.mkdir()
        self.git('init', '-q', '-b', 'notes/automated-topic-g1')
        self.git('config', 'user.name', 'Fixture')
        self.git('config', 'user.email', 'fixture@example.test')
        for name in (*sync_export.POLICY_PATHS, 'Vault/Home/Topic/Note.md',
                     'Web/content/Topic/Note.md', 'Vault/.obsidian/plugins/qard/data.json'):
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('original fixture')
        for plugin in desktop_export.PLUGINS:
            target = self.root / 'Vault/.obsidian/plugins' / plugin
            target.mkdir(parents=True, exist_ok=True)
            (target / 'main.js').write_text(f'trusted {plugin}')
            (target / 'manifest.json').write_text(json.dumps({'id': plugin, 'minAppVersion': '1.13.0'}))
            (target / 'data.json').write_text('private settings never copied')
        (self.root / 'Vault/.obsidian/community-plugins.json').write_text('["qard","obsidian-git"]')
        (self.root / 'Web/content/Topic/Note.md').write_text('''---
created: 2026-10-01T10:20:30.123Z
modified: 2026-10-02T11:22:33.456Z
published: 2026-10-02T11:22:33.456Z
---
Original compiled output.
''')
        self.commit('initial', '2026-10-03T12:00:00Z')
        self.head = self.git('rev-parse', 'HEAD').strip()
        self.app = Path(self.temp.name) / 'Obsidian.app'
        (self.app / 'Contents/MacOS').mkdir(parents=True)
        (self.app / 'Contents/Info.plist').write_bytes(plistlib.dumps({
            'CFBundleExecutable': 'Obsidian', 'CFBundleShortVersionString': '1.14.5'}))
        for name in ('Obsidian', 'obsidian-cli'):
            (self.app / 'Contents/MacOS' / name).write_text('fixture executable')

    def git(self, *args, env=None):
        return subprocess.check_output(['git', *args], cwd=self.root, text=True, env=env)

    def commit(self, message, date):
        self.git('add', '.')
        self.git('commit', '-qm', message, env={**os.environ, 'GIT_AUTHOR_DATE': date, 'GIT_COMMITTER_DATE': date})

    def config_hashes(self, folder=None):
        folder = folder or self.root / 'Vault/.obsidian'
        return {path.relative_to(folder).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in folder.rglob('*') if path.is_file()}

    def session(self, *args):
        root = self.root
        parent = self
        self.last_profile = args[1]
        self.addCleanup(lambda profile=self.last_profile: shutil.rmtree(profile, ignore_errors=True))
        class FakeSession:
            def start(self):
                self.started = True
                folder = root / 'Vault/.obsidian'
                parent.assertEqual([], json.loads((folder / 'community-plugins.json').read_text()))
                parent.assertFalse((folder / 'plugins/qard').exists())
                parent.assertFalse(any(folder.rglob('data.json')))
            def wrapper(self, destination):
                destination.write_text('fixture CLI wrapper')
                return destination
            def close(self):
                self.closed = True
        result = FakeSession()
        self.last_session = result
        return result

    def official_export(self, root):
        (root / 'Web/content/Topic/Note.md').write_text('exact native output')
        subprocess.run(['git', 'add', '--', 'Web/content'], cwd=root, check=True)

    def render(self, exporter=None, session=None):
        helpers = {'guard_source': lambda _: None, 'guard_output': lambda _: None,
                   'export': exporter or self.official_export}
        mkdtemp = tempfile.mkdtemp
        self.profile_root = Path('/private/tmp') if Path('/private/tmp').is_dir() else Path('/tmp')
        def temporary_directory(*args, **kwargs):
            if kwargs.get('dir') == '/private/tmp':
                kwargs['dir'] = str(self.profile_root)
            return mkdtemp(*args, **kwargs)
        with mock.patch.object(desktop_export, 'DesktopSession', side_effect=session or self.session), \
                mock.patch.object(desktop_export, 'materialize_timestamps'), \
                mock.patch.object(desktop_export.tempfile, 'mkdtemp', side_effect=temporary_directory), \
                mock.patch.object(sync_export.runpy, 'run_path', return_value=helpers), \
                mock.patch.object(desktop_export.sys, 'platform', 'darwin'):
            return desktop_export.export_checkout(self.root, self.head, self.app)

    def test_fresh_settings_private_index_and_real_index_boundaries(self):
        original = self.config_hashes()
        flags = self.git('ls-files', '-v', '--', 'Vault/.obsidian')
        environment = dict(os.environ)
        receipt = self.render()
        self.assertEqual(original, self.config_hashes())
        self.assertEqual(flags, self.git('ls-files', '-v', '--', 'Vault/.obsidian'))
        self.assertEqual(environment, dict(os.environ))
        self.assertTrue(self.last_session.closed)
        self.assertEqual({'Web/content/Topic/Note.md', sync_export.RECEIPT_PATH},
                         set(self.git('diff', '--cached', '--name-only').splitlines()))
        self.assertTrue(sync_export.validate_receipt(receipt, sync_export._index_entries(self.root)))
        self.assertEqual(self.head, self.git('rev-parse', 'HEAD').strip())
        self.assertFalse(list(self.root.glob('.desktop-export-*')))
        self.assertLess(len(os.fsencode(self.last_profile / '.obsidian-cli.sock')), 104)
        self.assertEqual(self.profile_root, self.last_profile.parent)
        self.assertFalse(self.last_profile.exists())

    def test_outdated_bundled_app_fails_before_launch_or_checkout_mutation(self):
        (self.app / 'Contents/Info.plist').write_bytes(plistlib.dumps({
            'CFBundleExecutable': 'Obsidian', 'CFBundleShortVersionString': '1.12.7'}))
        original = self.config_hashes()
        with mock.patch.object(desktop_export, 'DesktopSession') as session, \
                mock.patch.object(desktop_export.sys, 'platform', 'darwin'):
            with self.assertRaisesRegex(ValueError, 'Obsidian 1.12.7.*minimum 1.13.0'):
                desktop_export.export_checkout(self.root, self.head, self.app)
            session.assert_not_called()
        self.assertEqual(original, self.config_hashes())
        self.assertFalse(list(self.root.glob('.desktop-export-*')))
        self.assertEqual('', self.git('status', '--porcelain'))

    def test_export_failure_restores_original_settings_without_staging(self):
        original = self.config_hashes()
        with self.assertRaisesRegex(RuntimeError, 'render failed'):
            self.render(exporter=mock.Mock(side_effect=RuntimeError('render failed')))
        self.assertTrue(self.last_session.closed)
        self.assertEqual(original, self.config_hashes())
        self.assertEqual('', self.git('diff', '--cached', '--name-only'))
        self.assertEqual('', self.git('status', '--porcelain'))

    def test_failed_process_ownership_retains_settings_backup_without_real_index_changes(self):
        original = self.config_hashes()
        def failed_close(*args):
            session = self.session(*args)
            session.close = mock.Mock(side_effect=ValueError('unowned process'))
            return session
        with self.assertRaisesRegex(ValueError, 'unowned process'):
            self.render(session=failed_close)
        backups = list(self.root.glob('.desktop-export-*/settings'))
        self.assertEqual(1, len(backups))
        self.assertEqual(original, self.config_hashes(backups[0]))
        self.assertEqual('', self.git('diff', '--cached', '--name-only'))
        recovery = json.loads((backups[0].parent / 'recovery.json').read_text())
        self.assertEqual(str(self.last_profile), recovery['profile'])
        self.assertTrue(self.last_profile.is_dir())

    def test_source_mutation_is_preserved_and_blocks_receipt(self):
        def changed_source(root):
            (root / 'Vault/Home/Topic/Note.md').write_text('concurrent source edit')
        with self.assertRaisesRegex(ValueError, 'unstaged tracked files'):
            self.render(exporter=changed_source)
        self.assertEqual('concurrent source edit', (self.root / 'Vault/Home/Topic/Note.md').read_text())
        self.assertFalse((self.root / sync_export.RECEIPT_PATH).exists())
        self.assertEqual('', self.git('diff', '--cached', '--name-only'))

    def test_timestamp_plan_preserves_old_dates_and_updates_only_changed_source(self):
        source = self.root / 'Vault/Home/Topic/Note.md'
        generated = (self.root / 'Web/content/Topic/Note.md').read_bytes()
        with mock.patch.object(desktop_export, '_set_file_times') as setter:
            desktop_export.materialize_timestamps(self.root)
        self.assertEqual(mock.call(source, desktop_export._date_ns('2026-10-01T10:20:30.123Z'),
                                  desktop_export._date_ns('2026-10-02T11:22:33.456Z')), setter.call_args)
        source.write_text('new source')
        self.commit('source change', '2026-10-06T13:00:00Z')
        with mock.patch.object(desktop_export, '_set_file_times') as setter:
            desktop_export.materialize_timestamps(self.root)
        self.assertEqual(mock.call(source, desktop_export._date_ns('2026-10-01T10:20:30.123Z'),
                                  desktop_export._date_ns('2026-10-06T13:00:00Z')), setter.call_args)
        self.assertEqual(generated, (self.root / 'Web/content/Topic/Note.md').read_bytes())

    @unittest.skipUnless(sys.platform == 'darwin', 'Darwin birth-time materialization')
    def test_native_filesystem_timestamp_roundtrip_preserves_milliseconds(self):
        path = self.root / 'Vault/Home/Topic/Note.md'
        created = desktop_export._date_ns('2026-10-01T10:20:30.123Z')
        modified = desktop_export._date_ns('2026-10-06T13:00:00.456Z')
        desktop_export._set_file_times(path, created, modified)
        observed = path.stat()
        self.assertEqual(created // 1_000_000, round(observed.st_birthtime * 1000))
        self.assertEqual(modified // 1_000_000, observed.st_mtime_ns // 1_000_000)

    def test_environment_and_wrapper_exclude_host_credentials(self):
        profile = Path(self.temp.name) / 'profile'
        profile.mkdir()
        with mock.patch.dict(os.environ, {'GH_TOKEN': 'do-not-copy', 'CLAUDE_CODE_OAUTH_TOKEN': 'do-not-copy'}):
            environment = desktop_export.controlled_environment(profile)
            self.assertFalse(any('TOKEN' in key or 'SECRET' in key for key in environment))
            session = desktop_export.DesktopSession(self.app, profile, self.root / 'Vault', 123456.0)
            session.pid = 42
            wrapper = session.wrapper(profile / 'cli-wrapper')
            self.assertNotIn('do-not-copy', wrapper.read_text())
            self.assertIn('_identity(', wrapper.read_text())
            compile(wrapper.read_text().split('\n', 1)[1], str(wrapper), 'exec')

    def test_unowned_process_is_never_terminated(self):
        profile = Path(self.temp.name) / 'profile'
        profile.mkdir()
        session = desktop_export.DesktopSession(self.app, profile, self.root / 'Vault', 123456.0)
        session.pid = 42
        with mock.patch.object(desktop_export, '_identity', return_value=99), mock.patch.object(desktop_export.os, 'kill') as kill:
            with self.assertRaisesRegex(ValueError, 'unowned'):
                session.close()
            kill.assert_not_called()

    def test_launcher_without_owned_identity_blocks_destructive_cleanup(self):
        profile = Path(self.temp.name) / 'profile'
        profile.mkdir()
        session = desktop_export.DesktopSession(self.app, profile, self.root / 'Vault', 123456.0)
        session.launched = True
        with mock.patch.object(desktop_export, '_identity', side_effect=FileNotFoundError), \
                mock.patch.object(desktop_export.os, 'kill') as kill:
            with self.assertRaisesRegex(ValueError, 'ownership for cleanup'):
                session.close()
            kill.assert_not_called()

    def test_missing_identity_with_live_known_pid_retains_original_settings(self):
        original = self.config_hashes()
        close = desktop_export.DesktopSession.close
        def lost_identity(app, profile, vault, deadline):
            session = self.session(app, profile, vault, deadline)
            session.pid, session.profile, session.vault = 42, profile, vault
            session.gui = self.app / 'Contents/MacOS/Obsidian'
            session.close = lambda: close(session)
            return session
        for failure in (FileNotFoundError(), subprocess.CalledProcessError(1, 'ps')):
            with self.subTest(failure=type(failure).__name__), \
                    mock.patch.object(desktop_export, '_identity', side_effect=failure), \
                    mock.patch.object(desktop_export.os, 'kill') as kill:
                with self.assertRaisesRegex(ValueError, 'PID is alive.*original settings retained'):
                    self.render(session=lost_identity)
                kill.assert_called_once_with(42, 0)
            backups = list(self.root.glob('.desktop-export-*/settings'))
            self.assertEqual(1, len(backups))
            self.assertEqual(original, self.config_hashes(backups[0]))
            self.assertEqual('', self.git('diff', '--cached', '--name-only'))
            # Restore the disposable fixture for the second failure variant.
            shutil.rmtree(self.root / 'Vault/.obsidian')
            backups[0].rename(self.root / 'Vault/.obsidian')
            shutil.rmtree(backups[0].parent)
            shutil.rmtree(self.last_profile)
            self.git('restore', '--', 'Web/content/Topic/Note.md')
            (self.root / sync_export.RECEIPT_PATH).unlink()

    def test_missing_identity_returns_only_when_known_pid_has_exited(self):
        profile = Path(self.temp.name) / 'profile'
        profile.mkdir()
        session = desktop_export.DesktopSession(self.app, profile, self.root / 'Vault', 123456.0)
        session.pid = 42
        with mock.patch.object(desktop_export, '_identity', side_effect=FileNotFoundError), \
                mock.patch.object(desktop_export.os, 'kill', side_effect=ProcessLookupError) as kill:
            session.close()
            kill.assert_called_once_with(42, 0)

    def test_native_index_waits_for_boolean_readiness_and_rejects_cli_errors(self):
        session = desktop_export.DesktopSession(self.app, Path(self.temp.name), self.root / 'Vault', time.monotonic() + 60)
        with mock.patch.object(session, 'command', side_effect=['=> false', '=> true']) as command, \
                mock.patch.object(desktop_export.time, 'sleep'):
            session.wait_native_index()
        self.assertEqual(2, command.call_count)
        with mock.patch.object(session, 'command', return_value='Error: eval is unavailable'):
            with self.assertRaisesRegex(ValueError, 'invalid response: Error: eval'):
                session.wait_native_index()

    def test_plugin_readiness_waits_for_full_capabilities_and_exact_plugin_set(self):
        profile = Path(self.temp.name) / 'profile'
        session = desktop_export.DesktopSession(self.app, profile, self.root / 'Vault', time.monotonic() + 60)
        ready = {'vaultPath': str(session.vault), 'plugins': sorted(desktop_export.PLUGINS),
                 'syncerLoaded': True, 'preserveSupported': True, 'datacoreReady': True}
        states = [{**ready, 'preserveSupported': False}, {**ready, 'datacoreReady': False},
                  {**ready, 'plugins': sorted([*desktop_export.PLUGINS, 'qard'])}, ready]
        with mock.patch.object(session, 'command', side_effect=['=> ' + json.dumps(state) for state in states]) as command, \
                mock.patch.object(desktop_export.time, 'sleep'):
            session.wait_plugins()
        self.assertEqual(4, command.call_count)

    def test_plugin_readiness_timeout_reports_bounded_capability_status(self):
        session = desktop_export.DesktopSession(self.app, Path(self.temp.name), self.root / 'Vault', 1)
        state = {'vaultPath': str(session.vault), 'plugins': [], 'syncerLoaded': False}
        with mock.patch.object(session, 'command', return_value=json.dumps(state)), \
                mock.patch.object(desktop_export.time, 'monotonic', side_effect=[0, 2, 2]):
            with self.assertRaisesRegex(ValueError, 'last status:.*"preserveSupported": false'):
                session.wait_plugins()

    def test_native_cli_uses_a_live_private_stdin_pipe(self):
        session = desktop_export.DesktopSession(self.app, Path(self.temp.name), self.root / 'Vault', time.monotonic() + 60)
        session.pid = 42
        def response(*args, **kwargs):
            # A live writer means a nonblocking read cannot report EOF.
            descriptor = kwargs['stdin']
            os.set_blocking(descriptor, False)
            with self.assertRaises(BlockingIOError):
                os.read(descriptor, 1)
            return 'fixture response'
        with mock.patch.object(desktop_export, '_identity', return_value=42), \
                mock.patch.object(desktop_export.subprocess, 'check_output', side_effect=response) as command:
            self.assertEqual('fixture response', session.command('eval', 'code=true'))
            self.assertEqual('vault=Vault', command.call_args.args[0][1])

    def test_public_plugin_trust_requires_exact_registry_and_runtime_vault(self):
        for case in ('runtime-mismatch', 'extra-vault', 'exact'):
            with self.subTest(case=case):
                profile = Path(self.temp.name) / f'profile-{case}'
                profile.mkdir()
                (profile / '.obsidian-cli.sock').touch()
                session = desktop_export.DesktopSession(self.app, profile, self.root / 'Vault', time.monotonic() + 60)
                def response(*args):
                    if 'vaultPath' in args[-1]:
                        if case == 'extra-vault':
                            registry = json.loads((profile / 'obsidian.json').read_text())
                            registry['vaults']['other'] = {'path': '/private/other-vault'}
                            (profile / 'obsidian.json').write_text(json.dumps(registry))
                            session.verify_vault()
                        path = str(session.vault) if case == 'exact' else '/private/other-vault'
                        return '=> ' + json.dumps({'vaultPath': path})
                    return '=> true' if args[0] == 'eval' else 'Restricted mode disabled'
                with mock.patch.object(desktop_export.subprocess, 'run') as launch, \
                        mock.patch.object(desktop_export, '_identity', return_value=42), \
                        mock.patch.object(session, 'command', side_effect=response) as command, \
                        mock.patch.object(session, 'wait_plugins') as readiness:
                    if case == 'exact':
                        session.start()
                        self.assertEqual(['eval', 'plugins:restrict', 'eval', 'eval', *(['plugin:enable'] * 4)], [call.args[0] for call in command.call_args_list])
                        self.assertEqual('id=quartz-syncer', command.call_args_list[-1].args[1])
                        readiness.assert_called_once_with()
                        self.assertIn('--use-mock-keychain', launch.call_args.args[0])
                        self.assertTrue(json.loads((profile / 'obsidian.json').read_text())['updateDisabled'])
                    else:
                        with self.assertRaisesRegex(ValueError, 'vault.*(outside|differs)'):
                            session.start()
                        self.assertFalse(any(call.args[0] == 'plugins:restrict' for call in command.call_args_list))
                        readiness.assert_not_called()


if __name__ == '__main__':
    unittest.main()
