---
publish: true
created: 2026-10-28T12:27:03.003Z
modified: 2026-10-28T12:27:33.214Z
published: 2026-10-28T12:27:33.214Z
topic:
  - Security
subtopic:
  - Security
summary: Keeping credentials out of source code, distributing them to workloads, and rotating safely.
level:
  - "3"
priority: High
status: Ready to Repeat
qard-deck: Security
qard-topic: Secrets Management
flashcard_uid: f1a26a0e
---

A service needs a credential before it can open a database connection, call an API, or sign a token. Copying that credential into source or an image turns every clone and build artifact into another disclosure path. Replacing it without telling running consumers when to reload can instead cause an outage. Secrets management moves credentials from an issuer or store to an authorized workload, limits how long they remain useful, and removes them after expiry or compromise.

Database passwords, API keys, signing keys, TLS private keys, OAuth client credentials, and cloud credentials all fit this problem. The strongest design avoids a stored bootstrap key: a workload identity exchanges platform evidence for a short-lived token scoped to one service. When a static secret remains necessary, the system still needs to identify who issues it, which workloads receive it, what it permits, how consumers refresh it, and how it is revoked during an incident.

# What Happens After a Secret Reaches Git

A secret pushed to a shared repository is treated as compromised. Deleting the visible line does not revoke copies already present in history, clones, forks, caches, logs, or alerts.

- Local secret files and private-key material stay outside tracked paths. `.gitignore` reduces accidental additions but does not protect a file that is already tracked.
- Scanning runs before commit and again at the hosting boundary. Pattern and entropy scanners reduce exposure time. They cannot prove that a repository contains no secrets.
- The exposed credential is revoked or rotated first. History rewriting can reduce future discovery, but it cannot recall a value another system has already copied.

# How a Workload Receives a Secret

