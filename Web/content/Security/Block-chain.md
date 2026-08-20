---
publish: true
created: 2026-08-20T20:41:15.668Z
modified: 2026-08-20T20:41:15.668Z
published: 2026-08-20T20:41:15.668Z
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

A blockchain replicates an ordered ledger across several nodes. Blocks commit to earlier blocks through cryptographic hashes, while consensus rules decide which proposed history the nodes accept. That combination is useful when no participant should control the shared record alone. It is usually needless overhead when one trusted operator can own a database and audit log.

Hash links make a rewritten history detectable because changing one block changes every later commitment. They do not make history immutable by themselves. Resistance to replacement comes from validation rules, replicated state, consensus, and the economic or organizational cost of persuading the network to accept the rewrite.

# Example

This toy chain shows only hash linkage. It has no transaction validation, signatures, peer network, fork choice, or consensus.

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

**What goes wrong**: teams adopt blockchain for internal systems where all parties trust one authority, gaining none of the decentralization benefit while paying the cost in throughput, complexity, and compliance risk. The useful test is structural: identify the writers, validators, dispute process, and party trusted to change the rules. One effective owner removes much of the reason for decentralized consensus.

A conventional database with append-only audit records is the normal fit when one organization controls the writers and can be held accountable. A blockchain earns its cost when independent parties need a common history, cannot appoint one operator, and accept the governance and failure model of the chosen consensus protocol.

## GDPR Conflict with Immutability

Writing personal data to a broadly replicated append-only ledger makes correction, retention limits, and erasure difficult. Even encrypted or hashed values can remain personal data when they can be linked back to an identifiable person.

Keep personal data off-chain where it can be corrected or deleted. An on-chain commitment may prove that off-chain data existed, but the commitment and surrounding metadata still need a data-protection assessment. Hashing does not automatically anonymize a record.

# Tradeoffs

## Consensus Mechanisms

| Mechanism | Sybil-resistance basis | Main operating cost | Trust boundary |
|-----------|-----------|--------|-----------------|
| Proof-of-Work (PoW) | Expenditure on competitive computation | Energy, mining hardware, and probabilistic confirmation | Security depends on honest work outweighing an attacker's work |
| Proof-of-Stake (PoS) | Capital locked under protocol rules | Validator operations, incentive design, and slashing/finality logic | Security depends on stake distribution, client diversity, and social recovery assumptions |
| Permissioned consensus | Membership controlled by an organization or consortium | Identity governance, quorum availability, and member coordination | Validators are known. The membership authority becomes part of the trust model |

PoW and PoS make different economic assumptions. Neither supplies a universal security ranking. A permissioned network trades open participation for governed membership. If that membership authority could operate the ledger directly, a replicated database may expose the same trust more simply.

## Public Vs Private Chains

| Type | Participants | Rewrite resistance | Use when |
| --- | --- | --- | --- |
| Public (Bitcoin, Ethereum) | Permissionless readers and protocol-defined participation | Economic consensus plus widely replicated history | Unknown parties need one public ordering rule |
| Private/Consortium (Hyperledger Fabric) | Known members under a governance agreement | Configured endorsement, ordering, and membership policies | Independent organizations need a shared record and accept consortium governance |
| Traditional DB + audit log | Authorized internal or partner clients | Access control, backups, tamper-evident logs, and operator accountability | One accountable authority is trusted to operate the record |

The decision starts with governance. A central operator points toward a database. A blockchain is a candidate when several independent parties need shared ordering and no single party may own it, but only after its privacy, finality, throughput, and recovery costs are acceptable.

# Limitations for Enterprise Use

- **Capacity and latency:** replication, validation, and finality consume resources that a single database operator does not need to spend.
- **Privacy and retention:** replicated append-only data is hard to confine, correct, or erase. Off-chain storage reduces this conflict but does not remove metadata risk.
- **Governance:** software cannot eliminate decisions about membership, upgrades, emergencies, and dispute resolution.
- **Key loss:** control often follows signing keys. Recovery can require social or governance intervention that the protocol itself does not provide.

# References

- [Bitcoin: A Peer-to-Peer Electronic Cash System](https://bitcoin.org/bitcoin.pdf)
- [Proof-of-stake](https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/)
- [Hyperledger Fabric introduction](https://hyperledger-fabric.readthedocs.io/en/latest/whatis.html)
