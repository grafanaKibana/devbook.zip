---
topic:
  - Security
subtopic: []
level:
  - "1"
priority: Low
status: Ready To Repeat

dg-publish: false
---

# Intro

A blockchain is an append-only ledger where records are grouped into blocks and linked together using cryptographic hashes.

The hash link makes tampering detectable: changing a past block changes its hash, which breaks the chain unless all subsequent blocks are recomputed (and the network's consensus rules are satisfied).

## Example

Toy example: each block commits to the previous block hash.

```csharp
using System;
using System.Security.Cryptography;
using System.Text;

static string Sha256Hex(string s)
{
    var bytes = Encoding.UTF8.GetBytes(s);
    var hash = SHA256.HashData(bytes);
    return Convert.ToHexString(hash).ToLowerInvariant();
}

var genesisPrev = new string('0', 64);
var genesisData = "genesis";
var genesisHash = Sha256Hex(genesisPrev + genesisData);

var block2Prev = genesisHash;
var block2Data = "tx: alice -> bob (10)";
var block2Hash = Sha256Hex(block2Prev + block2Data);
```


## Questions

> [!QUESTION]- What is Block-chain?
> A blockchain is an append-only ledger where records are grouped into blocks and linked together using cryptographic hashes.

## Links

- [Blockchain](https://en.wikipedia.org/wiki/Blockchain)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/07 Security/Authentication/Authentication|Authentication]]
>
> **Pages**
> - [[Software Engineering/07 Security/Digital Signature|Digital Signature]]
> - [[Software Engineering/07 Security/Encryption|Encryption]]
> - [[Software Engineering/07 Security/JWT Bearer|JWT Bearer]]
> - [[Software Engineering/07 Security/OWASP|OWASP]]
<!-- whats-next:end -->
