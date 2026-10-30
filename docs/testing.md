# Repository testing

This trimming workflow covers Web, repository tooling, and vault validation. The .NET solution under `Platform/DevBook/`, including its tests and evaluation application, is outside its scope.

Keep tests that protect public behavior, data integrity, destructive-operation guards, and Obsidian/Quartz parity. Prefer a representative failure or boundary case over repeated input matrices, private implementation assertions, source-text snapshots, and exact report prose. Consolidate tests by domain; share fixtures only when the fixture removes meaningful setup duplication. New tests should explain a concrete regression they prevent.

## Credential-free checks

Run native tooling inside `.scripts` so its exact SDK pin applies:

```sh
(
  cd .scripts
  test "$(dotnet --version)" = 10.0.100
  dotnet build DevBook.Tooling.slnx --configuration Release
  dotnet test DevBook.Tooling.slnx --configuration Release
  dotnet run --no-cache --file ValidateVault.cs -- --all --repo-root ..
  dotnet run --project DevBook.Tooling -- improvement --repo-root .. --demo --output-dir /tmp/devbook-demo
)
node --test .codex/hooks/tests/note-review-hooks.test.mjs
python3 -m unittest discover -s .scripts/tests -p 'test_changelog.py'
```

The compact native suite lives in `.scripts/DevBook.Tooling.Tests`, beside the executable project in `DevBook.Tooling.slnx`. Tests use xUnit and FluentAssertions with explicit Arrange/Act/Assert groups. They protect core queue/lifecycle/feedback/quota behavior, durable identities, destructive-operation guards, dates and generated-output bindings. Avoid porting the old exhaustive edge-case matrix. The one retained Python test belongs to the unrelated changelog generator.

Full-vault validation remains a separate deterministic check over the actual notes; passing fixture tests does not prove the vault is valid. The credential-free engine demo writes a proposed diff, separate question-change report and cumulative summary. Genuine desktop export is a separate fixture in the same improvement workflow (`mode=fixture`); native hosted success must be verified on the exact pushed revision before activation.

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
