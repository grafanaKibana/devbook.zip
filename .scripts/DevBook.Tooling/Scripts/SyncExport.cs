#:project ../DevBook.Tooling.csproj
#:property JsonSerializerIsReflectionEnabledByDefault=true

return await DevBook.Tooling.Export.Receipt.RunAsync(args);
