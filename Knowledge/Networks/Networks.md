---
topic: []
subtopic: []
level: ["1"]
priority: medium
status: Not-Started
tags:
  - FolderNote
---
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`
## Children
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

## Pages
```dataview
LIST
WHERE file.folder = this.file.folder
  AND file.path != this.file.path
  AND !contains(file.tags, "#FolderNote")
SORT file.name ASC
```

## Intro

## Deeper Explanation

[TCP/IP](Knowledge/Networks/TCP IP.md)

[UDP](Knowledge/Networks/UDP.md)

[SMTP](Knowledge/Networks/SMTP.md)

[RPC](Knowledge/Networks/RPC.md)

[gRPC](Knowledge/Networks/gRPC.md)

[VPN](Knowledge/Networks/VPN.md)

[DNS](Knowledge/Networks/DNS.md)

[HTTP & HTTPS](Knowledge/Networks/HTTP & HTTPS.md)

[HTTP/2](Knowledge/Networks/HTTP 2.md)

[Sockets](Knowledge/Networks/Sockets.md)

[Peer-2-Peer](Knowledge/Networks/Peer-2-Peer.md)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
