using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static partial class Runtime
{
    public static FileStream LocalLock(string path)
    {
        if ((!OperatingSystem.IsMacOS() && !OperatingSystem.IsLinux())
            || Environment.GetEnvironmentVariable("DOTNET_SYSTEM_IO_DISABLEFILELOCKING") is "1" or "true"
            || (AppContext.TryGetSwitch("System.IO.DisableFileLocking", out bool disabled) && disabled))
        {
            throw new ProductionGate("Native local locking requires enabled Unix file locks.");
        }
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        try
        {
            return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        }
        catch (IOException)
        {
            throw new Conflict("Local worker lock is already held or unavailable.");
        }
    }

    public static void ValidateRelativeNotePath(string relative)
    {
        if (!relative.StartsWith("Vault/Home/", StringComparison.Ordinal) || !relative.EndsWith(".md", StringComparison.Ordinal)
            || relative.Contains('\\') || relative.Any(char.IsControl) || relative.Split('/').Any(part => part is ".." or "." or ""))
        {
            throw new UnsafeInput("Proposal path is outside authorable notes.");
        }
    }

    public static string ValidateNotePath(string root, string relative)
    {
        ValidateRelativeNotePath(relative);
        string fullRoot = Path.GetFullPath(root);
        string target = Path.GetFullPath(Path.Combine(fullRoot, relative));
        if (!target.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new UnsafeInput("Resolved path escaped the repository.");
        }
        string cursor = fullRoot;
        foreach (string part in relative.Split('/'))
        {
            cursor = Path.Combine(cursor, part);
            FileSystemInfo info = Directory.Exists(cursor) ? new DirectoryInfo(cursor) : new FileInfo(cursor);
            if (info.LinkTarget is not null)
            {
                throw new UnsafeInput("Symlink note path rejected.");
            }
        }
        return target;
    }

    public static void ApplyGuardedSources(string root, IReadOnlyDictionary<string, string> expected, IReadOnlyDictionary<string, string> candidate)
    {
        if (candidate.Keys.Any(path => !expected.ContainsKey(path)))
        {
            throw new UnsafeInput("Candidate contains an uninspected path.");
        }
        foreach (KeyValuePair<string, string> item in expected)
        {
            string target = ValidateNotePath(root, item.Key);
            if (!File.Exists(target) || File.ReadAllText(target) != item.Value)
            {
                throw new Conflict("Whole-note CAS conflict: " + item.Key);
            }
        }
        foreach (KeyValuePair<string, string> item in candidate)
        {
            string target = ValidateNotePath(root, item.Key);
            using var stream = new FileStream(target, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
            using var reader = new StreamReader(stream, new UTF8Encoding(false, true), leaveOpen: true);
            if (reader.ReadToEnd() != expected[item.Key])
            {
                throw new Conflict("Whole-note CAS conflict: " + item.Key);
            }
            byte[] content = Encoding.UTF8.GetBytes(item.Value);
            stream.Position = 0;
            stream.Write(content);
            stream.SetLength(content.Length);
            stream.Flush(flushToDisk: true);
        }
    }

    public static async Task<Uri> ValidateSourceUrlAsync(string url, IEnumerable<string> allowedHosts, CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out Uri? uri) || uri.Scheme != "https" || uri.UserInfo.Length != 0
            || uri.Port != 443 || uri.Host.Length == 0 || !allowedHosts.Contains(uri.IdnHost, StringComparer.OrdinalIgnoreCase))
        {
            throw new UnsafeInput("Source must use an explicitly allowed public HTTPS host.");
        }
        try
        {
            IPAddress[] addresses = await Dns.GetHostAddressesAsync(uri.IdnHost, cancellationToken);
            if (addresses.Length == 0 || addresses.Any(address => !IsPublicAddress(address)))
            {
                throw new UnsafeInput("Source resolved to a non-public address.");
            }
        }
        catch (SocketException)
        {
            throw new RuntimeFailure("Source hostname did not resolve.");
        }
        return uri;
    }

    public static async Task<byte[]> FetchPrimarySourceAsync(string url, IEnumerable<string> allowedHosts, int maxBytes = 1_000_000, CancellationToken cancellationToken = default)
    {
        string[] hosts = allowedHosts.ToArray();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        using var handler = new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            UseProxy = false,
            ConnectCallback = async (context, token) =>
            {
                IPAddress[] addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, token);
                if (addresses.Length == 0 || addresses.Any(address => !IsPublicAddress(address)))
                {
                    throw new UnsafeInput("Source connection resolved to a non-public address.");
                }
                var socket = new Socket(SocketType.Stream, ProtocolType.Tcp);
                try
                {
                    await socket.ConnectAsync(addresses, context.DnsEndPoint.Port, token);
                    return new NetworkStream(socket, ownsSocket: true);
                }
                catch
                {
                    socket.Dispose();
                    throw;
                }
            }
        };
        using var client = new HttpClient(handler);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("DevBookImprovement/1");
        Uri target = await ValidateSourceUrlAsync(url, hosts, timeout.Token);
        try
        {
            for (var redirects = 0; redirects <= 5; redirects++)
            {
                using HttpResponseMessage response = await client.GetAsync(target, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
                if ((int)response.StatusCode is >= 300 and <= 399)
                {
                    if (redirects == 5 || response.Headers.Location is null)
                    {
                        throw new UnsafeInput("Source redirect limit exceeded or location missing.");
                    }
                    target = await ValidateSourceUrlAsync(new Uri(target, response.Headers.Location).AbsoluteUri, hosts, timeout.Token);
                    continue;
                }
                response.EnsureSuccessStatusCode();
                string? mediaType = response.Content.Headers.ContentType?.MediaType;
                if (mediaType is not ("text/html" or "text/plain"))
                {
                    throw new UnsafeInput("Source must provide bounded textual evidence; PDF extraction is unavailable.");
                }
                await using Stream content = await response.Content.ReadAsStreamAsync(timeout.Token);
                using var data = new MemoryStream();
                byte[] buffer = new byte[16_384];
                while (true)
                {
                    int read = await content.ReadAsync(buffer, timeout.Token);
                    if (read == 0)
                    {
                        return data.ToArray();
                    }
                    if (data.Length + read > maxBytes)
                    {
                        throw new UnsafeInput("Source exceeds the size limit.");
                    }
                    data.Write(buffer, 0, read);
                }
            }
        }
        catch (HttpRequestException)
        {
            throw new RuntimeFailure("Source retrieval failed.");
        }
        throw new RuntimeFailure("Source retrieval did not complete.");
    }

    private static bool IsPublicAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }
        byte[] bytes = address.GetAddressBytes();
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            return !(bytes[0] is 0 or 10 or 127 || bytes[0] >= 224
                || (bytes[0] == 100 && bytes[1] is >= 64 and <= 127)
                || (bytes[0] == 169 && bytes[1] == 254)
                || (bytes[0] == 172 && bytes[1] is >= 16 and <= 31)
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 192 && bytes[1] == 0 && bytes[2] is 0 or 2)
                || (bytes[0] == 192 && bytes[1] == 88 && bytes[2] == 99)
                || (bytes[0] == 198 && bytes[1] is 18 or 19)
                || (bytes[0] == 198 && bytes[1] == 51 && bytes[2] == 100)
                || (bytes[0] == 203 && bytes[1] == 0 && bytes[2] == 113));
        }
        return address.AddressFamily == AddressFamily.InterNetworkV6 && (bytes[0] & 0xe0) == 0x20
            && !(bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] <= 1)
            && !(bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0d && bytes[3] == 0xb8)
            && !(bytes[0] == 0x20 && bytes[1] == 0x02)
            && !(bytes[0] == 0x3f && bytes[1] == 0xff && (bytes[2] & 0xf0) == 0);
    }

    public static async Task<JsonArray> RunValidationsAsync(string root, JsonArray commands, CancellationToken cancellationToken = default)
    {
        var results = new JsonArray();
        var sdkVerified = false;
        foreach (JsonNode? node in commands)
        {
            string[] command = node is JsonArray values ? values.Strings().ToArray() : throw new UnsafeInput("Validator commands must be argv arrays.");
            if (command.Length == 0 || command.Any(string.IsNullOrEmpty))
            {
                throw new UnsafeInput("Validator commands must be nonempty argv arrays.");
            }
            bool nativeTool = Path.GetFileName(command[0]) == "dotnet";
            string workingDirectory = nativeTool ? Path.Combine(root, ".scripts") : root;
            var runner = new SystemProcessRunner();
            if (nativeTool && !sdkVerified)
            {
                JsonObject pin = JsonData.ParseObject(await File.ReadAllTextAsync(Path.Combine(workingDirectory, "global.json"), cancellationToken));
                string expected = pin.Obj("sdk").Str("version");
                ProcessResult sdk = await runner.RunAsync(new ProcessRequest(command[0], ["--version"], workingDirectory,
                    SafeEnvironment(), Timeout: TimeSpan.FromSeconds(30), ClearEnvironment: true), cancellationToken);
                if (sdk.ExitCode != 0 || expected.Length == 0 || sdk.Stdout.Trim() != expected)
                {
                    throw new ProductionGate("Validation requires the exact SDK selected by .scripts/global.json.");
                }
                sdkVerified = true;
            }
            ProcessResult completed = await runner.RunAsync(new ProcessRequest(command[0], command[1..], workingDirectory, SafeEnvironment(), Timeout: TimeSpan.FromMinutes(5), ClearEnvironment: true), cancellationToken);
            results.Add(new JsonObject { ["check"] = string.Join(' ', command), ["result"] = completed.ExitCode == 0 ? "passed" : "failed" });
            if (completed.ExitCode != 0)
            {
                throw new RuntimeFailure("Validation failed: " + string.Join(' ', command));
            }
        }
        return results;
    }
}

