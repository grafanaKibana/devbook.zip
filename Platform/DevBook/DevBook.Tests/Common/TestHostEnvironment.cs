namespace DevBook.Tests.Common;

using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

internal sealed class TestHostEnvironment(string contentRootPath) : IHostEnvironment
{
    /// <summary>
    /// Gets or sets the ASP.NET Core environment name for tests.
    /// </summary>
    public string EnvironmentName { get; set; } = Environments.Development;

    /// <summary>
    /// Gets or sets the application name reported by the test host.
    /// </summary>
    public string ApplicationName { get; set; } = "DevBook.Tests";

    /// <summary>
    /// Gets or sets the content root path.
    /// </summary>
    public string ContentRootPath { get; set; } = contentRootPath;

    /// <summary>
    /// Gets or sets the file provider for the test content root.
    /// </summary>
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
