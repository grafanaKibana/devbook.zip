---
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: "The control handoff from firmware through the boot loader, kernel, initramfs, root filesystem, and systemd."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

Linux boot is a chain of control transfers. Each stage establishes just enough environment to load the next one: firmware selects a boot application, a boot loader places the kernel and optional initramfs in memory, the kernel initializes hardware and memory management, early user space finds the real root filesystem, and PID 1 starts the configured services.

## Handoff sequence

1. **Firmware.** UEFI enumerates boot options and loads an EFI application selected by its boot manager. Legacy BIOS instead begins from platform-specific boot code.
2. **Boot loader.** GRUB, systemd-boot, or another loader chooses a kernel, passes a command line, and usually supplies an initramfs image.
3. **Kernel and rootfs.** The kernel decompresses and initializes CPUs, memory, interrupts, and built-in drivers. Its special `rootfs` instance is already mounted. The kernel unpacks the built-in and any externally supplied initramfs `cpio` archives into that rootfs, then executes `/init` as PID 1 when the file exists.
4. **Early user space.** `/init`, already running as PID 1, loads modules, unlocks encrypted storage, assembles RAID/LVM if needed, and mounts the real root filesystem.
5. **Root handoff, same PID 1.** `/init` moves or overmounts the real root into place and `exec`s its real init program—commonly systemd. `exec` replaces the process image without creating a new process, so systemd remains PID 1 and activates units according to dependencies and the selected target. If no `/init` exists after initramfs extraction, the kernel instead takes its legacy fallback: it locates and mounts the configured root filesystem, then executes an init such as `/sbin/init` itself.
6. **Login or service workload.** Getty, a display manager, containers, and server services start as units; there is no single universal “login script” stage.

The initramfs step is why a diagram that jumps directly from GRUB to systemd is unsafe. If the root disk driver, encryption key flow, or storage assembly exists only in early user space, a failure occurs before systemd on the real root filesystem can run.

Initramfs is not the legacy **initrd** mechanism. An initrd is a compressed filesystem image placed on a RAM-backed block device; the kernel needs the corresponding filesystem driver, mounts that image, and later pivots away and unmounts the ramdisk. Initramfs is a compressed `cpio` archive unpacked directly into rootfs, without an intermediate block device. Its `/init` is expected to perform the root handoff and `exec` the next init rather than return to the kernel's older root-mount path.

## Trace a slow or failed boot

```text
cat /proc/cmdline
journalctl -b -k
journalctl -b -u example.service
systemd-analyze critical-chain
```

`journalctl -b -k` isolates kernel messages from the current boot. A failure before the real root switch may require the initramfs emergency shell or console output; a failed systemd unit should be diagnosed from its dependency and unit log. `systemd-analyze critical-chain` shows time spent on the activation path, but parallel units mean it is not a complete performance profile.

## References

- [UEFI Specification 2.11 — Boot Manager](https://uefi.org/specs/UEFI/2.11/03_Boot_Manager.html) — primary specification for UEFI boot options and application loading.
- [Linux kernel documentation — Ramfs, rootfs and initramfs](https://docs.kernel.org/6.0/filesystems/ramfs-rootfs-initramfs.html) — primary description of the already-mounted rootfs, `cpio` extraction, `/init` execution, and the differences from legacy initrd.
- [Linux kernel documentation — Using the initial RAM disk](https://docs.kernel.org/admin-guide/initrd.html) — primary kernel documentation for early user space and switching to the real root filesystem.
- [systemd — Bootup](https://www.freedesktop.org/software/systemd/man/latest/bootup.html) — primary systemd documentation for the boot-time unit graph and targets.
- [ByteByteGo System Design 101 — Linux boot process](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/linux-boot-process-explained.md) — editorial overview used for provenance; its stage-skipping source diagram is intentionally excluded.
