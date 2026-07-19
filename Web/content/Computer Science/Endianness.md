---
publish: true
created: 2026-07-18T14:02:44.055Z
modified: 2026-07-18T14:02:44.055Z
published: 2026-07-18T14:02:44.055Z
topic:
  - Computer Science
subtopic: []
summary: How multi-byte values map to byte addresses, and how to make byte order explicit at protocol and file boundaries.
level:
  - "3"
priority: Medium
status: Creation
---

Endianness is the order in which a machine or format stores the bytes of a multi-byte value. It does not reverse the bits inside each byte. For the 32-bit value `0x12345678`, the bytes are `12`, `34`, `56`, and `78`; only their address order changes.

| Address | Big-endian byte | Little-endian byte |
| --- | --- | --- |
| `1000` | `0x12` | `0x78` |
| `1001` | `0x34` | `0x56` |
| `1002` | `0x56` | `0x34` |
| `1003` | `0x78` | `0x12` |

Big-endian puts the most significant byte at the lowest address. Little-endian puts the least significant byte there. The distinction matters when bytes cross a boundary: a network protocol, binary file, device register, or foreign-function interface. Within a process, ordinary integer operations hide the storage order.

# Make the boundary explicit

Never serialize by copying the in-memory representation of an integer and assuming the receiver uses the same order. Define the order in the format and use an API that names it:

```csharp
using System.Buffers.Binary;

Span<byte> frame = stackalloc byte[4];
BinaryPrimitives.WriteUInt32BigEndian(frame, 0x12345678);

uint correct = BinaryPrimitives.ReadUInt32BigEndian(frame);    // 0x12345678
uint swapped = BinaryPrimitives.ReadUInt32LittleEndian(frame); // 0x78563412
```

Many Internet protocols use network byte order, which is big-endian. File formats are free to choose either order, and some carry a byte-order marker. CPU families are not a reliable protocol contract: an architecture can support more than one mode, while an operating-system ABI normally chooses one. `BitConverter.IsLittleEndian` reports the current runtime's convention when native layout genuinely matters; it is not a substitute for an explicit wire format.

# Pitfalls

- Text has character encoding, not integer endianness, until a text encoding defines multi-byte code units or a byte-order marker.
- Hex dumps show bytes in increasing address order. A little-endian integer can therefore look “reversed” even though the dump is correct.
- A struct's byte layout also includes alignment and padding. Matching byte order alone does not make raw struct serialization portable.

# References

- [System.Buffers.Binary.BinaryPrimitives](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.binary.binaryprimitives) — the .NET APIs that explicitly read and write primitive values in big- or little-endian order.
- [BitConverter.IsLittleEndian](https://learn.microsoft.com/en-us/dotnet/api/system.bitconverter.islittleendian) — the runtime check for the machine representation used by `BitConverter`.
- [IANA RFC 1700 — Data Notations](https://www.rfc-editor.org/rfc/rfc1700) — defines the network-byte-order notation used by Internet protocol documents.
- [ByteByteGo System Design 101 — Big endian vs little endian](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/big-endian-vs-little-endian.md) — editorial overview used for provenance; its address-skipping source diagram is intentionally excluded.
