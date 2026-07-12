---
topic:
  - Security
subtopic:
  - Security
summary: "Keeping credentials out of source code, distributing them to workloads, and rotating safely."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Secrets Management

A *secret* is any credential that grants access: database connection strings, API keys, signing keys, TLS private keys, OAuth client secrets, cloud-provider credentials. Secrets management is the discipline of keeping these out of source code and build artifacts, distributing them to the workloads that need them, and rotating them — ideally without anyone ever pasting a long-lived secret into a config file. The single most common breach starter is a credential committed to a Git repo; everything here exists to make that impossible.

## The Core Rule: Never Commit Secrets

A secret in Git is compromised the moment it's pushed — and **deleting it in a later commit does not help**, because the value lives forever in the history (and on every clone, fork, and CI cache). The fix is layered:

- **`.gitignore`** every local secret file (`appsettings.*.json` with real values, `.env`, `*.pem`).
- **Pre-commit / push scanning** — tools like `gitleaks`, `trufflehog`, or GitHub **Push Protection** block known secret patterns before they land.
- **Assume-breach on leak** — if a secret reaches history, *rotate it*, don't just rewrite history. Revocation is the only real remediation.

## Where Secrets Should Live Instead

A rough hierarchy from worst to best:

| Approach | Problem / when acceptable |
|---|---|
| Hard-coded in source | Never. Leaks with the code. |
| Config file in the repo | Never for real values; fine for *placeholders*/local dev defaults. |
| Environment variables | Better — keeps secrets out of the image; the [12-Factor](https://12factor.net/config) baseline. But visible to the whole process and child processes, and easily logged. |
| **Dedicated secret store** (Key Vault, AWS Secrets Manager, HashiCorp Vault) | The target state: access-controlled, audited, versioned, rotatable. |
| **Keyless / workload identity** (OIDC federation, managed identity) | Best — *no stored secret at all*; the workload proves its identity to get short-lived tokens. |

## .NET Configuration and User Secrets

ASP.NET Core layers configuration providers; later providers override earlier ones, so a secret store can override checked-in defaults without changing code:

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
> **User Secrets is a dev-only convenience, not encryption.** The file is plain JSON outside the repo; it keeps secrets off Git, nothing more. Production must use a real store.

## Managed Identity / Keyless Auth (the best option)

The strongest pattern removes the bootstrap secret entirely. In Azure, a **managed identity** gives the app an identity the platform vouches for, so `DefaultAzureCredential` fetches a short-lived token to read Key Vault — there's no Key Vault *password* anywhere. The CI equivalent is **OIDC / workload identity federation** (covered in [[CI CD tools|CI/CD tools]]): the pipeline exchanges a job-scoped token with AWS/Azure/GCP instead of holding a static cloud key. The "secret zero" / bootstrapping problem — *how does the app authenticate to the secret store?* — is solved by the platform's identity rather than yet another stored credential.

## Rotation

Secrets must be rotatable on a schedule and *immediately* on suspected compromise. Two models:

- **Static secrets with rotation** — the store holds the value and you rotate it periodically; apps re-read on a cache expiry. Managed stores can rotate some secrets (e.g. database passwords) automatically.
- **Dynamic secrets** — HashiCorp Vault can *generate* short-lived, per-request credentials (a database user that expires in an hour), so a leaked secret is useless almost immediately. This is the gold standard but requires the app to fetch on demand.

## Pitfalls

- **Secret committed then "removed"** — deleting in a later commit leaves it in history forever. Rotate the secret; scrubbing history is cleanup, not remediation.
- **Logging secrets** — connection strings or tokens printed to logs (exception dumps, `Console.WriteLine(config)`, verbose HTTP tracing) leak into log aggregators readable by many. Mask at the source.
- **Baking secrets into Docker images** — `ENV API_KEY=...` in a Dockerfile is permanent and visible in `docker history` (see [[Docker]]). Inject at runtime.
- **Over-broad access** — one shared "god" secret with access to everything. Scope secrets per service and grant least privilege so a single leak has a small blast radius.
- **No rotation plan** — a 5-year-old API key that "can't" be rotated because nobody knows what uses it. Inventory and rotate from day one.
- **Treating Kubernetes Secrets as encrypted** — they're base64-encoded, not encrypted at rest by default (see [[Kubernetes]]). Enable etcd encryption or use an external store via the Secrets Store CSI driver.

## Tradeoffs

| Approach | Security | Operational cost | When |
|---|---|---|---|
| Env vars | Low-medium | Trivial | Local dev, simple containers, 12-factor baseline |
| Managed secret store | High | Low (managed) | Default for cloud apps |
| HashiCorp Vault (dynamic) | Highest | High (run/operate Vault) | Regulated/large orgs, short-lived credentials |
| Keyless / managed identity | Highest (no secret) | Low | Anywhere the platform supports it — prefer it |

**Decision rule**: use the platform's **managed identity / OIDC** wherever it exists so there's no stored secret at all; otherwise put secrets in a **managed store** (Key Vault / Secrets Manager) and inject them at runtime. Reserve plain environment variables for local development and rotate everything on a schedule. Never let a real secret touch source control.

## Questions

> [!QUESTION]- A secret was accidentally committed and pushed. What's the correct response?
> Treat it as compromised and **rotate (revoke + reissue) it immediately** — that's the only real fix, because the value persists in Git history, clones, forks, and CI caches even after you delete it. Rewriting history (e.g. `git filter-repo`) is useful cleanup to stop further exposure, but it does not un-leak a secret that others may already have. Afterward, add push protection / secret scanning so it can't recur.

> [!QUESTION]- What is the "secret zero" (bootstrapping) problem and how is it solved?
> If all your secrets live in a vault, the app still needs *one* credential to authenticate to the vault — secret zero. Storing it just moves the problem. The modern solution is **platform-provided identity**: a managed identity (Azure) / IAM role (AWS) / workload identity (Kubernetes/GCP) that the infrastructure vouches for, letting the workload obtain a short-lived token with no stored secret. CI pipelines do the same via OIDC federation.

> [!QUESTION]- Why are environment variables a weak place to store secrets despite being common?
> They keep secrets out of the image (good, and the 12-factor standard), but the whole process and any child processes can read them, they're easy to leak accidentally (a crash dump, a `printenv` in a build log, an APM that captures env), they aren't audited or versioned, and rotating them means redeploying. A dedicated secret store adds access control, auditing, versioning, and rotation that env vars lack — so env vars are fine for dev but a managed store is better for production.

## References

- [Safe storage of app secrets in development (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) — the Secret Manager tool and configuration layering in ASP.NET Core.
- [Azure Key Vault + managed identity (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/key-vault/general/overview) — keyless access to a managed secret store.
- [The Twelve-Factor App — Config](https://12factor.net/config) — the case for keeping config/secrets in the environment, not the code.
- [HashiCorp Vault — dynamic secrets](https://developer.hashicorp.com/vault/docs/secrets) — generating short-lived, per-request credentials.
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) — practical guidance on storage, rotation, and leak response.
