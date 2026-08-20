---
publish: true
created: 2026-08-20T20:41:15.671Z
modified: 2026-08-20T20:41:15.671Z
published: 2026-08-20T20:41:15.671Z
topic:
  - Security
subtopic:
  - Security
summary: Keeping credentials out of source code, distributing them to workloads, and rotating safely.
level:
  - "3"
priority: High
status: Ready to Repeat
---

A service needs a credential before it can open a database connection, call an API, or sign a token. Copying that credential into source or an image turns every clone and build artifact into another disclosure path. Replacing it without telling running consumers when to reload can instead cause an outage. Secrets management moves credentials from an issuer or store to an authorized workload, limits how long they remain useful, and removes them after expiry or compromise.

Database passwords, API keys, signing keys, TLS private keys, OAuth client credentials, and cloud credentials all fit this problem. The strongest design avoids a stored bootstrap key: a workload identity exchanges platform evidence for a short-lived token scoped to one service. When a static secret remains necessary, the system still needs to identify who issues it, which workloads receive it, what it permits, how consumers refresh it, and how it is revoked during an incident.

# What Happens After a Secret Reaches Git

A secret pushed to a shared repository is treated as compromised. Deleting the visible line does not revoke copies already present in history, clones, forks, caches, logs, or alerts.

- Keep local secret files and private-key material outside tracked paths. `.gitignore` reduces accidental additions but does not protect a file that is already tracked.
- Scan before commit and again at the hosting boundary. Pattern and entropy scanners reduce exposure time. They cannot prove that a repository contains no secrets.
- Revoke or rotate the exposed credential first. History rewriting can reduce future discovery, but it cannot recall a value another system has already copied.

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
    new DefaultAzureCredential());   // uses managed identity in Azure — no secret to store

var connectionString = builder.Configuration["Db:ConnectionString"];
```

> [!NOTE]
> Secret Manager is a development convenience, not an encrypted vault. It stores values outside the project tree and reduces accidental source-control exposure. Local account access, backups, logs, and application code can still reveal them.

# Workload Identity and the Bootstrap Problem

The bootstrap problem asks how a workload authenticates to the system that holds its other secrets. Storing a vault password beside the application only moves the problem.

Managed identity lets a cloud platform attest to the workload and issue a short-lived access token. CI systems can use OIDC federation for the same pattern, as described in [[CI CD tools|CI/CD tools]]. There is no application-managed cloud key to distribute, but trust has not disappeared. It has moved into the platform identity, federation rules, token audience, and authorization policy.

# Rotating Without Breaking Consumers

Rotation changes the value accepted by a target while applications may still hold the old one. The issuer, store, delivery channel, target system, and every consumer have to move in a safe order. An incident requires that sequence to run quickly; routine rotation requires it to run without an outage.

- **Static rotation:** publish a new version, allow an overlap window where the target system accepts both versions, move consumers, then revoke the old value. Consumers need defined refresh behavior.
- **Dynamic credentials:** issue a credential for one workload or lease and expire it automatically. This narrows reuse and exposure time, but the issuing system and workload-authentication path become runtime dependencies.

Lifetime follows the credential and threat model. Some credentials should last minutes. Hardware-rooted keys may last much longer. What matters is that the old credential can be rejected and consumers have a tested path to the replacement.

# Failure Paths

- **Deletion mistaken for revocation:** removing a committed value leaves copies usable. Revoke first. Scrub later.
- **Secrets in telemetry:** exception dumps, connection strings, HTTP headers, environment snapshots, and support bundles often have wider readership and retention than the source system. Redaction belongs before export.
- **Secrets baked into images:** Dockerfile `ARG` and `ENV` values can remain in build history or metadata. Runtime injection keeps them out of the immutable image. See [[Docker]].
- **Shared administrative credentials:** one credential used by many workloads destroys attribution and widens the compromise radius. Issue separate identities with narrow permissions.
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

Prefer workload identity when the platform and target service can bind it narrowly. Otherwise keep static values in a managed store and deliver them at runtime through a channel the application can refresh. Environment variables and mounted files are delivery mechanisms, not systems of record. Any real secret that reaches source control enters incident response.

# Questions

> [!QUESTION]- What should happen when a secret is accidentally committed and pushed?
> Treat the secret as compromised and revoke or rotate it immediately. Update the affected workloads through the normal secret-delivery path, then verify that the old value is rejected. Check access logs and usage for signs of abuse. Removing the value from the current file and rewriting repository history can reduce future exposure, but neither action replaces revocation because copies may already exist in clones, caches, logs, or alerts.

# References

- [Azure Key Vault overview](https://learn.microsoft.com/azure/key-vault/general/overview)
- [HashiCorp Vault secrets engines](https://developer.hashicorp.com/vault/docs/secrets)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
