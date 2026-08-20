---
topic:
  - Data Persistence
subtopic: []
summary: "How object keys, metadata, HTTP APIs, multipart writes, and lifecycle tiers shape storage design."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

Object storage keeps bytes and metadata under one key inside a bucket or container. Applications put, get, list, copy, or delete whole objects through an API. They do not manage disk blocks or depend on shared filesystem locking. The contract fits large values that are usually replaced as a unit, including media, backups, build artifacts, and data-lake files.

A key such as `customers/42/invoices/2026-07.pdf` looks hierarchical, but its slashes normally belong to a flat key. Clients create the folder view by listing a prefix. Renaming that apparent directory usually means copying and deleting every matching object, not changing one directory entry.

# Per-Key Atomicity and Consistency

An object write supplies bytes and metadata such as content type, checksum, or retention policy. In Amazon S3, a successful `PUT` replaces one key atomically: readers see the old object or the new one. That guarantee stops at the key boundary. Publishing a data-set version across many keys needs an application protocol, such as immutable versioned objects followed by one manifest-pointer update.

Consistency depends on the provider and API. Amazon S3 currently gives strong read-after-write consistency for object `PUT`, overwrite, `DELETE`, `GET`, and `LIST`. The old rule that every object store is eventually consistent is too broad. Cross-region replication, caches, event delivery, and application indexes still carry their own delay.

Object storage loses to other contracts when the application needs:

- low-latency random overwrites inside a database page or virtual disk: use block storage.
- shared POSIX paths, file locks, and in-place edits: use a file service.
- multi-record constraints, joins, or transactional queries over metadata: keep that state in a database and store only the large payload in the object store.

# Multipart Write Example

Consider an 8 GiB video uploaded over an unreliable link. A single request that fails at 7.9 GiB starts over. Multipart upload can split the video into 128 parts of 64 MiB, send several at once, and retry only the failed part. The application keeps the upload ID until completion assembles those parts into one object.

That retry advantage creates cleanup work. S3 does not automatically expire an initiated upload, and its uploaded parts incur storage charges until completion or abort. A bucket lifecycle rule should remove abandoned uploads after the recovery window. Clients should attach and verify checksums rather than treating a successful transport response as end-to-end integrity proof.

# Lifecycle Tiers and Use Cases

Lifecycle rules can move eligible objects to colder tiers, expire obsolete versions, and abort abandoned multipart uploads. Minimum storage durations, retrieval charges, and restore delay remain part of the application design. Durable bytes that take hours to restore do not satisfy a 15-minute recovery-time objective.

The common use cases are conditions, not blanket recommendations:

| Use case | Why object storage fits | Condition that can flip the choice |
| --- | --- | --- |
| Archive and compliance records | Cheap durable capacity, retention controls, lifecycle tiers | Restore latency or regulatory query requirements demand an indexed active store |
| Images, audio, video, documents | Whole-object delivery through HTTP/CDN. Metadata travels with the payload | Collaborative in-place editing needs a file abstraction |
| Cloud-native assets and artifacts | API access, independent scaling, signed URLs | A hot write-ahead log needs lower-latency block storage |
| Data lake | Open file formats and large parallel scans | Tiny files create request and listing overhead. Compaction becomes mandatory |
| IoT history | Raw batches can be retained cheaply for later analytics | Live time-window queries belong in a time-series or streaming system |
| Backup and recovery | Versioned immutable copies can be isolated from the primary system | Recovery objectives require a warm replica in addition to object backups |

# References

- [Amazon S3 User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
