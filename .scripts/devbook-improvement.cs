#:project ./DevBook.Tooling/DevBook.Tooling.csproj
#:property JsonSerializerIsReflectionEnabledByDefault=true
return await DevBook.Tooling.Improvement.EngineCommand.RunAsync(args, System.IO.Path.GetFullPath(System.IO.Path.Combine(System.IO.Path.GetDirectoryName(Source())!, "..")));
static string Source([System.Runtime.CompilerServices.CallerFilePath] string path = "") => path;
