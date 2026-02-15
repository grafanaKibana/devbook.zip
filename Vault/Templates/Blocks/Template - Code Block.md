<%_* let language = await tp.system.suggester(
  ["JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "C", "HTML", "CSS", "Bash", "PowerShell", "SQL", "JSON", "YAML", "XML", "Markdown", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Plain Text"],
  ["javascript", "typescript", "python", "java", "csharp", "cpp", "c", "html", "css", "bash", "powershell", "sql", "json", "yaml", "xml", "markdown", "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "text"],
  false,
  "Which programming language?"
)%>
<%*
if (language != null) {
  let selection = tp.file.selection();
  let code = selection
    ? selection
    : (await tp.system.clipboard()).trim() || await tp.system.prompt("Enter your code", "", false, true);
  tR += '```' + language + '\n' + code + '\n```';
}
%>
