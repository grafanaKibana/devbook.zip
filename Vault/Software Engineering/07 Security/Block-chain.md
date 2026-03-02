---
topic:
  - Security
subtopic:
  - Security
level:
  - "1"
priority: Low
status: Creation

dg-publish: true
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


## Pitfalls

### Using Blockchain When a Database Suffices

**What goes wrong**: teams adopt blockchain for internal systems where all parties trust a central authority, gaining none of the decentralization benefits while paying the full cost in throughput, complexity, and compliance risk.

**Why it happens**: blockchain is associated with innovation and security, making it attractive even when the problem doesn't require it.

**Mitigation**: blockchain is justified only when you need a shared ledger across mutually distrusting parties with no central authority. If you control all the nodes, a traditional database with audit logging is simpler, faster, and easier to comply with GDPR.

### GDPR Conflict with Immutability

**What goes wrong**: storing personal data on a blockchain makes it impossible to fulfill GDPR's right to erasure (Article 17). Once written, the data cannot be deleted without breaking the chain.

**Mitigation**: never store personal data directly on a blockchain. Store a hash or reference; keep the actual data in a mutable off-chain store that can be deleted.

## Questions

> [!QUESTION]- What is Block-chain?
> A blockchain is an append-only ledger where records are grouped into blocks and linked together using cryptographic hashes. Changing a past block changes its hash, which breaks the chain unless all subsequent blocks are recomputed and the network's consensus rules are satisfied.
## Limitations for Enterprise Use

- **Throughput**: Public blockchains (Bitcoin: ~7 TPS, Ethereum: ~15 TPS) are orders of magnitude slower than traditional databases (thousands of TPS). Private blockchains are faster but lose decentralization benefits.
- **Immutability is a liability**: GDPR's right to erasure conflicts with blockchain's append-only nature. Storing personal data on a blockchain creates compliance problems.
- **Consensus overhead**: Proof-of-Work wastes energy. Proof-of-Stake is more efficient but adds validator complexity.
- **When to use**: Blockchain is justified when you need a shared ledger across mutually distrusting parties with no central authority. For most enterprise use cases, a traditional database with audit logging is simpler and faster.

## References

- [Blockchain (Wikipedia)](https://en.wikipedia.org/wiki/Blockchain) — comprehensive overview of blockchain concepts, consensus mechanisms, and applications
- [Bitcoin whitepaper (Satoshi Nakamoto)](https://bitcoin.org/bitcoin.pdf) — the original blockchain paper; explains the proof-of-work consensus mechanism
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
