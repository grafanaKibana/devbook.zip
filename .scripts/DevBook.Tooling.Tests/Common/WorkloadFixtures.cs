using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Tests;

internal sealed class WorkloadFixture : IDisposable
{
    public string Root { get; } = Path.Combine(Path.GetTempPath(), "focused-workload-" + Guid.NewGuid().ToString("N"));
    public JsonArray Notes { get; } = new();
    public MemoryStateStore Store { get; } = new(Core.NewState());
    public WorkloadClock Clock { get; } = new();
    public WorkloadModel Model { get; } = new();
    public JsonObject Config { get; } = new() { ["max_pr_notes"] = 5, ["max_model_calls_per_run"] = 20 };

    public WorkloadFixture(int count, bool otherTopic = false)
    {
        DomainFixtures.CreateReviewContract(Root);
        for (var index = 0; index < count; index++)
        {
            string path = $"Vault/Home/Programming/NET/Note{index:00}.md";
            Notes.Add(DomainFixtures.NoteRecord(path, DomainFixtures.Note.Replace("stable_1", "stable_" + LegacyIdentity.Digest(path)[..8]).Replace("status: Creation", "created: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\nstatus: Creation")));
        }
        if (otherTopic) Notes.Add(DomainFixtures.NoteRecord("Vault/Home/ZZNetworks/Other.md"));
    }

    public ImprovementEngine Engine() => new(Root, Config, Store, Model, notesLoader: () => Notes.Copy(),
        clock: Clock, snapshotShaLoader: () => "base", validator: (_, _, _) => Task.FromResult(new JsonArray()));

    public static void AddSources(JsonObject edit, int count, string prefix)
    {
        string[] urls = Enumerable.Range(0, count).Select(index => $"https://example.com/{prefix}/{index}").ToArray();
        edit["sources"] = new JsonArray(urls.Select(url => (JsonNode)new JsonObject
        {
            ["url"] = url,
            ["claim"] = "The mechanism has the corrected boundary.",
            ["version"] = "not version-specific"
        }).ToArray());
        edit["after"] = edit.Str("after").TrimEnd() + " " + string.Join(" ", urls.Select(url => $"[Primary source]({url})")) + "\n";
    }

    public void Dispose() => Directory.Delete(Root, recursive: true);
}

internal sealed class WorkloadModel : IModelProvider
{
    public List<JsonObject> Authors { get; } = [];
    public List<JsonObject> Reviews { get; } = [];
    public Func<int, bool> Change { get; set; } = _ => false;
    public Func<int, CancellationToken, Task>? BeforeAuthor { get; set; }
    public Func<int, CancellationToken, Task>? BeforeReview { get; set; }
    public bool MultipleEdits { get; set; }
    public Func<int, string>? ChangedCard { get; set; }
    public Action<JsonObject>? ConfigureEdit { get; set; }

    public async Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
    {
        Authors.Add(payload.Copy());
        if (BeforeAuthor is not null) await BeforeAuthor(Authors.Count, cancellationToken);
        bool change = Change(Authors.Count);
        var edits = new JsonArray();
        var dispositions = new JsonArray();
        foreach ((string path, JsonNode? _) in payload.RequiredObject("notes"))
        {
            if (change)
            {
                JsonObject edit = DomainFixtures.Edit();
                if (ChangedCard is not null) edit["after"] = ChangedCard(Authors.Count);
                edit["path"] = path;
                edit["before"] = edit.Str("before").Replace("stable_1", "stable_" + LegacyIdentity.Digest(path)[..8]);
                edit["after"] = edit.Str("after").Replace("stable_1", "stable_" + LegacyIdentity.Digest(path)[..8]);
                edit["expected_hash"] = payload.RequiredObject("note_hashes").Str(path);
                edit["feedback_keys"] = new JsonArray(payload.Arr("feedback").OfType<JsonObject>().Where(item => item.Arr("paths").Count == 0 || item.Arr("paths").Strings().Contains(path)).Select(item => (JsonNode)JsonValue.Create(item.Str("key"))!).ToArray());
                ConfigureEdit?.Invoke(edit);
                edits.Add(edit);
                if (MultipleEdits)
                {
                    JsonObject second = edit.Copy();
                    second["before"] = "The operating idea has a concrete boundary.";
                    second["after"] = "The operating idea states its concrete mechanism and boundary.";
                    second["kind"] = "note";
                    edits.Add(second);
                }
            }
            dispositions.Add(new JsonObject { ["path"] = path, ["outcome"] = change ? "changed" : "keep", ["reason"] = change ? "Restore the mechanism." : "The complete note remains useful." });
        }
        return new JsonObject
        {
            ["version"] = 1,
            ["edits"] = edits,
            ["dispositions"] = dispositions,
            ["feedback"] = new JsonArray(payload.Arr("feedback").OfType<JsonObject>().Select(item => (JsonNode)new JsonObject
            {
                ["key"] = item.Str("key"),
                ["outcome"] = change ? "implemented" : "keep",
                ["reason"] = "The complete scoped note was independently reviewed."
            }).ToArray())
        };
    }

