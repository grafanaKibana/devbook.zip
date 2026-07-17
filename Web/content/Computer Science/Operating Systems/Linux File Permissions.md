---
publish: true
created: 2026-07-16T18:15:23.034Z
modified: 2026-07-16T18:16:44.335Z
published: 2026-07-16T18:16:44.335Z
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: How Linux mode bits, ownership, umask, special bits, and ACLs determine filesystem access.
level:
  - "4"
priority: High
status: Creation
---

# Intro

Linux starts a filesystem permission check from the calling process's filesystem user ID, group ID, supplementary groups, and capabilities. Traditional mode bits then select exactly one class—owner, group, or other—and apply its `rwx` bits. Access-control lists can add named users and groups, while mount options, immutable flags, and Linux security modules can impose further restrictions.

`-rwxr-x---` means a regular file with owner `rwx`, group `r-x`, and other `---`, written numerically as `0750`. The leading character is the file type, not a permission bit.

![[Assets/System Design 101/75e6e7578f2508d289246132b1e3242e84e23591c24c291f062f0d53047ba630.png]]

The visual covers regular `rwx` arithmetic. It does not cover directory semantics, special bits, capabilities, or ACL masks.

## File and directory bits differ

| Bit | Regular file | Directory |
| --- | --- | --- |
| `r` (`4`) | Read bytes | List names in the directory |
| `w` (`2`) | Modify bytes | Create, remove, or rename entries when traversal is also allowed |
| `x` (`1`) | Execute as a program | Search/traverse the directory and access known entries |

Deleting a file is primarily an operation on its parent directory, not on the file's own write bit. Every directory in a pathname also needs search permission unless a capability bypass applies.

## Creation and special cases

A process proposes a mode and the kernel clears bits selected by the umask. With umask `0022`, a requested regular-file mode of `0666` becomes `0644`; a requested directory mode of `0777` becomes `0755`. The application can request fewer bits, so umask does not grant permissions.

- **set-user-ID / set-group-ID** change execution credentials on eligible executable files; set-group-ID on a directory commonly makes new entries inherit the directory's group.
- **sticky** on a shared writable directory restricts removal or rename to permitted owners, as on `/tmp`.
- **POSIX ACLs** add named user/group entries. The ACL mask limits the effective rights of named users, named groups, and the owning group.

Inspect the resolved state rather than only the three octal digits:

```text
stat -c '%A %a %U:%G %n' ./artifact
namei -om /srv/app/artifact
getfacl ./artifact
```

## References

- [chmod(2)](https://man7.org/linux/man-pages/man2/fchmod.2.html) — authoritative Linux mode-bit and special-bit semantics.
- [path\_resolution(7)](https://man7.org/linux/man-pages/man7/path_resolution.7.html) — authoritative pathname traversal and permission-check rules.
- [umask(2)](https://man7.org/linux/man-pages/man2/umask.2.html) — creation-mode calculation and ACL interaction.
- [acl(5)](https://man7.org/linux/man-pages/man5/acl.5.html) — POSIX ACL entries, masks, and access-check algorithm.
- [ByteByteGo System Design 101 — Linux file permissions](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/linux-file-permission-illustrated.md) — editorial mode-bit overview and embedded visual; primary man pages supply the complete semantics.
