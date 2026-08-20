---
publish: true
created: 2026-08-20T20:41:15.611Z
modified: 2026-08-20T20:41:15.611Z
published: 2026-08-20T20:41:15.611Z
topic:
  - Computer Science
subtopic: []
summary: How multi-byte values map to byte addresses, and how to make byte order explicit at protocol and file boundaries.
level:
  - "3"
priority: Medium
status: Creation
---

Endianness is the order in which a machine or format stores the bytes of a multi-byte value. It does not reverse the bits inside each byte. For the 32-bit value `0x12345678`, the bytes are `12`, `34`, `56`, and `78`. Only their address order changes.

| Address | Big-endian byte | Little-endian byte |
| --- | --- | --- |
| `1000` | `0x12` | `0x78` |
| `1001` | `0x34` | `0x56` |
| `1002` | `0x56` | `0x34` |
| `1003` | `0x78` | `0x12` |

Big-endian puts the most significant byte at the lowest address. Little-endian puts the least significant byte there. The distinction matters when bytes cross a boundary: a network protocol, binary file, device register, or foreign-function interface. Within a process, ordinary integer operations hide the storage order.

# Make the Boundary Explicit

Portable serialization cannot depend on an integer's in-memory representation. The format must define its byte order, and the read/write API should name that order:

```csharp
using System.Buffers.Binary;

Span<byte> frame = stackalloc byte[4];
BinaryPrimitives.WriteUInt32BigEndian(frame, 0x12345678);

uint correct = BinaryPrimitives.ReadUInt32BigEndian(frame);    // 0x12345678
uint swapped = BinaryPrimitives.ReadUInt32LittleEndian(frame); // 0x78563412
```

Many Internet protocols use network byte order, which is big-endian. File formats are free to choose either order, and some carry a byte-order marker. CPU families are not a reliable protocol contract: an architecture can support more than one mode, while an operating-system ABI normally chooses one. `BitConverter.IsLittleEndian` reports the current runtime's convention when native layout genuinely matters. It is not a substitute for an explicit wire format.

# Pitfalls

- Text has character encoding, not integer endianness, until a text encoding defines multi-byte code units or a byte-order marker.
- Hex dumps show bytes in increasing address order. A little-endian integer can therefore look “reversed” even though the dump is correct.
- A struct's byte layout also includes alignment and padding. Matching byte order alone does not make raw struct serialization portable.

# References

- [System.Buffers.Binary.BinaryPrimitives](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.binary.binaryprimitives)
- [IANA RFC 1700 — Data Notations](https://www.rfc-editor.org/rfc/rfc1700)