| Approach | Useful property | Failure to handle |
|---|---|---|
| Checked-in placeholder | Documents the configuration key without carrying a credential | Defaults must fail closed and never resemble usable production values |
| Environment variable | Keeps a runtime value out of source and image layers. Matches the [12-Factor](https://12factor.net/config) configuration boundary | Process inspection, child processes, crash dumps, deployment definitions, and logs may expose it |
| Mounted secret file | Separates delivery from the image and can support atomic replacement | File permissions, shared volumes, backup behavior, and application reload semantics |
| Dedicated secret store | Centralizes access policy, audit, versioning, and rotation | The workload still needs a trusted authentication path to the store |
| Workload identity | Replaces a long-lived bootstrap secret with platform-issued evidence and short-lived tokens | Federation policy, subject binding, token audience, and platform control-plane trust become critical |

# .NET Configuration and User Secrets

ASP.NET Core composes configuration providers, with later providers taking precedence. That makes it possible to keep non-secret defaults in source and supply credentials from a development or production provider:

```csharp
// Local development: Secret Manager keeps secrets OUT of the project tree
//   dotnet user-secrets init
//   dotnet user-secrets set "Db:ConnectionString" "Server=...;Password=..."
// Stored in ~/.microsoft/usersecrets/<id>/secrets.json — never in the repo.

// Production: bind a cloud secret store as a configuration source.
builder.Configuration.AddAzureKeyVault(
    new Uri("https://my-vault.vault.azure.net/"),
    new DefaultAzureCredential());   // chain tries environment, workload identity, then managed identity
                                     // managed identity needs no stored secret, but only if enabled on the host

var connectionString = builder.Configuration["Db:ConnectionString"];
```

> [!NOTE]
> Secret Manager is a development convenience, not an encrypted vault. It stores values outside the project tree and reduces accidental source-control exposure. Local account access, backups, logs, and application code can still reveal them.

# Workload Identity and the Bootstrap Problem

The bootstrap problem asks how a workload authenticates to the system that holds its other secrets. Storing a vault password beside the application only moves the problem.

Managed identity lets a cloud platform attest to the workload and issue a short-lived access token. CI systems can use OIDC federation for the same pattern, as described in [[CI CD tools|CI/CD tools]]. There is no application-managed cloud key to distribute, but trust has not disappeared. It has moved into the platform identity, federation rules, token audience, and authorization policy.

# Rotating Without Breaking Consumers

Rotation changes the value accepted by a target while applications may still hold the old one. The issuer, store, delivery channel, target system, and every consumer have to move in a safe order. An incident requires that sequence to run quickly; routine rotation requires it to run without an outage.

- **Static rotation:** a new version is published, the target system accepts both versions during an overlap window, consumers move to the new version, and the old value is then revoked. Consumers need defined refresh behavior.
- **Dynamic credentials:** the issuer creates a credential for one workload or lease and expires it automatically. This narrows reuse and exposure time, but the issuing system and workload-authentication path become runtime dependencies.

Lifetime follows the credential and threat model. Some credentials should last minutes. Hardware-rooted keys may last much longer. What matters is that the old credential can be rejected and consumers have a tested path to the replacement.

# Failure Paths

- **Deletion mistaken for revocation:** removing a committed value leaves copies usable. Revocation comes first and scrubbing later.
- **Secrets in telemetry:** exception dumps, connection strings, HTTP headers, environment snapshots, and support bundles often have wider readership and retention than the source system. Redaction belongs before export.
- **Secrets baked into images:** Dockerfile `ARG` and `ENV` values can remain in build history or metadata. Runtime injection keeps them out of the immutable image. See [[Docker]].
- **Shared administrative credentials:** one credential used by many workloads destroys attribution and widens the compromise radius. Each workload needs its own identity with narrow permissions.
- **Rotation without consumer behavior:** replacing the stored value does nothing if a process caches the old value forever. Refresh, overlap, rollback, and revocation must be exercised together.
- **Kubernetes Secret confused with encryption:** Secret data is base64-encoded for transport in manifests, not encrypted by that encoding. Upstream Kubernetes requires explicit encryption-at-rest configuration for API data or integration with an external store. See [[Kubernetes]].

# Choosing the Delivery Path

| Approach | Security | Operational cost | When |
|---|---|---|---|
| Environment variable | Keeps values out of source and image layers | Weak audit and refresh. Easy to expose through process tooling | Simple runtime injection where the platform offers no better binding |
| Mounted file from a store | File permissions and atomic replacement are available | Application must reload safely. Node storage becomes part of the boundary | Software that already reads credentials from files |
| Managed secret store | Central policy, versions, access logs, rotation integration | Availability, quotas, SDK behavior, and bootstrap identity | Normal cloud application boundary |
| Dynamic credential | Short lifetime and per-workload attribution | Issuer becomes a runtime dependency and the target system must support leases | Databases and services that can create scoped temporary access |
| Workload identity | No application-managed bootstrap key | Federation and platform identity policy carry the trust | Preferred when the platform and target service support it |

Workload identity is preferred when the platform and target service can bind it narrowly. Otherwise, static values stay in a managed store and are delivered at runtime through a channel the application can refresh. Environment variables and mounted files are delivery mechanisms, not systems of record. Any real secret that reaches source control enters incident response.

# Questions

<!-- qard-id: 14923451-815f-46a2-b05a-41a2cb9dd319 -->

> [!qard]- What should happen when a secret is accidentally committed and pushed?
> A pushed secret is treated as compromised. The response replaces and revokes the credential at its issuer, confirms that the old value no longer works, and checks whether it was used. Cleaning the repository comes afterward and is not a fix by itself, because copies that already exist cannot be recalled.
>
> 1. **Assume exposure:** once pushed, the value may already exist in clones, forks, caches, CI logs and notifications. Deleting it from Git does not make it secret again.
> 2. **Rotate and revoke:** a replacement credential is issued, every service that uses the secret moves to it, and the old value is revoked where it is accepted. Until revocation, anyone holding a copy can still use the old value. Revoking before consumers move stops misuse sooner but breaks those consumers, so the window is kept as short as the rollout allows.
> 3. **Verify:** an attempt with the old value is rejected, and the dependent services work with the new one.
> 4. **Investigate:** the issuer's access or audit logs are reviewed for use of the credential while it was exposed.
> 5. **Clean up the repository:** removing the value from current files, and optionally rewriting history, reduces future discovery. Neither step revokes the credential or recalls copies already made.
>
> The common failure is treating deletion as remediation. A later commit that deletes the line leaves the value in history, and the credential stays valid wherever it was copied.
>
> [GitHub: Remediating a leaked secret](https://docs.github.com/en/code-security/tutorials/remediate-leaked-secrets/remediating-a-leaked-secret)

# References

- [Azure Key Vault overview](https://learn.microsoft.com/azure/key-vault/general/overview)
- [HashiCorp Vault secrets engines](https://developer.hashicorp.com/vault/docs/secrets)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
