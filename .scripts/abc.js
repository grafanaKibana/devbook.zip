function formatAsCallout(text, type = "note") {
  const blockQuoteLines = text.split("\n").map((line) => `> ${line}`);
  return `> [!${type}]\n${blockQuoteLines.join("\n")}`;
}

module.exports = {
  note: (text) => formatAsCallout(text, "note"),
  tip: (text) => formatAsCallout(text, "tip"),
  warning: (text) => formatAsCallout(text, "warning"),
};