public sealed class IsolatedRepository : IDisposable
{
    private readonly string directory;

    public IsolatedRepository(string source, string snapshotSha)
    {
        directory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "devbook-improvement-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        Path = System.IO.Path.Combine(directory, "repo");
        try
        {
            Git.Run(source, "clone", "--no-hardlinks", "--quiet", System.IO.Path.GetFullPath(source), Path);
            Git.Run(Path, "checkout", "--quiet", "--detach", snapshotSha);
            if (Git.Run(Path, "status", "--porcelain").Length != 0)
            {
                throw new RuntimeFailure("Isolated repository is unexpectedly dirty.");
            }
            foreach (string relative in new[] { "Web/node_modules", "Web/.quartz" })
            {
                string installed = System.IO.Path.Combine(source, relative);
                string linked = System.IO.Path.Combine(Path, relative);
                if (Directory.Exists(installed) && !Directory.Exists(linked))
                {
                    Directory.CreateDirectory(System.IO.Path.GetDirectoryName(linked)!);
                    Directory.CreateSymbolicLink(linked, installed);
                }
            }
        }
        catch
        {
            Directory.Delete(directory, recursive: true);
            throw;
        }
    }

    public string Path { get; }

    public void Dispose() => Directory.Delete(directory, recursive: true);
}
