---
publish: true
created: 2026-07-16T07:57:59.340Z
modified: 2026-07-16T08:10:34.169Z
published: 2026-07-16T08:10:34.169Z
topic:
  - Data Persistence
subtopic: []
summary: How object keys, metadata, HTTP APIs, multipart writes, and lifecycle tiers shape storage design.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Object Storage

Object storage keeps an opaque byte sequence, a key, and metadata as one addressable object inside a bucket or container. Applications use an API to put, get, list, copy, and delete objects; they do not mount raw blocks or edit arbitrary filesystem sectors. Reach for it when data is large, mostly replaced as a whole, and must outgrow one machine: media, backups, build artifacts, logs, and data-lake files are typical fits.

A key such as `customers/42/invoices/2026-07.pdf` looks hierarchical, but in a conventional object bucket the slashes are part of a flat key. Clients create the folder view by listing a prefix. That distinction matters when renaming a "directory": the application generally copies and deletes every matching object rather than changing one directory entry.

## Access Contract

An object write supplies bytes plus system and application metadata such as content type, checksum, encryption parameters, retention policy, or domain tags. A successful `PUT` replaces the value at one key atomically in Amazon S3: readers see the old object or the new object, not half of either. That single-key guarantee does not make a set of keys one transaction. Publishing a data-set version therefore needs an application protocol, for example immutable versioned keys followed by one manifest pointer update.

Consistency is provider and API specific. Amazon S3 currently gives strong read-after-write consistency for object `PUT`, overwrite, `DELETE`, `GET`, and `LIST`; older advice that every object store is eventually consistent is too broad. Cross-region replication, caches, event notifications, and an application's own index still have separate freshness boundaries.

Object storage loses to other contracts when the application needs:

- low-latency random overwrites inside a database page or virtual disk: use block storage;
- shared POSIX paths, file locks, and in-place edits: use a file service;
- multi-record constraints, joins, or transactional queries over metadata: keep that state in a database and store only the large payload in the object store.

## Multipart Write Example

Consider an 8 GiB video uploaded over an unreliable link. A single request that fails at 7.9 GiB has to restart the whole transfer. A multipart upload can divide it into 128 parts of 64 MiB, upload several parts in parallel, and retry only a failed part. Completion assembles the parts into one object; until then the application must retain the upload ID.

The failure boundary shifts to lifecycle management. An initiated upload does not expire automatically in S3, and uploaded parts continue to incur storage charges until the client completes or aborts it. A bucket lifecycle rule should remove incomplete multipart uploads after the recovery window. The client should also attach and verify checksums instead of treating a successful transport response as end-to-end integrity proof.

## Lifecycle Tiers and Use Cases

Lifecycle rules can transition eligible objects from a frequent-access class to colder, cheaper tiers, expire obsolete versions, or abort abandoned multipart uploads. The application must account for minimum storage durations, retrieval charges, and restore delay. A backup that takes hours to restore cannot satisfy a 15-minute recovery-time objective merely because its bytes are durable.

The common use cases are conditions, not blanket recommendations:

| Use case | Why object storage fits | Condition that can flip the choice |
| --- | --- | --- |
| Archive and compliance records | Cheap durable capacity, retention controls, lifecycle tiers | Restore latency or regulatory query requirements demand an indexed active store |
| Images, audio, video, documents | Whole-object delivery through HTTP/CDN; metadata travels with the payload | Collaborative in-place editing needs a file abstraction |
| Cloud-native assets and artifacts | API access, independent scaling, signed URLs | A hot write-ahead log needs lower-latency block storage |
| Data lake | Open file formats and large parallel scans | Tiny files create request and listing overhead; compaction becomes mandatory |
| IoT history | Raw batches can be retained cheaply for later analytics | Live time-window queries belong in a time-series or streaming system |
| Backup and recovery | Versioned immutable copies can be isolated from the primary system | Recovery objectives require a warm replica in addition to object backups |

## References

- [What is Amazon S3?](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) — official object, bucket, key, metadata, API, and strong-consistency contract.
- [Uploading objects with multipart upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html) — defines initiation, part upload, completion, retry, checksum, and abandoned-upload behavior.
- [Managing the lifecycle of objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) — documents transitions, expiration, version handling, and incomplete multipart cleanup.
- [Top 6 use cases of object stores (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/explain-the-top-6-use-cases-of-object-stores.md) — source use-case inventory and imported diagram, narrowed here by the access and recovery conditions that can disqualify object storage.
