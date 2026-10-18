# Repository testing

This trimming workflow covers Web, repository tooling, and vault validation. The .NET solution under `Platform/DevBook/`, including its tests and evaluation application, is outside its scope.

Keep tests that protect public behavior, data integrity, destructive-operation guards, and Obsidian/Quartz parity. Prefer a representative failure or boundary case over repeated input matrices, private implementation assertions, source-text snapshots, and exact report prose. Consolidate tests by domain; share fixtures only when the fixture removes meaningful setup duplication. New tests should explain a concrete regression they prevent.

## Credential-free checks

Run these from the repository root:

```sh
python3 -m unittest discover -s .scripts/tests -p 'test_*.py'
node --test .codex/hooks/tests/note-review-hooks.test.mjs
python3 .scripts/validate-vault.py --all
```

The Python suite protects deterministic vault tooling, card identity and migration rollback. On the dev-improvements branch it also protects automation safety. Full vault validation remains a separate required check over the actual notes; passing fixture tests does not prove the vault is valid.

## Web checks

Use Node 22 and install the existing dependencies in `Web/` before running:

```sh
cd Web
npm test
npm run steptrace:typecheck
npm run steptrace:check
npm run steptrace:visual
```

The default test runner covers deterministic first-party contracts and preserved upstream Quartz tests. Browser lifecycle tests run separately because they require a Playwright browser. The browser smoke serves its fixture through a synthetic HTTPS route without a local listening port. They exercise rendered behavior; a deterministic suite alone does not prove browser interaction or responsive layout. Upstream tests under `Web/quartz/` remain preserved and can be run explicitly when changing upstream engine behavior.

## .NET solution

The original .NET test files, fixtures, project references, and evaluation application remain unchanged. Follow the existing [Platform guide](../Platform/DevBook/README.md) for its test and evaluation commands; its integration and live evaluation scenarios can require configured external services.

## Deliberate coverage limits

The compact Web and tooling suites replace exhaustive style, historical visual-protocol, and parser permutations with representative behavior checks. Core safety, identity, and vault-validation boundaries remain covered. Add a focused test when an observed regression reveals a missing contract; do not restore permutations solely to increase test counts.
