using DevBook.Tooling.Export;
using DevBook.Tooling.Improvement;

if (args.Length == 0 || args[0] is "--help" or "-h")
{
    Console.WriteLine("DevBook.Tooling improvement [options] | export <fixture|render|publish|finalize> [options]");
    return 0;
}

return args[0] switch
{
    "improvement" => await EngineCommand.RunAsync(args[1..]),
    "export" => await Worker.RunAsync(args[1..]),
    _ => UnknownCommand(args[0])
};

static int UnknownCommand(string command)
{
    Console.Error.WriteLine($"Unknown tooling command: {command}. Run with --help for usage.");
    return 1;
}
