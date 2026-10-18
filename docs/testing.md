# Repository testing

Keep tests that protect public behavior, data integrity, destructive-operation guards, and Obsidian/Quartz parity. Prefer a representative failure or boundary case over repeated input matrices, private implementation assertions, source-text snapshots, and exact report prose. Consolidate tests by domain; share fixtures only when the fixture removes meaningful setup duplication. New tests should explain a concrete regression they prevent.

## Credential-free checks

Run these from the repository root:

```sh
python3 -m unittest discover -s .scripts/tests -p 'test_*.py'
node --test .codex/hooks/tests/note-review-hooks.test.mjs
python3 .scripts/validate-vault.py --all
dotnet test Platform/DevBook/DevBook.Tests/DevBook.Tests.csproj
```

The Python suite protects deterministic vault tooling, card identity and migration rollback. On the dev-improvements branch it also protects automation safety. Full vault validation remains a separate required check over the actual notes; passing fixture tests does not prove the vault is valid.

`DevBook.Tests` covers ingestion sync and traversal rejection, chunk content/vector/citation integrity, embedding limits, retrieval/reranking, HTTP payloads and client errors, and deterministic evaluation ranking math. Its HTTP host registers the production endpoints and exception handler in `TestServer`; it does not run `Program` startup, contact MongoDB, load user secrets, or call model providers. The test project builds its API/Data/Evaluations references, but this host does not verify full application startup. Database/index startup and model quality require explicit manual validation.

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

## Manual evaluations

`Platform/DevBook/DevBook.Evaluations/` is the R&D evaluation application, with datasets, judge/report infrastructure, and NUnit scenarios. It remains separate from the credential-free test command. `SearchEvaluation` exercises Mongo retrieval across chunkers and rerankers; `AnswerEvaluation` generates and judges answers using live models, including an explicit verbosity probe. `AnswerAgentEvaluation` demonstrates deterministic transcript judging and report generation; `OutcomeProbe` checks report outcome labels. Preserve these experiments and follow the application's README when intentionally running them. Do not run the whole solution's tests as a substitute for `DevBook.Tests`, because discovery can include live scenarios.

## Deliberate coverage limits

The compact suite omits exhaustive evaluation diagnostics/wording permutations, duplicate strategy wiring cases, and timing-sensitive concurrency tests. Retained cases protect the underlying ranking calculations, evidence identity, batching limits and ordering. Add a focused test when an observed regression reveals a missing contract; do not restore permutations solely to increase test counts.
