#:project ../DevBook.Tooling.csproj
#:property JsonSerializerIsReflectionEnabledByDefault=true

return await DevBook.Tooling.Vault.FolderRollup.RunAsync(args);
