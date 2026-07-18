---
publish: true
created: 2026-07-16T08:23:58.021Z
modified: 2026-07-16T08:28:56.887Z
published: 2026-07-16T08:28:56.887Z
topic:
  - Security
subtopic:
  - Security
summary: Controls sensitive data from collection through deletion by attaching purpose, access, retention, and incident rules to each class.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Sensitive Data

Sensitive data is information whose disclosure, alteration, loss, or misuse would harm a person or the organization. The label includes personal, health, financial, authentication, legal, and intellectual-property data, but the control comes from classification: a field needs an owner, purpose, allowed consumers, retention period, and deletion path before it enters the system.

## Classify Before Choosing Controls

A useful scheme is small enough that engineers apply it consistently:

| Class | Example | Access and handling | Failure to design for |
| --- | --- | --- | --- |
| Public | Published product documentation | Integrity and availability controls | An attacker publishes altered instructions |
| Internal | Non-public runbook | Workforce access and normal retention | Operational details aid reconnaissance |
| Confidential | Customer email or contract | Need-to-know access, encryption, redacted logs | A support export exposes customer records |
| Restricted | Password verifier, payment token, health record | Narrow service identity, managed keys, explicit audit and deletion | One compromised workload exposes regulated or reusable credentials |

Classification is not a substitute for legal review. Data location, data-subject rights, contractual promises, sector rules, and cross-border transfers can change the required purpose, retention, and incident process.

## Lifecycle Controls

```mermaid
flowchart LR
    A["Inventory and classify"] --> B["Minimize collection"]
    B --> C["Protect use and storage"]
    C --> D["Share only for purpose"]
    D --> E["Expire and delete"]
    E --> F["Verify deletion and recovery"]
```

1. **Collect:** take only fields tied to an explicit purpose. Do not collect a date of birth when an age-band result is sufficient.
2. **Store:** encrypt confidential data with managed keys, separate key administration from data administration, and use envelope encryption when independent key rotation matters.
3. **Use:** authorize the exact record and operation. A support role that can view contact details should not automatically see payment tokens.
4. **Move:** require TLS, authenticate both endpoints where appropriate, constrain exports, and keep third-party processors inside the same purpose and retention contract.
5. **Observe:** log access decisions and record identifiers, not secrets or full payloads. Redact structured fields before they reach logs, traces, analytics, crash reports, or support tickets.
6. **Retain and delete:** enforce expiry in primary stores, indexes, caches, data lakes, and derived exports. Define how backups age out rather than claiming immediate erasure from immutable recovery media.
7. **Respond:** know which data class and subjects were affected, revoke access, rotate exposed keys or tokens, preserve evidence, and follow the jurisdiction-specific notification process.

## Transformations Change Different Boundaries

- **Encryption** is reversible with a key. It protects confidentiality against storage or transport exposure but not against a workload that is authorized to decrypt.
- **Tokenization** replaces a value with a token and moves the sensitive mapping into a vault. It can reduce the number of systems that handle the original value, but the vault and detokenization API become concentrated targets.
- **Pseudonymization** replaces direct identifiers while retaining a relinking path. The data remains sensitive when another dataset or key can re-identify people.
- **Anonymization** aims to make re-identification no longer reasonably possible. Removing names alone is not enough; rare combinations and external datasets can identify a person.

For example, an analytics job does not need raw card numbers. A payment service can retain the provider token, publish a non-sensitive transaction identifier, and deny the analytics identity any detokenization permission. Encrypting the same raw card column would still expose it whenever that job receives the decryption key.

## References

- [ByteByteGo — Managing Sensitive Data](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-manage-sensitive-data-in-a-system.md) — the pinned source inventory; its cryptography visual is intentionally replaced by the lifecycle model above.
- [NIST Privacy Framework 1.0](https://www.nist.gov/privacy-framework/privacy-framework) — a risk-based framework for data processing, governance, control, communication, and protection.
- [NIST SP 800-122 — Protecting the Confidentiality of PII](https://csrc.nist.gov/pubs/sp/800/122/final) — impact-based PII identification and safeguards.
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) — data minimization, encryption placement, algorithms, and key-management boundaries.
