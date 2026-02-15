<%_* let calloutType = await tp.system.suggester(
  ["Abstract", "Attention", "Bug", "Caution", "Check", "Cite", "Danger", "Done", "Error", "Example", "Fail", "Failure", "FAQ", "Help", "Hint", "Important", "Info", "Missing", "Note", "Question", "Quote", "Success", "Summary", "Tip", "TLDR", "Todo", "Warning"],
  ["abstract", "attention", "bug", "caution", "check", "cite", "danger", "done", "error", "example", "fail", "failure", "faq", "help", "hint", "important", "info", "missing", "note", "question", "quote", "success", "summary", "tip", "tldr", "todo", "warning"],
  false,
  "Which type of callout?"
)%>
<%_* let foldState = await tp.system.suggester(
  ["Not Foldable", "Default Expanded", "Default Collapsed"],
  ["", "+", "-"],
  false,
  "Folding state?"
)%>
<%_* let title = await tp.system.prompt("Optional Title", "")%>
<%*
if (calloutType != null) {
  let selection = tp.file.selection();
  let body = selection
    ? selection
    : (await tp.system.clipboard()).trim() || await tp.system.prompt("Content (Shift+Enter for new line)", "", false, true);
  body = body.replaceAll("\n", "\n> ");
  tR += '> [!' + calloutType + ']' + foldState + ' ' + title + '\n> ' + body;
}
%>
