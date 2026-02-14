---
topic:
  - Networks
subtopic:
  - Transport & Sockets
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

> [!QUESTION]- UDP vs TCP: what is the difference?
> TCP is connection-oriented and provides reliable, ordered delivery with retransmissions, flow control, and congestion control.
> UDP is connectionless and sends independent datagrams with no built-in reliability or ordering.
> Typical uses: TCP for web traffic and most application protocols; UDP for real-time media, DNS, and protocols that implement reliability themselves.

## Links
