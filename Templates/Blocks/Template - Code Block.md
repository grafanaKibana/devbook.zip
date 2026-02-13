<%_* let language = await tp.system.suggester(
  ["JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "C", "HTML", "CSS", "Bash", "PowerShell", "SQL", "JSON", "YAML", "XML", "Markdown", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Plain Text"],
  ["javascript", "typescript", "python", "java", "csharp", "cpp", "c", "html", "css", "bash", "powershell", "sql", "json", "yaml", "xml", "markdown", "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "text"],
  false,
  "Which programming language?"
)%>

<%_*
  let code = await tp.system.prompt("Enter your code", "", false, true)
%>

<%-*
if (language != null) {
  let content = '```' + language + '\n' + code + '\n```\n'
  tR+=content
}
%>
