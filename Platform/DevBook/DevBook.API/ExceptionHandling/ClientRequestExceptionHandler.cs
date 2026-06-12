namespace DevBook.API.ExceptionHandling;

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

internal sealed class ClientRequestExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    /// <summary>
    /// Converts validation and missing-file exceptions into HTTP 400 ProblemDetails responses.
    /// </summary>
    /// <param name="httpContext">Current HTTP request context.</param>
    /// <param name="exception">Exception thrown while handling the request.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>True when the exception was converted to a client response; otherwise false.</returns>
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (!IsClientRequestException(exception))
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = exception.Message,
            },
        });
    }

    private static bool IsClientRequestException(Exception exception) => exception switch
    {
        ArgumentException => true,
        DirectoryNotFoundException => true,
        FileNotFoundException => true,
        _ => false,
    };
}
