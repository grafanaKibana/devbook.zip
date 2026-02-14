---
topic:
  - DevOps
subtopic: []
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What problem does Docker solve? What is a container?
> Docker helps package an application with its dependencies and run it consistently across environments ("works on my machine" problem).
> A container is an isolated process that runs from an image and uses OS features (namespaces, cgroups) to limit what it can see and use.
> Unlike virtual machines, containers share the host kernel, so they start faster and use fewer resources.

## Links
- [What is Docker? (IBM)](https://www.ibm.com/ru-ru/cloud/learn/docker)
- [What are containers? (IBM)](https://www.ibm.com/ru-ru/cloud/learn/containers)
