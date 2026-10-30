using System.Diagnostics;
using System.Text;

namespace DevBook.Tooling.Infrastructure;

public sealed record ProcessRequest(
    string FileName,
    IReadOnlyList<string> Arguments,
    string WorkingDirectory,
    IReadOnlyDictionary<string, string>? Environment = null,
    byte[]? StandardInput = null,
    TimeSpan? Timeout = null,
    bool ClearEnvironment = false);

public sealed record ProcessResult(int ExitCode, byte[] Output, byte[] Error)
{
    public string Stdout => Encoding.UTF8.GetString(Output);

    public string Stderr => Encoding.UTF8.GetString(Error);

    public ProcessResult EnsureSuccess(string operation = "Process")
    {
        if (ExitCode != 0)
        {
            throw new InvalidOperationException($"{operation} failed with exit code {ExitCode}.");
        }

        return this;
    }
}

public interface IProcessRunner
{
    Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken = default);
}

public sealed class SystemProcessRunner : IProcessRunner
{
    public async Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.FileName);
        var startInfo = new ProcessStartInfo(request.FileName)
        {
            WorkingDirectory = request.WorkingDirectory,
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        foreach (string argument in request.Arguments)
        {
            startInfo.ArgumentList.Add(argument);
        }

        if (request.ClearEnvironment)
        {
            startInfo.Environment.Clear();
        }

        if (request.Environment is not null)
        {
            foreach (KeyValuePair<string, string> item in request.Environment)
            {
                startInfo.Environment[item.Key] = item.Value;
            }
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(request.Timeout ?? TimeSpan.FromMinutes(1));
        using var process = new Process { StartInfo = startInfo };
        process.Start();
        using var output = new MemoryStream();
        using var error = new MemoryStream();
        Task outputCopy = process.StandardOutput.BaseStream.CopyToAsync(output);
        Task errorCopy = process.StandardError.BaseStream.CopyToAsync(error);
        try
        {
            if (request.StandardInput is not null)
            {
                await process.StandardInput.BaseStream.WriteAsync(request.StandardInput, timeout.Token);
            }

            process.StandardInput.Close();
            await process.WaitForExitAsync(timeout.Token);
            await Task.WhenAll(outputCopy, errorCopy).WaitAsync(timeout.Token);
            return new ProcessResult(process.ExitCode, output.ToArray(), error.ToArray());
        }
        catch (OperationCanceledException)
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }

            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await process.WaitForExitAsync(cleanup.Token);
            await Task.WhenAll(outputCopy, errorCopy).WaitAsync(cleanup.Token);
            if (cancellationToken.IsCancellationRequested)
            {
                throw;
            }

            throw new TimeoutException($"{Path.GetFileName(request.FileName)} exceeded its execution deadline.");
        }
    }
}
