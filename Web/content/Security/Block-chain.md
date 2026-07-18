---
publish: true
created: 2026-07-18T14:02:44.135Z
modified: 2026-07-18T14:02:44.135Z
published: 2026-07-18T14:02:44.135Z
topic:
  - Security
subtopic:
  - Security
summary: An append-only ledger of blocks linked by cryptographic hashes, making tampering detectable.
level:
  - "1"
priority: Low
status: Ready to Repeat
---

A blockchain is an append-only ledger where records are grouped into blocks and linked together using cryptographic hashes. Bitcoin processes roughly 7 transactions per second across its entire network — compared to Visa's 65,000 TPS capacity — which illustrates the fundamental throughput cost of decentralized consensus and why blockchain is only justified when mutual distrust between parties makes a central authority impossible.

The hash link makes tampering detectable: changing a past block changes its hash, which breaks the chain unless all subsequent blocks are recomputed (and the network's consensus rules are satisfied).

# Example

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

# Pitfalls

## Using Blockchain When a Database Suffices

**What goes wrong**: teams adopt blockchain for internal systems where all parties trust a central authority, gaining none of the decentralization benefits while paying the full cost in throughput, complexity, and compliance risk. An Australian government agency spent AUD \$8.5M on a blockchain-based supply chain system that was eventually replaced by a PostgreSQL database with audit logging — all participants were government departments that already trusted a central authority, so the consensus mechanism added latency and complexity with zero benefit.

**Why it happens**: blockchain is associated with innovation and security, making it attractive even when the problem doesn't require it.

**Mitigation**: blockchain is justified only when you need a shared ledger across mutually distrusting parties with no central authority. If you control all the nodes, a traditional database with audit logging is simpler, faster, and easier to comply with GDPR.

## GDPR Conflict with Immutability

**What goes wrong**: storing personal data on a blockchain makes it impossible to fulfill GDPR's right to erasure (Article 17). Once written, the data cannot be deleted without breaking the chain.

**Mitigation**: never store personal data directly on a blockchain. Store a hash or reference; keep the actual data in a mutable off-chain store that can be deleted.

# Tradeoffs

## Consensus Mechanisms

| Mechanism | Throughput | Energy | Decentralization | Use when |
|-----------|-----------|--------|-----------------|----------|
| Proof-of-Work (PoW) | ~7 TPS (Bitcoin) | Very high (ASIC mining) | High | Maximum censorship resistance; energy cost is acceptable |
| Proof-of-Stake (PoS) | ~15–30 TPS (Ethereum) | Low | High | Energy efficiency matters; validators stake tokens as collateral |
| Proof-of-Authority (PoA) | Thousands TPS | Minimal | Low (known validators) | Private/consortium chains where validators are trusted entities |

**Decision rule**: PoW for maximum trustlessness (public cryptocurrency). PoS for public chains where energy matters. PoA for enterprise/private chains where you know and trust all validators — but at that point, ask whether a traditional database with audit logging is simpler.

## Public vs Private Chains

| Type | Participants | Throughput | Immutability | Use when |
|------|------------|-----------|-------------|----------|
| Public (Bitcoin, Ethereum) | Anyone | Low (7–30 TPS) | Absolute | Trustless, permissionless ledger across unknown parties |
| Private/Consortium (Hyperledger) | Known entities | High (thousands TPS) | Configurable | Enterprise use with known participants; still need shared ledger |
| Traditional DB + audit log | Internal | Very high | Soft (admin can edit) | All parties trust a central authority |

**Decision rule**: if all parties trust a central authority, use a traditional database with append-only audit logging. Blockchain adds value only when you need a shared ledger across mutually distrusting parties with no central authority.

# Questions

> [!QUESTION]- When is blockchain justified over a traditional database?
> Blockchain is justified when you need a shared ledger across mutually distrusting parties with no central authority and no single party can be trusted to maintain the record. If all parties trust a central authority, a traditional database with append-only audit logging is simpler, faster, and GDPR-compliant. The cost of blockchain — low throughput, immutability conflicts with erasure rights, consensus overhead — is only worth paying when decentralization is a hard requirement.

> [!QUESTION]- Why does PoW waste energy and what is the alternative?
> Proof-of-Work requires miners to perform computationally expensive hash searches to earn the right to add a block. This energy expenditure is the security mechanism — attacking the chain requires outspending honest miners. Proof-of-Stake replaces energy expenditure with economic stake: validators lock up tokens as collateral and lose them if they act dishonestly. PoS achieves similar security guarantees at a fraction of the energy cost, which is why Ethereum migrated from PoW to PoS in 2022.

# Limitations for Enterprise Use

- **Throughput**: Public blockchains (Bitcoin: ~7 TPS, Ethereum: ~15 TPS) are orders of magnitude slower than traditional databases (thousands of TPS). Private blockchains are faster but lose decentralization benefits.
- **Immutability is a liability**: GDPR's right to erasure conflicts with blockchain's append-only nature. Storing personal data on a blockchain creates compliance problems.
- **Consensus overhead**: Proof-of-Work wastes energy. Proof-of-Stake is more efficient but adds validator complexity.
- **When to use**: Blockchain is justified when you need a shared ledger across mutually distrusting parties with no central authority. For most enterprise use cases, a traditional database with audit logging is simpler and faster.

# References

- [Blockchain (Wikipedia)](https://en.wikipedia.org/wiki/Blockchain) — comprehensive overview of blockchain concepts, consensus mechanisms, and applications
- [Bitcoin whitepaper (Satoshi Nakamoto)](https://bitcoin.org/bitcoin.pdf) — the original blockchain paper; explains the proof-of-work consensus mechanism
- [Ethereum — Proof-of-Stake](https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/) — Ethereum's official explanation of PoS, how validators are selected, and how slashing deters dishonest behavior
- [Hyperledger Fabric — Introduction](https://hyperledger-fabric.readthedocs.io/en/latest/whatis.html) — enterprise permissioned blockchain; explains PoA-style consensus and where private chains fit
