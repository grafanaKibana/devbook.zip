---
{"dg-publish":true,"permalink":"/software-engineering/software-engineering/","tags":["FolderNote","gardenEntry"],"noteIcon":""}
---


## Start Here

- [Roadmap](Roadmap.canvas)
- [Browse Topics](Topics.base)

# Topic Coverage

dataview``` query blocks.
const wrapper = this.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const thead = table.createEl("thead");
thead.classList.add("table-view-thead");
const hr = thead.createEl("tr");
for (const h of ["Topic", "Completion", "Done"]) {
  const th = hr.createEl("th", { text: h });
}

const tbody = table.createEl("tbody");
tbody.classList.add("table-view-tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  const tdTopic = tr.createEl("td", { text: r.topic });

  const tdProg = tr.createEl("td");
  appendProgress(tdProg, r.pct);

  const tdDone = tr.createEl("td", { text: `${r.done}/${r.total}` });
}

// Display notes without topics
if (notesWithoutTopic.length > 0) {
  const noteLinks = notesWithoutTopic
    .map(note => `> - [[${note.file.path.replace('.md', '')}|${note.file.name}]]`)
    .join('\n');

  const count = notesWithoutTopic.length;
  const label = count === 1 ? "Note" : "Notes";
  const calloutMarkdown = `> [!warning] ${count} ${label} missing topic\n${noteLinks}`;

  dv.paragraph(calloutMarkdown);
}
```
# Status Distribution

dataview``` query blocks.
const wrapper = this.container.createEl("div");
wrapper.classList.add("block-language-dataview");

const table = wrapper.createEl("table");
table.classList.add("dataview", "table-view-table");

const thead = table.createEl("thead");
thead.classList.add("table-view-thead");
const hr = thead.createEl("tr");
for (const h of ["Status", "Distribution", "Count"]) {
  const th = hr.createEl("th", { text: h });
}

const tbody = table.createEl("tbody");
tbody.classList.add("table-view-tbody");
for (const r of rows) {
  const tr = tbody.createEl("tr");

  const tdStatus = tr.createEl("td", { text: r.status });

  const tdProg = tr.createEl("td");
  appendProgress(tdProg, r.pct);

  const tdCount = tr.createEl("td", { text: `${r.count}` });
}
```

# Focus

| Note                                                                                                                         | Topic                         | Status          | Priority |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------- | -------- |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Delegates and Events\|Delegates and Events]]          | <ul><li>Programming</li></ul> | Ready To Repeat | Medium   |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Strings\|Strings]]                                    | <ul><li>Programming</li></ul> | Ready To Repeat | Medium   |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Reflection\|Reflection]]                 | <ul><li>Programming</li></ul> | Creation        | Medium   |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Namespaces\|Namespaces]]                 | <ul><li>Programming</li></ul> | Creation        | Medium   |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Foreach\|Foreach]]                       | <ul><li>Programming</li></ul> | Creation        | Medium   |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Exception Handling\|Exception Handling]] | <ul><li>Programming</li></ul> | Creation        | Medium   |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Methods\|Methods]]                       | <ul><li>Programming</li></ul> | Creation        | Medium   |
| [[Software Engineering/11 AI & ML/LLM/Prompting/Showing Examples\|Showing Examples]]                                      | <ul><li>AI & ML</li></ul>     | Ready To Repeat | Medium   |
| [[Software Engineering/11 AI & ML/LLM/Prompting/Role Prompting\|Role Prompting]]                                          | <ul><li>AI & ML</li></ul>     | Ready To Repeat | Medium   |
| [[Software Engineering/11 AI & ML/LLM/Prompting/Prompting\|Prompting]]                                                    | <ul><li>AI & ML</li></ul>     | Ready To Repeat | Medium   |
| [[Software Engineering/11 AI & ML/LLM/Agents/Tools\|Tools]]                                                               | <ul><li>AI & ML</li></ul>     | Creation        | Medium   |
| [[Software Engineering/11 AI & ML/LLM/Agents/Mental Framework\|Mental Framework]]                                         | <ul><li>AI & ML</li></ul>     | Creation        | Medium   |

{ .block-language-dataview}

# Recently Updated

| Note                                                                                                                         | Date                        |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Delegates and Events\|Delegates and Events]]          | 7:38 PM - February 15, 2026 |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Strings\|Strings]]                                    | 7:38 PM - February 15, 2026 |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Reflection\|Reflection]]                 | 7:38 PM - February 15, 2026 |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Namespaces\|Namespaces]]                 | 7:38 PM - February 15, 2026 |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Foreach\|Foreach]]                       | 7:38 PM - February 15, 2026 |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Exception Handling\|Exception Handling]] | 7:38 PM - February 15, 2026 |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Methods\|Methods]]                       | 7:38 PM - February 15, 2026 |
| [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Async Await\|Async Await]]                                  | 7:38 PM - February 15, 2026 |
| [[Software Engineering/11 AI & ML/LLM/Prompting/Showing Examples\|Showing Examples]]                                      | 7:38 PM - February 15, 2026 |
| [[Software Engineering/11 AI & ML/LLM/Prompting/Role Prompting\|Role Prompting]]                                          | 7:38 PM - February 15, 2026 |
| [[Software Engineering/11 AI & ML/LLM/Prompting/Prompting\|Prompting]]                                                    | 7:38 PM - February 15, 2026 |
| [[Software Engineering/11 AI & ML/LLM/Agents/Tools\|Tools]]                                                               | 7:38 PM - February 15, 2026 |

{ .block-language-dataview}
