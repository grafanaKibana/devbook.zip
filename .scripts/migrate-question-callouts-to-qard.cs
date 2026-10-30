#:project ./DevBook.Tooling/DevBook.Tooling.csproj
#:property JsonSerializerIsReflectionEnabledByDefault=true
return await DevBook.Tooling.Vault.Migration.RunAsync(args);
