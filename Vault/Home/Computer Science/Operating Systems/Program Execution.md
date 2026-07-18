---
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: "How Linux replaces a process image with an executable, maps its dependencies, and transfers control to user code."
level:
  - "4"
priority: High
status: Creation
publish: true
---

# Intro

On Linux, launching a native program usually means a shell or parent process creates a child and that child calls `execve`. `execve` does not create another process: it replaces the calling process's memory image while retaining its process ID. The kernel validates the executable format, establishes a new address space, and transfers control either to the program's entry point or to the interpreter named by the executable, such as the ELF dynamic linker.

Compilation is a different boundary. A compiler and linker produce an executable before launch; the kernel does not compile source code. Managed applications add a runtime after operating-system loading: a .NET host loads the [[Common Language Runtime]], which then loads assemblies and JIT-compiles methods as needed.

## Linux/ELF execution path

1. A parent calls `fork`, `posix_spawn`, or an equivalent library API, then the child calls `execve(path, argv, envp)`.
2. The kernel checks execute permission and recognizes the binary format or shebang interpreter.
3. For a dynamically linked ELF file, the kernel loads the interpreter from `PT_INTERP`—normally `ld.so`—along with the executable's loadable segments.
4. The new stack receives arguments, environment variables, and an auxiliary vector. Mappings, signal dispositions, credentials, and file descriptors follow the documented `execve` preservation/reset rules.
5. The dynamic linker maps required shared objects, resolves relocations according to the program and loader configuration, and transfers control to startup code and then `main`.
6. The program performs privileged work through system calls. On exit, the kernel reclaims its address space and closes remaining process-owned file descriptors; application-level cleanup is not guaranteed after a crash or uncatchable signal.

Inspect the real boundary instead of guessing from a filename:

```text
file ./app
readelf -l ./app
strace -f -e trace=process,file ./app
```

`readelf -l` exposes `PT_INTERP` and loadable segments. `strace` shows the process and file calls that reach the kernel. Do not run dependency-inspection tools that execute code against an untrusted binary.

## References

- [execve(2)](https://www.man7.org/linux/man-pages/man2/execve.2.html) — authoritative replacement semantics, preserved process attributes, scripts, and ELF interpreter handling.
- [ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html) — authoritative dynamic-linker search, loading, and environment behavior.
- [System V ABI — ELF specification](https://refspecs.linuxfoundation.org/elf/gabi4+/contents.html) — executable layout, program headers, and dynamic linking contracts.
- [ByteByteGo System Design 101 — How do computer programs run?](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-computer-programs-run.md) — editorial overview used for provenance; its compilation/runtime-conflating source diagram is intentionally excluded.
