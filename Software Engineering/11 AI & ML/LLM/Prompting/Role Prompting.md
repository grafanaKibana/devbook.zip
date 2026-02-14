---
topic: ["AI"]
subtopic: ["Prompting", "Techniques"]
level: ["1"]
priority: Medium
status: Not-Started
tags:
  - FolderNote
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

```dataviewjs
const cur = dv.current();
const curFolder = cur.file.folder;
const curPath = cur.file.path;

const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const children = dv.pages()
  .where(p => p.file.folder.startsWith(curFolder + "/"))
  .where(p => p.file.folder.split("/").length === curFolder.split("/").length + 1)
  .where(p => p.file.name === p.file.folder.split("/").slice(-1)[0])
  .where(p => isFolderNote(p))
  .sort(p => p.file.folder, "asc");

if (children.length) {
  dv.header(2, "Children");
  dv.list(children.map(p => p.file.link));
}

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");

if (pages.length) {
  dv.header(2, "Pages");
  dv.list(pages.map(p => p.file.link));
}
```
---
## Intro

## Deeper Explanation

![11 AI & ML-Role Prompting-20260211012332438.svg](11%20AI%20&%20ML-Role%20Prompting-20260211012332438.svg)

# What is Role Prompting?

Role prompting is a technique that involves assigning specific roles to the LLM (Large Language Model) to control the style, tone, and quality of AI-generated text. By instructing the AI to adopt a particular role or perspective, you can influence how it approaches a task and the characteristics of its output.

The implementation of role prompting is straightforward: simply instruct the AI to "act as" or "embody" a specific character, profession, or perspective. For example, you might ask the AI to "act like a detective" or "embody a food critic."

## Benefits of Role Prompting

- Control over writing style and tone
- Enhanced depth and specificity of information
- Improved accuracy for certain tasks (e.g., math problems)
- More targeted and relevant content for specific audiences

## Primary Applications

Role prompting is most commonly used for styling text. It allows you to modify how the AI writes based on the assigned role, affecting:

- Tone (formal, casual, technical, conversational)
- Style (descriptive, analytical, persuasive)
- Depth of information (basic overview vs. detailed analysis)
- Perspective (expert, novice, specific profession)

## Practical Example: Food Review

When writing a review, tailoring your approach based on the platform and audience is crucial. The style, length, language, and tone should be adjusted accordingly to ensure the review resonates with readers. Let's compare the outputs of a standard prompt versus a role-based prompt.

### Standard Prompt

> [!EXAMPLE]
> 💬 Write a review of [pizza place].

> [!EXAMPLE]
> 📝 "I recently had the pleasure of trying [pizza place] and I must say that I was thoroughly impressed. The pizza was cooked to perfection and the toppings were fresh and flavorful. The crust was light and crispy, and the sauce was just the right amount of tangy. The service was also top-notch; the staff was friendly and attentive. Overall, I had a great experience and would definitely recommend [pizza place] to anyone looking for a delicious pizza."

### Role-Based Prompt

> [!EXAMPLE]
> 💬 You are a food critic. Write a review of [pizza place].

> [!EXAMPLE]
> 📝 "I recently had the pleasure of dining at [pizza place], a cozy pizzeria located in the heart of the city. Despite its small size, the restaurant packs a huge punch when it comes to flavor. The pizza was cooked to perfection. The crust was delightfully thin and crispy and the toppings were fresh and flavorful. The combination of flavors was simply delicious. The marinara sauce was rich and flavorful and complemented the toppings perfectly. The cheese was gooey and melted in my mouth. The service was also excellent. The staff was friendly and attentive. They were quick to answer questions and made sure that our food was served on time. Overall, my experience at [pizza place] was fantastic and I highly recommend it to anyone looking for a delicious pizza."

## Key Differences in Outputs

When comparing the standard review to the food critic review, several notable differences emerge:

- The food critic review provides more context (location description)
- It includes more detailed and specific descriptions of food qualities
- The vocabulary is more varied and specialized ("delightfully" vs. "light")
- The overall structure is more comprehensive and professional

## Best Practices for Role Prompting

1. Be specific about the role ("experienced food critic with 15 years of experience" vs. just "food critic")
2. Provide context about the role's expertise or background when relevant
3. Combine role prompting with other prompting techniques for enhanced results
4. Experiment with different roles to find the most effective one for your specific task

 

**References:**

1. [Learn Prompting: Role Prompting Guide](https://learnprompting.org/docs/basics/roles)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