    public async Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
    {
        Reviews.Add(payload.Copy());
        if (BeforeReview is not null) await BeforeReview(Reviews.Count, cancellationToken);
        JsonObject review = DomainFixtures.UnchangedReview(payload);
        if (payload.Obj("proposal").Arr("edits").Count != 0)
            foreach (JsonObject note in review.Arr("notes").OfType<JsonObject>()) note["target_resolution"] = "RESOLVED";
        foreach (JsonObject note in review.Arr("notes").OfType<JsonObject>())
            note["source_checks"] = new JsonArray(payload.Obj("proposal").Arr("edits").OfType<JsonObject>().Where(edit => edit.Str("path") == note.Str("path"))
                .SelectMany(edit => edit.Arr("sources").OfType<JsonObject>()).Select(source => (JsonNode)new JsonObject
                { ["url"] = source.Str("url"), ["claim"] = source.Str("claim"), ["result"] = "SUPPORTED", ["reason"] = "Fixture evidence supports the corrected boundary." }).ToArray());
        return review;
    }
}

internal sealed class WorkloadClock : TimeProvider
{
    private readonly DateTimeOffset origin = DateTimeOffset.Parse("2026-11-02T12:00:00Z");
    private readonly List<ClockTimer> timers = [];
    private long ticks;
    public override long TimestampFrequency => TimeSpan.TicksPerSecond;
    public override DateTimeOffset GetUtcNow() => origin.AddTicks(ticks);
    public override long GetTimestamp() => ticks;
    public List<TimeSpan> DueTimes { get; } = [];

    public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
    {
        DueTimes.Add(dueTime);
        var timer = new ClockTimer(this, callback, state);
        timers.Add(timer);
        timer.Change(dueTime, period);
        return timer;
    }

    public void Advance(TimeSpan amount)
    {
        ticks += amount.Ticks;
        foreach (ClockTimer timer in timers.ToArray()) timer.Fire(ticks);
    }

    private sealed class ClockTimer(WorkloadClock clock, TimerCallback callback, object? state) : ITimer
    {
        private long deadline = long.MaxValue;
        private TimeSpan period;
        private bool disposed;
        public bool Change(TimeSpan dueTime, TimeSpan interval)
        {
            if (disposed) return false;
            deadline = dueTime == Timeout.InfiniteTimeSpan ? long.MaxValue : clock.ticks + dueTime.Ticks;
            period = interval;
            return true;
        }
        public void Fire(long now)
        {
            if (disposed || now < deadline) return;
            deadline = period == Timeout.InfiniteTimeSpan ? long.MaxValue : now + period.Ticks;
            callback(state);
        }
        public void Dispose() => disposed = true;
        public ValueTask DisposeAsync() { Dispose(); return ValueTask.CompletedTask; }
    }
}

internal sealed class SimulatedProcessLoss : Exception
{
}
