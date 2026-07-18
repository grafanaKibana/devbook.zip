---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Consistent hashing limits key remapping when membership changes, while virtual nodes improve balance without solving replication or hot keys."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

Consistent hashing maps both nodes and keys into the same circular hash space. A key belongs to the first node clockwise from its position. When membership changes, only the adjacent ranges move instead of recomputing every key with `hash(key) % node_count`.

# Exact Remapping Example

Use a ring from 0 to 99 with nodes `A=20`, `B=50`, and `C=80`:

| Key position | Owner before join |
| --- | --- |
| 10 | A |
| 30 | B |
| 60 | C |
| 90 | A after wrap-around |

Add node `D=40`. Only keys in `(20, 40]` move from B to D, so key 30 moves while 10, 60, and 90 stay put. If `N` equally loaded nodes exist before the join, the new node receives an expected `1 / (N + 1)` of all keys. Removing one node from a ring of `N` equally loaded nodes moves its expected `1 / N` share to its clockwise successor or replica owners. Small samples, uneven token placement, and weighted nodes change the observed fraction.

![[Software Architecture/Software Architecture-Consistent Hashing-18120000.png]]

The visual illustrates clockwise ownership and a new node taking one range. It does not define replication, failure detection, or how concurrent membership views converge.

# Virtual Nodes and Capacity

Assign many independently hashed tokens to each physical node. This spreads a node across the ring, reduces variance, and lets a larger node own more tokens. Token count is an operational choice: more tokens improve balance but enlarge routing metadata and recovery fan-out.

Consistent hashing does not split a hot key, guarantee uniform application traffic, or protect data. Replicate each range under an explicit policy, version the membership map, and move ranges with a handoff protocol that prevents reads from falling between old and new owners.

Use rendezvous hashing when selecting the highest-scoring nodes for a key is simpler than maintaining a ring. Both approaches need the same membership and replication discipline.

# References

- [Consistent hashing and random trees](https://doi.org/10.1145/258533.258660) — original paper defining consistent hashing and bounded remapping under membership changes.
- [Dynamo: Amazon's highly available key-value store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) — primary design using consistent hashing, virtual nodes, replication, and preference lists.
- [ByteByteGo: consistent hashing](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/consistent-hashing.md) — provenance for the ring and clockwise key-placement visual.
