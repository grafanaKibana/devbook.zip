---
tags: [Template]
---

<%*
const labels = [
  "Abstract", "Attention", "Bug", "Caution", "Check", "Cite", "Danger", "Done",
  "Error", "Example", "Fail", "Failure", "FAQ", "Help", "Hint", "Important",
  "Info", "Missing", "Note", "Question (generic)", "Quote", "Success", "Summary",
  "Tip", "TLDR", "Todo", "Warning", "Interview Question (Qard)",
];
const values = [
  "abstract", "attention", "bug", "caution", "check", "cite", "danger", "done",
  "error", "example", "fail", "failure", "faq", "help", "hint", "important",
  "info", "missing", "note", "question", "quote", "success", "summary", "tip",
  "tldr", "todo", "warning", "__qard__",
];
const calloutType = await tp.system.suggester(labels, values, false, "Which type of callout?");

if (calloutType === "__qard__") {
  const initialPath = tp.file.path(true).replaceAll("\\", "/");
  const pathMatch = /^Home\/([^/]+)\/(.+)\.md$/i.exec(initialPath);
  const initialFile = tp.file.find_tfile(initialPath);
  const initialActiveFile = app.workspace.getActiveFile();
  const isStable = () => {
    const currentPath = tp.file.path(true).replaceAll("\\", "/");
    const activeFile = app.workspace.getActiveFile();
    return currentPath === initialPath && activeFile?.path === initialPath;
  };
  const validLogicalValue = (value) =>
    typeof value === "string" && value.trim().length > 0 && !/[\r\n]/.test(value);
  const hasInvalidAnswerStructure = (value, title) => {
    let fence = title.match(/^ {0,3}(`{3,}|~{3,})/)?.[1] || "";
    for (const line of value.split(/\r?\n/)) {
      if (fence) {
        const closing = line.match(/^ {0,3}(`+|~+)\s*$/)?.[1];
        if (closing?.[0] === fence[0] && closing.length >= fence.length) fence = "";
      } else {
        const opening = line.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
        if (opening) fence = opening;
        else if (
          line.trim() === "<!-- qard-answer -->" ||
          /^[ \t]{0,3}>[ \t]*\[!(?:qard|question)\][+-]?(?:[ \t]+(.*))?$/i.test(`> ${line}`)
        ) return true;
      }
    }
    return fence.length > 0;
  };
  const semanticText = (value) =>
    value
      .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
      .replace(/%%[\s\S]*?(?:%%|$)/g, "")
      .trim();

  if (!pathMatch || !initialFile || initialActiveFile?.path !== initialPath) {
    new Notice("Interview questions can only be added to the active note under Home.");
  } else {
    const titleInput = await tp.system.prompt("Interview question", "");
    const title = titleInput?.trim();
    if (!title || /[\r\n]/.test(title) || !semanticText(title)) {
      if (titleInput !== null) new Notice("Interview questions require a title.");
    } else {
      const selection = tp.file.selection();
      const answerInput = selection.trim()
        ? selection
        : (await tp.system.clipboard()).trim() || await tp.system.prompt("Answer (Shift+Enter for new line)", "", false, true);
      const answer = answerInput?.replace(/\r\n?/g, "\n").trim();
      if (!answer || !semanticText(answer)) {
        if (answerInput !== null) new Notice("Interview questions require an answer.");
      } else if (hasInvalidAnswerStructure(answer, title)) {
        new Notice("Interview answers must close all code fences and cannot contain reserved Qard/Question headers or <!-- qard-answer --> dividers outside code fences.");
      } else if (!isStable()) {
        new Notice("The active note changed; the interview question was not added.");
      } else {
        const cachedFrontmatter = app.metadataCache.getFileCache(initialFile)?.frontmatter ?? {};
        const existingDeck = cachedFrontmatter["qard-deck"];
        const existingTopic = cachedFrontmatter["qard-topic"];
        const invalidDeck = existingDeck != null && !validLogicalValue(existingDeck);
        const invalidTopic = existingTopic != null && !validLogicalValue(existingTopic);

        if (invalidDeck || invalidTopic) {
          new Notice("qard-deck and qard-topic must be nonempty single-line text values.");
        } else {
          const deck = pathMatch[1];
          const topic = pathMatch[2];
          let metadataReady = true;
          if (existingDeck == null || existingTopic == null) {
            try {
              await app.fileManager.processFrontMatter(initialFile, (frontmatter) => {
                if (!isStable()) {
                  const error = new Error("Active note changed");
                  error.code = "QARD_ACTIVE_FILE_DRIFT";
                  throw error;
                }
                const currentDeck = frontmatter["qard-deck"];
                const currentTopic = frontmatter["qard-topic"];
                if (currentDeck != null && !validLogicalValue(currentDeck)) {
                  const error = new Error("Invalid qard-deck value");
                  error.code = "QARD_INVALID_METADATA";
                  throw error;
                }
                if (currentTopic != null && !validLogicalValue(currentTopic)) {
                  const error = new Error("Invalid qard-topic value");
                  error.code = "QARD_INVALID_METADATA";
                  throw error;
                }
                if (currentDeck == null) frontmatter["qard-deck"] = deck;
                if (currentTopic == null) frontmatter["qard-topic"] = topic;
              });
            } catch (error) {
              metadataReady = false;
              if (error?.code === "QARD_ACTIVE_FILE_DRIFT") {
                new Notice("The active note changed; no interview question was added.");
              } else if (error?.code === "QARD_INVALID_METADATA") {
                new Notice("qard-deck and qard-topic must be nonempty single-line text values.");
              } else {
                new Notice("The note metadata could not be updated; no interview question was added.");
              }
            }
          }
          if (metadataReady && isStable()) {
            tR += `> [!qard]- ${title}\n> ${answer.replaceAll("\n", "\n> ")}`;
          } else if (metadataReady) {
            new Notice("The active note changed before the interview question was written.");
          }
        }
      }
    }
  }
} else if (calloutType != null) {
  const foldState = await tp.system.suggester(
    ["Not Foldable", "Default Expanded", "Default Collapsed"],
    ["", "+", "-"],
    false,
    "Folding state?",
  );
  const title = await tp.system.prompt("Optional Title", "");
  const selection = tp.file.selection();
  const body = selection
    ? selection
    : (await tp.system.clipboard()).trim() || await tp.system.prompt("Content (Shift+Enter for new line)", "", false, true);
  if (foldState != null && body != null) {
    tR += `> [!${calloutType}]${foldState} ${title ?? ""}\n> ${body.replaceAll("\n", "\n> ")}`;
  }
}
%>
