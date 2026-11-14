using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using System.Text;
using System.Text.Json.Nodes;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class SiteArtifactTests
{
    [Fact]
    public void CompleteBundleIncludesUnchangedMediaWithoutStaging()
    {
        using var fixture = new ArtifactFixture();
        byte[] index = File.ReadAllBytes(Path.Combine(fixture.Root, ".git/index"));
        JsonObject bundle = Bundle.FromCheckout(fixture.Root, 0, "", fixture.Head);
        IReadOnlyDictionary<string, byte[]?> files = Bundle.Decode(bundle);
        files.Keys.Should().Contain("Web/content/Assets/image.png");
        files["Web/content/Assets/image.png"].Should().Equal([0, 255, 128, 10, 0, 32]);
        files["Web/content/é.md"].Should().Equal(Encoding.UTF8.GetBytes("\uFEFFé😀\r\n\"\\"));
        File.ReadAllBytes(Path.Combine(fixture.Root, ".git/index")).Should().Equal(index);
        Bundle.ValidateInputs(bundle, fixture.Entries).Should().BeTrue();
    }

    [Fact]
    public void CompleteArtifactRejectsAnOversizedNativeFile()
    {
        using var fixture = new ArtifactFixture();
        File.WriteAllBytes(Path.Combine(fixture.Root, "Web/content/Assets/image.png"), new byte[Bundle.MaxFileBytes + 1]);
        Action collect = () => Bundle.FromCheckout(fixture.Root, 0, "", fixture.Head);
        collect.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData("Web/content/../outside.md")]
    [InlineData("Web/quartz/styles/custom.scss")]
    [InlineData("/Web/content/absolute.md")]
    public void BundleRejectsUnexpectedOrUnsafePaths(string path)
    {
        using var fixture = new ArtifactFixture();
        JsonObject bundle = Bundle.FromCheckout(fixture.Root, 0, "", fixture.Head);
        bundle.Obj("files")[path] = Convert.ToBase64String("foreign"u8.ToArray());
        Action decode = () => Bundle.Decode(bundle);
        decode.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void TamperedMissingAndCaseCollidingFilesAreRejected()
    {
        using var fixture = new ArtifactFixture();
        foreach (int scenario in Enumerable.Range(0, 3))
        {
            JsonObject bundle = Bundle.FromCheckout(fixture.Root, 0, "", fixture.Head);
            JsonObject files = bundle.Obj("files");
            if (scenario == 0) files["Web/content/Card.md"] = Convert.ToBase64String("tampered"u8.ToArray());
            if (scenario == 1) files.Remove("Web/content/Card.md");
            if (scenario == 2) files["Web/content/card.md"] = files["Web/content/Card.md"]!.DeepClone();
            Action decode = () => Bundle.Decode(bundle);
            decode.Should().Throw<InvalidOperationException>();
        }
    }

    [Fact]
    public void ChangedSourceOrPolicyCannotUseExistingArtifact()
    {
        using var fixture = new ArtifactFixture();
        JsonObject bundle = Bundle.FromCheckout(fixture.Root, 0, "", fixture.Head);
        foreach (string path in new[] { "Vault/Home/Card.md", ".scripts/global.json", ".scripts/DevBook.Tooling/Infrastructure/LegacyCaseFold.json" })
        {
            GitTreeEntry[] changed = fixture.Entries.Select(item => item.Path == path ? item with { Sha = new string('f', 40) } : item).ToArray();
            Action verify = () => Bundle.ValidateInputs(bundle, changed);
            verify.Should().Throw<InvalidOperationException>();
        }
    }

    [Fact]
    public void LocalSnapshotCannotPassCommittedArtifactValidation()
    {
        using var fixture = new ArtifactFixture();
        JsonObject bundle = Bundle.FromCheckout(fixture.Root, 0, "", fixture.Head);
        bundle.Obj("manifest")["kind"] = "local";
        Action verify = () => Bundle.ValidateInputs(bundle, fixture.Entries);
        verify.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ExtractionReplacesTheCompleteOutputAndLeavesIndexUntouched()
    {
        using var fixture = new ArtifactFixture();
        JsonObject bundle = Bundle.FromCheckout(fixture.Root, 0, "", fixture.Head);
        byte[] index = File.ReadAllBytes(Path.Combine(fixture.Root, ".git/index"));
        File.WriteAllText(Path.Combine(fixture.Root, "Web/content/Stale.md"), "stale");
        SiteArtifact.Extract(fixture.Root, bundle, fixture.Head);
        File.Exists(Path.Combine(fixture.Root, "Web/content/Stale.md")).Should().BeFalse();
        File.ReadAllBytes(Path.Combine(fixture.Root, ".git/index")).Should().Equal(index);
    }

    [Fact]
    public void OutputSymlinksAreRejectedWithoutReadingTheirTarget()
    {
        if (OperatingSystem.IsWindows()) return;
        using var fixture = new ArtifactFixture();
        File.CreateSymbolicLink(Path.Combine(fixture.Root, "Web/content/Linked.md"), Path.Combine(fixture.Root, "Vault/Home/Card.md"));
        Action collect = () => SiteArtifact.OutputFiles(fixture.Root);
        collect.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public async Task NamedPipesAreRejectedBeforeReadingTheirContents()
    {
        if (!OperatingSystem.IsMacOS() && !OperatingSystem.IsLinux()) return;
        using var fixture = new ArtifactFixture();
        string pipe = Path.Combine(fixture.Root, "Web/content/pipe");
        (await new SystemProcessRunner().RunAsync(new ProcessRequest("mkfifo", [pipe], fixture.Root))).EnsureSuccess();
        Action collect = () => SiteArtifact.OutputFiles(fixture.Root);
        collect.Should().Throw<InvalidOperationException>().WithMessage("*non-regular*");
    }

    [Fact]
    public async Task FirstPublicationAddsOnlyTheMissingFieldAndPreservesAliasesAndIndex()
    {
        using var fixture = new ArtifactFixture();
        string path = "Vault/Home/New.md";
        byte[] original = Encoding.UTF8.GetBytes("---\r\npublish: true\r\ncreated: 2020-01-01T00:00:00.000Z\r\nmodified: 2026-01-01T00:00:00.000Z\r\n---\r\n> [!qard]- Identity remains.\r\n");
        File.WriteAllBytes(Path.Combine(fixture.Root, path), original);
        File.WriteAllText(Path.Combine(fixture.Root, "Vault/Home/Alias.md"), "---\npublish: true\npublishDate: 2020-01-01T00:00:00.000Z\n---\nExisting alias.\n");
        Dictionary<string, byte[]> sources = Preview.ReadSources(fixture.Root);
        DateTimeOffset instant = DateTimeOffset.Parse("2026-11-14T00:00:00Z");
        Dictionary<string, byte[]> changes = Preview.PublicationChanges(fixture.Root, sources, instant);
        byte[] index = File.ReadAllBytes(Path.Combine(fixture.Root, ".git/index"));
        await Preview.WritePublicationsAsync(fixture.Root, sources, changes, fixture.PublicationCommandAsync);
        changes.Keys.Should().Equal(path);
        string actual = File.ReadAllText(Path.Combine(fixture.Root, path));
        actual.Replace("published: \"2026-11-14T00:00:00.000Z\"\r\n", "", StringComparison.Ordinal).Should().Be(Encoding.UTF8.GetString(original));
        File.ReadAllBytes(Path.Combine(fixture.Root, ".git/index")).Should().Equal(index);
    }

    [Fact]
    public async Task ConcurrentPreviewEditsPreventPublicationWriteback()
    {
        using var fixture = new ArtifactFixture();
        string path = Path.Combine(fixture.Root, "Vault/Home/New.md");
        File.WriteAllText(path, "---\npublish: true\n---\nOriginal\n");
        Dictionary<string, byte[]> source = Preview.ReadSources(fixture.Root);
        Dictionary<string, byte[]> changes = Preview.PublicationChanges(fixture.Root, source, DateTimeOffset.UtcNow);
        File.AppendAllText(path, "Concurrent editor text\n");
        Func<Task> write = () => Preview.WritePublicationsAsync(fixture.Root, source, changes, fixture.PublicationCommandAsync);
        await write.Should().ThrowAsync<InvalidOperationException>();
        File.ReadAllText(path).Should().Contain("Concurrent editor text").And.NotContain("published:");
    }

    [Fact]
    public async Task EditBetweenSnapshotCheckAndAtomicCallbackIsPreserved()
    {
        using var fixture = new ArtifactFixture { EditInsideProcess = true };
        string path = Path.Combine(fixture.Root, "Vault/Home/New.md");
        File.WriteAllText(path, "---\npublish: true\n---\nOriginal\n");
        Dictionary<string, byte[]> source = Preview.ReadSources(fixture.Root);
        Dictionary<string, byte[]> changes = Preview.PublicationChanges(fixture.Root, source, DateTimeOffset.UtcNow);
        Func<Task> write = () => Preview.WritePublicationsAsync(fixture.Root, source, changes, fixture.PublicationCommandAsync);
        await write.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Source changed*");
        File.ReadAllText(path).Should().Contain("Concurrent callback edit").And.NotContain("published:");
    }

    [Fact]
    public void DisposableSettingsStartWithSharedPolicyAndNoPersonalData()
    {
        using var fixture = new ArtifactFixture();
        File.WriteAllText(Path.Combine(fixture.Root, ".scripts/quartz-syncer.defaults.json"), "{\"autoPublishInterval\":0,\"obsidianCommentMode\":\"preserve\"}");
        string original = Path.Combine(fixture.Root, "Vault/.obsidian");
        string destination = Path.Combine(fixture.Root, "disposable-settings");
        Desktop.PrepareSettings(original, destination, fixture.Root);
        JsonObject settings = JsonData.ParseObject(File.ReadAllText(Path.Combine(destination, "plugins/quartz-syncer/data.json")));
        settings.Int("autoPublishInterval", -1).Should().Be(0);
        settings.Str("obsidianCommentMode").Should().Be("preserve");
        settings.Str("publishTarget").Should().Be("local");
        settings.Str("quartzRepoPath").Should().Be(Path.Combine(fixture.Root, "Web"));
        File.Exists(Path.Combine(original, "plugins/quartz-syncer/data.json")).Should().BeFalse();
        File.ReadAllText(Path.Combine(destination, "community-plugins.json")).Should().Be("[]");
    }

    [Fact]
    public async Task SnapshotBuildAndServerDoNotHoldTheSourceCommitLock()
    {
        using var fixture = new ArtifactFixture();
        var buildEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finishBuild = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var serverEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finishServer = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var source = new SyncerContext(fixture.Root);
        var runner = new PreviewRunner(async request =>
        {
            if (request.Arguments.Contains("build"))
            {
                buildEntered.SetResult();
                await finishBuild.Task;
            }
            if (request.Arguments.Contains("serve"))
            {
                serverEntered.SetResult();
                await finishServer.Task;
            }
            return new ProcessResult(0, [], []);
        });
        Task preview = Preview.RunAsync(fixture.Root, "unused-test-app", runner: runner, renderSnapshot: (_, _, _) =>
        {
            Action competingPreparation = () => Syncer.AcquireLock(source).Dispose();
            competingPreparation.Should().Throw<SyncException>();
            return Task.CompletedTask;
        });
        try
        {
            await buildEntered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            using (Syncer.AcquireLock(source)) { }
            finishBuild.SetResult();
            await serverEntered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            using (Syncer.AcquireLock(source)) { }
        }
        finally
        {
            finishBuild.TrySetResult();
            finishServer.TrySetResult();
            await preview.WaitAsync(TimeSpan.FromSeconds(10));
        }
    }

    [Fact]
    public async Task CancelledPreviewKillsTheChildAndRemovesItsExternalQuartzInput()
    {
        using var fixture = new ArtifactFixture();
        using var cancelled = new CancellationTokenSource();
        var runner = new CancelledQuartzRunner(cancelled);

        await Preview.RunAsync(fixture.Root, "unused-test-app", cancellationToken: cancelled.Token,
            runner: runner, renderSnapshot: (_, _, _) => Task.CompletedTask);

        runner.TemporaryRoot.Should().NotBeNull();
        Directory.Exists(runner.TemporaryRoot).Should().BeFalse();
        runner.ChildCancelled.Should().BeTrue();
        using (Syncer.AcquireLock(new SyncerContext(fixture.Root))) { }
    }

    private sealed class CancelledQuartzRunner(CancellationTokenSource cancelled) : IProcessRunner
    {
        public string? TemporaryRoot { get; private set; }
        public bool ChildCancelled { get; private set; }

        public async Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken = default)
        {
            if (!request.Arguments.Contains("serve")) return new ProcessResult(0, [], []);
            TemporaryRoot = request.Environment!["DEVBOOK_QUARTZ_TEMP_ROOT"];
            Directory.CreateDirectory(Path.Combine(TemporaryRoot, "devbook-quartz-content-test"));
            cancelled.CancelAfter(TimeSpan.FromMilliseconds(300));
            try
            {
                return await new SystemProcessRunner().RunAsync(request with
                {
                    FileName = "node", Arguments = ["-e", "setInterval(() => {}, 1000)"], Timeout = TimeSpan.FromSeconds(10)
                }, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                ChildCancelled = true;
                throw;
            }
        }
    }

    private sealed class PreviewRunner(Func<ProcessRequest, Task<ProcessResult>> run) : IProcessRunner
    {
        public Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken = default) => run(request);
    }

    [Fact]
    public async Task PublicExportRendersAnOwnedCloneWithoutBorrowingLiveSettings()
    {
        using var fixture = new ArtifactFixture();
        File.AppendAllText(Path.Combine(fixture.Root, ".git/info/exclude"),
            "\n/Web/content/\n/Web/quartz/styles/syncer/\n/.devbook-improvement/syncer-export.json\n/Vault/.obsidian/plugins/quartz-syncer/data.json\n");
        string liveSettings = Path.Combine(fixture.Root, "Vault/.obsidian/plugins/quartz-syncer/data.json");
        File.WriteAllText(liveSettings, "Personal settings before export.\n");
        byte[] index = File.ReadAllBytes(Path.Combine(fixture.Root, ".git/index"));
        byte[] projection = File.ReadAllBytes(Path.Combine(fixture.Root, "Web/content/Card.md"));
        string output = fixture.Root + "-artifact";
        string? renderedCheckout = null;
        try
        {
            int result = await SiteCommand.RunAsync(["export", "--repo-root", fixture.Root, "--expected-head", fixture.Head,
                "--app-bundle", "unused-test-app", "--output", output], (checkout, head, _) =>
            {
                renderedCheckout = checkout;
                Desktop.RealPath(checkout).Should().NotBe(Desktop.RealPath(fixture.Root));
                Git.Text(checkout, "rev-parse", "HEAD").Should().Be(fixture.Head);
                File.Exists(Path.Combine(checkout, "Vault/.obsidian/plugins/quartz-syncer/data.json")).Should().BeFalse();
                File.WriteAllText(liveSettings, "Concurrent owner settings.\n");
                Write(checkout, "Vault/.obsidian/plugins/quartz-syncer/data.json", "Disposable settings.\n");
                Write(checkout, "Web/content/Card.md", "Isolated rendered projection.\n");
                Write(checkout, "Web/quartz/styles/syncer/_index.scss", "Generated styles.\n");
                JsonObject runtime = new() { ["obsidian"] = "1.14.5", ["plugins"] = new JsonObject(Receipt.Plugins.Select(name =>
                    new KeyValuePair<string, JsonNode?>(name, JsonValue.Create("1.0.0")))) };
                Write(checkout, Receipt.PathName, SiteArtifact.CreateManifest(checkout, head, runtime).ToJsonString());
                return Task.CompletedTask;
            });

            result.Should().Be(0);
            renderedCheckout.Should().NotBeNull();
            Directory.Exists(renderedCheckout).Should().BeFalse();
            File.ReadAllText(liveSettings).Should().Be("Concurrent owner settings.\n");
            File.ReadAllBytes(Path.Combine(fixture.Root, ".git/index")).Should().Equal(index);
            File.ReadAllBytes(Path.Combine(fixture.Root, "Web/content/Card.md")).Should().Equal(projection);
            JsonObject bundle = JsonData.ParseObject(File.ReadAllText(Path.Combine(output, "bundle.json")));
            Bundle.ValidateInputs(bundle, fixture.Entries).Should().BeTrue();
        }
        finally
        {
            if (Directory.Exists(output)) Directory.Delete(output, true);
        }

        static void Write(string root, string relative, string text)
        {
            string target = Path.Combine(root, relative);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.WriteAllText(target, text);
        }
    }

    [Fact]
    public void ReadOnlyGitChecksPreserveIndexBytesAfterBackdatingAndSettingsSwap()
    {
        using var fixture = new ArtifactFixture();
        string index = Path.Combine(fixture.Root, ".git/index");
        byte[] originalIndex = File.ReadAllBytes(index);
        foreach (string relative in Git.Paths(fixture.Root, "ls-files", "-z"))
            File.SetLastWriteTimeUtc(Path.Combine(fixture.Root, relative), DateTime.UtcNow.AddDays(-30));
        string settings = Path.Combine(fixture.Root, "Vault/.obsidian");
        string backup = Path.Combine(fixture.Root, "original-settings");
        Directory.Move(settings, backup);
        Directory.CreateDirectory(settings);
        File.WriteAllText(Path.Combine(settings, "runtime.json"), "{}");
        Directory.Delete(settings, true);
        Directory.Move(backup, settings);

        var context = new SyncerContext(fixture.Root);
        _ = context.GitText("status", "--porcelain", "--untracked-files=all");
        _ = Git.Text(fixture.Root, "status", "--porcelain", "--untracked-files=all");
        Syncer.GuardSource(context);
        NoteDates.RequirePublications(fixture.Root);
        Git.Text(fixture.Root, "diff", "--name-only", "--", "Vault/.obsidian").Should().BeEmpty();

        File.ReadAllBytes(index).Should().Equal(originalIndex);
    }

    [Fact]
    public void DisablingOptionalLocksDoesNotPreventExplicitPrivateIndexWrites()
    {
        using var fixture = new ArtifactFixture();
        string index = Path.Combine(fixture.Root, ".git/index");
        byte[] originalIndex = File.ReadAllBytes(index);
        string privateIndex = Path.Combine(fixture.Root, "private-index");
        File.Copy(index, privateIndex);
        File.AppendAllText(Path.Combine(fixture.Root, "Vault/Home/Card.md"), "Private snapshot update.\n");
        var context = new SyncerContext(fixture.Root, gitEnvironment: new Dictionary<string, string>
        {
            ["PATH"] = Environment.GetEnvironmentVariable("PATH") ?? "/usr/bin:/bin",
            ["GIT_INDEX_FILE"] = privateIndex
        });

        context.GitBytes("add", "--", "Vault/Home/Card.md");

        context.GitText("diff", "--cached", "--name-only").Should().Be("Vault/Home/Card.md");
        File.ReadAllBytes(index).Should().Equal(originalIndex);
        File.ReadAllBytes(privateIndex).Should().NotEqual(originalIndex);
    }

    [Fact]
    public async Task MalformedNativeJsonReportsSafeProbeFingerprintWithoutResponseContent()
    {
        using var fixture = new ArtifactFixture();
        const string privateText = "PRIVATE_NOTE_SHOULD_NOT_APPEAR";
        string payload = "{\"content\":\"" + privateText + "\"";
        var context = new SyncerContext(fixture.Root, (_, _) => Task.FromResult("=> " + payload));
        Func<Task> probe = () => Syncer.CliAsync(context, ["eval", "code=private-script"], probeLabel: "compiled-media-cleanup");

        SyncException error = (await probe.Should().ThrowAsync<SyncException>()).Which;

        error.Message.Should().Contain("compiled-media-cleanup: malformed JSON")
            .And.Contain("bytes=" + Encoding.UTF8.GetByteCount(payload))
            .And.Contain("sha256=" + SiteArtifact.Digest(Encoding.UTF8.GetBytes(payload)))
            .And.Contain("type=Json").And.Contain("line=0").And.Contain("byte=")
            .And.NotContain(privateText).And.NotContain("private-script");
        error.InnerException.Should().BeNull();
    }

    [Fact]
    public void CompletePublishedSiteFitsAggregateBoundWhileLargerPayloadStillFails()
    {
        const int publishedSiteBytes = 97_953_161;
        byte[] largestPublishedFile = new byte[7_234_404];
        var files = new Dictionary<string, byte[]>
        {
            ["Web/content/Card.md"] = [],
            ["Web/quartz/styles/syncer/_index.scss"] = []
        };
        for (var index = 0; index < 13; index++) files[$"Web/content/Assets/{index}.png"] = largestPublishedFile;
        files["Web/content/Assets/remainder.png"] = new byte[publishedSiteBytes - 13 * largestPublishedFile.Length];

        Action acceptExistingSite = () => SiteArtifact.ValidateFiles(files);

        files.Values.Sum(bytes => bytes.Length).Should().Be(publishedSiteBytes);
        acceptExistingSite.Should().NotThrow();
        for (var index = 13; index < 19; index++) files[$"Web/content/Assets/{index}.png"] = largestPublishedFile;
        Action rejectOverflow = () => SiteArtifact.ValidateFiles(files);
        rejectOverflow.Should().Throw<InvalidOperationException>().WithMessage("*total size bound*total_bytes_limit=134217728*");
    }

    private sealed class ArtifactFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "devbook-artifact-" + Guid.NewGuid().ToString("N"));
        public string Head { get; }
        public GitTreeEntry[] Entries { get; }

        public ArtifactFixture()
        {
            Directory.CreateDirectory(Root);
            Git.Run(Root, "init", "-q");
            foreach (string path in Receipt.RequiredPolicyPaths) Write(path, path.EndsWith("manifest.json", StringComparison.Ordinal) ? "{\"version\":\"1.0.0\"}" : path.EndsWith(".json", StringComparison.Ordinal) ? "{}" : "policy");
            Write(".scripts/DevBook.Tooling/Infrastructure/LegacyCaseFold.json", "{}");
            Write("Vault/Home/Card.md", "---\npublish: true\npublished: 2020-01-01T00:00:00.000Z\n---\nSource\n");
            Git.Run(Root, "add", ".");
            Git.Run(Root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "core.hooksPath=/dev/null", "commit", "-qm", "fixture");
            Head = Git.Text(Root, "rev-parse", "HEAD");
            Entries = Receipt.TreeEntries(Root);
            Write("Web/content/Card.md", "Rendered\n");
            Write("Web/content/Assets/image.png", "");
            File.WriteAllBytes(Path.Combine(Root, "Web/content/Assets/image.png"), [0, 255, 128, 10, 0, 32]);
            Write("Web/content/é.md", "\uFEFFé😀\r\n\"\\");
            Write("Web/quartz/styles/syncer/_index.scss", "styles");
            JsonObject runtime = new() { ["obsidian"] = "1.14.5", ["plugins"] = new JsonObject(Receipt.Plugins.Select(name => new KeyValuePair<string, JsonNode?>(name, JsonValue.Create("1.0.0")))) };
            JsonObject manifest = SiteArtifact.CreateManifest(Root, Head, runtime);
            Write(Receipt.PathName, manifest.ToJsonString());
        }

        public bool EditInsideProcess { get; set; }

        public async Task<string> PublicationCommandAsync(IReadOnlyList<string> arguments, CancellationToken cancellationToken)
        {
            const string harness = """
                const fs=require('node:fs');
                const root=process.argv[1],code=process.argv[2],concurrent=process.argv[3]==='true';
                const app={vault:{adapter:{getBasePath:()=>root},getFileByPath:path=>({path}),
                 process:async(file,fn)=>{
                  const target=root+'/'+file.path;
                  if(concurrent)fs.appendFileSync(target,'Concurrent callback edit\n');
                  const updated=fn(fs.readFileSync(target,'utf8'));
                  fs.writeFileSync(target,updated);return updated;
                 },read:async file=>fs.readFileSync(root+'/'+file.path,'utf8')}};
                Promise.resolve(eval(code)).then(value=>process.stdout.write(value));
                """;
            string script = arguments[1]["code=".Length..];
            script.Should().Contain("app.vault.process(file,current=>").And.NotContain("Identity remains");
            ProcessResult result = await new SystemProcessRunner().RunAsync(new ProcessRequest("node",
                ["-e", harness, Path.Combine(Desktop.RealPath(Root), "Vault"), script, EditInsideProcess ? "true" : "false"], Root), cancellationToken);
            result.EnsureSuccess("Exercise atomic publication callback");
            return result.Stdout;
        }

        private void Write(string path, string text)
        {
            string target = Path.Combine(Root, path);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.WriteAllText(target, text, new UTF8Encoding(false));
        }

        public void Dispose() => Directory.Delete(Root, true);
    }
}
