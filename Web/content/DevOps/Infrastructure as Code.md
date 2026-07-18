---
publish: true
created: 2026-07-11T21:47:11.231Z
modified: 2026-07-17T05:54:48.313Z
published: 2026-07-17T05:54:48.313Z
topic:
  - DevOps
subtopic: []
summary: Provisioning infrastructure through version-controlled files, making environments repeatable and auditable.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

Infrastructure as Code (IaC) defines infrastructure—VMs, networks, databases, load balancers, DNS, and clusters—in version-controlled machine-readable files. That makes intended changes reviewable and repeatable within the declared inputs, provider version, credentials, quotas, and external service state. It does not make development and production identical: regions, data, capacity, policy, and provider-side defaults can still differ.

## Why IaC

- **Bounded reproducibility** — the definition records intended resources and inputs; lock providers and modules, then verify plans because external APIs, defaults, quotas, and existing data still affect the result.
- **Version control** — infrastructure changes go through Git: diffs, code review, blame, and rollback to a known-good state.
- **Surfaces and repairs drift** — refresh and plan can reveal supported out-of-band changes; apply can reconcile declared fields, but ignored attributes, external systems, and provider limitations remain.
- **Disaster recovery and scale** — definitions can recreate managed resources and repeated node shapes, provided data recovery, secrets, regional dependencies, and capacity are handled separately.
- **Documentation by definition** — the code is the always-current source of truth for what exists.

## Declarative vs Imperative

The central distinction in IaC tools:

- **Declarative ("what")** — you describe the desired end state and the tool computes create/update/delete operations to converge. Reapplying is intended to produce no change when inputs and observed external state are unchanged, but provider side effects, unknown values, and non-idempotent APIs can still violate that expectation. **Terraform, Bicep, CloudFormation, Pulumi, and Kubernetes manifests** use declarative models.
- **Imperative ("how")** — you write the sequence of commands to execute. An imperative program can be idempotent when it checks and converges state explicitly, but that behavior is the program author's responsibility rather than a property of the syntax.

Declarative tools are a useful default because a computed diff makes intended actions inspectable. A plan reduces surprise; it does not make replacement, deletion, or provider behavior automatically safe.

```hcl
# Terraform (declarative): describe the desired resource; Terraform computes the actions
resource "aws_s3_bucket" "assets" {
  bucket = "myapp-assets-prod"
  tags   = { Environment = "prod" }
}
```

```bicep
// Bicep (declarative, Azure-native): same idea, transpiles to ARM JSON
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'myappassetsprod'
  location: resourceGroup().location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}
```

## State and the Plan/Apply Loop

Terraform first refreshes its view of remote objects, builds a dependency graph from configuration and provider relationships, and produces a plan. Review that plan as an executable change set: replacements, deletes, and provider-version changes deserve explicit attention. Apply the saved plan, not a freshly recomputed one, when the approval must bind to exact operations.

Store state in a remote backend with encryption, access control, versioning, and locking. State is operational data and can contain secrets; it is not ordinary source code. If an apply is interrupted, inspect the real resource and state before retrying. Use `import`, `state mv`, or provider-specific recovery only after backing up state. Never “fix” drift by editing the state JSON by hand.

![[Assets/System Design 101/2a1a0f16507f0b03cd0a5bc0ace96681a01eeec3f6632c4d0385bdac95ab5c12.png]]

Declarative tools track what they've created in a **state file** that maps your code to real cloud resources. The workflow:

1. **Plan** — diff desired config against current state → a preview of what will be created/changed/destroyed. The safety gate; review it like a PR.
2. **Apply** — execute the plan; update state.

State is the crux of Terraform-style tools (Bicep/ARM and CloudFormation keep state on the provider side instead). Mismanaged state is the most common source of IaC pain:

- **Remote, locked state** — store state in a shared backend with access control, versioning, and supported locking. For Terraform's S3 backend, set `use_lockfile = true`; DynamoDB-based locking is deprecated. Never commit `terraform.tfstate` to Git because it contains resource details and can contain secrets.
- **Drift** — if someone changes a resource in the console, real state diverges from the file; the next plan shows the drift so you can re-converge.

## The Tool Landscape

| Tool | Scope | Language | Notes |
|---|---|---|---|
| **Terraform / OpenTofu** | Multi-cloud | HCL (declarative) | Broad provider coverage; verify provider maturity for each required resource. OpenTofu is an independently governed fork. |
| **Bicep** | Azure | DSL → ARM | Azure-native, no state file to manage (state lives in Azure). |
| **AWS CloudFormation / CDK** | AWS | YAML / real languages (CDK) | AWS-native; CDK lets you author in TypeScript/C#/Python. |
| **Pulumi** | Multi-cloud | Real languages (C#, TS, Python, Go) | Declarative model authored in general-purpose code. |
| **Ansible** | Config mgmt | YAML | More config management than provisioning; often paired with the above. |

> [!NOTE]
> **Provisioning vs configuration management.** Terraform/Bicep _provision_ infrastructure (create the VM, network, DB). Tools like Ansible/Chef/Puppet _configure_ what's inside (install packages, set files). They're complementary — provision with one, configure with the other — though containers + Kubernetes increasingly fold configuration into immutable images.

## Provisioning, Configuration, Orchestration, and GitOps

| Boundary | Declared result | Typical failure | Decision rule |
| --- | --- | --- | --- |
| Image build | Versioned application plus runtime filesystem | Mutable or unscanned artifact | Build once and address by digest |
| Provisioning | Networks, clusters, databases, identities | Drift or destructive replacement | Require a reviewed plan |
| Machine configuration | Packages, files, and services converge on hosts | Snowflake hosts or non-idempotent runs | Prefer immutable images when replacement is cheap |
| Orchestration | Runtime units are scheduled and reconciled | Readiness, capacity, or lifecycle mismatch | Use it only for long-running runtime state |
| Application configuration | Environment-specific values reach the process | Secret leakage or staging/production drift | Validate schema and inject at runtime |
| GitOps | A controller continuously reconciles declared cluster state | Bad Git state propagates automatically | Protect the repository and define emergency reconciliation controls |

Tools overlap, so classify the state they own before choosing one. Terraform can configure bootstrap data, Kubernetes can provision cloud resources through controllers, and Ansible can create resources, but overlapping ownership creates competing reconcilers. One resource should have one authoritative controller.

![[Assets/System Design 101/203c7f1d0a6b3d00a4748c5334399f9d20b32194e8e766300bfc7a23313485df.png]]

## Pitfalls

- **Committing state or secrets** — the state file can contain plaintext secrets and full resource maps; keep it in a locked remote backend, never in Git. Don't hard-code secrets in IaC — reference a [[Security/Secrets Management|secret store]].
- **Manual console changes ("ClickOps")** — editing resources by hand creates drift the code doesn't know about; a later apply may revert or conflict. Make _all_ changes through code.
- **No state locking** — two engineers applying at once corrupt shared state. Use a backend with locking.
- **Giant monolithic stacks** — one state file for everything makes every change slow and risky. Split by lifecycle/blast-radius (network vs app vs data) and compose with modules.
- **No plan review** — applying without reading the plan can silently destroy/recreate a database. Treat the plan as a mandatory review gate, ideally in [[DevOps/CI CD tools|CI]].
- **Hand-rolled credentials in CI** — authenticate the pipeline to the cloud with **OIDC/workload identity**, not a long-lived stored key.

## Tradeoffs

| | IaC | Manual / ClickOps |
|---|---|---|
| Reproducibility | High for declared inputs and supported resources; external state still matters | Low when changes are undocumented |
| Speed (first time) | Slower (write definitions) | Faster to click once |
| Speed (repeat/scale) | Automated, but bounded by provider operations and dependencies | Manual effort grows with copies |
| Auditability | Full (Git history, plan) | None |
| Learning curve | Real (HCL, state, modules) | None |

**Decision rule**: use IaC for shared or long-lived infrastructure where review, repeatability, and recovery justify maintaining definitions and state. Choose the tool from provider/resource coverage, state and policy model, language, operator skill, and lifecycle ownership. Keep Terraform state remote and locked, review a saved plan when approval must bind to exact actions, and route emergency console changes back into code after the incident.

## Questions

> [!QUESTION]- What is the difference between declarative and imperative IaC?
> **Declarative** IaC describes the desired end state and computes a diff. Reapplying should be a no-op only when inputs and observed external state are unchanged and the provider implements the operation safely. **Imperative** IaC specifies commands; it can still be idempotent when the program checks and converges state explicitly. The practical advantage of declarative tooling is an inspectable model and plan, not an unconditional safety guarantee.

> [!QUESTION]- Why is the Terraform state file important, and how should it be managed?
> The state file maps Terraform resource addresses to remote objects and stored attributes. If it is lost or corrupted, planning and ownership become unsafe. Use a remote backend with access control, versioning, and supported locking. For the S3 backend, enable `use_lockfile`; DynamoDB locking is deprecated. Never commit state to Git because it can contain secrets and full resource details.

> [!QUESTION]- What is configuration drift and how does IaC address it?
> Drift is when observed infrastructure differs from the declared definition. Refresh and plan can surface drift for attributes the provider reads and manages; apply can reconcile those fields. Ignored attributes, external systems, provider defaults, and emergency changes still require explicit handling, so IaC bounds drift rather than proving none exists.

## References

- [What is Infrastructure as Code? (Microsoft Learn / DevOps)](https://learn.microsoft.com/en-us/devops/deliver/what-is-infrastructure-as-code) — concepts, declarative vs imperative, drift.
- [Terraform documentation (HashiCorp)](https://developer.hashicorp.com/terraform/intro) — state, plan/apply, modules, providers.
- [Bicep documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview) — Azure-native declarative IaC.
- [Pulumi documentation](https://www.pulumi.com/docs/) — IaC in general-purpose languages.
- [OpenTofu](https://opentofu.org/) — the open-source Terraform fork and its governance.
- [Terraform state](https://developer.hashicorp.com/terraform/language/state) — official state purpose, storage, and operational cautions.
- [Terraform saved plans](https://developer.hashicorp.com/terraform/cli/commands/plan#out-filename) — official workflow for binding review to a specific apply input.
- [Terraform S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3) — primary configuration for S3 state locking with `use_lockfile` and the deprecation notice for DynamoDB-based locking.
- [OpenGitOps principles](https://opengitops.dev/) — vendor-neutral declarative, versioned, pulled, and continuously reconciled GitOps contract.
- [ByteByteGo: IaC landscape](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/a-cheatsheet-on-infrastructure-as-code-landscape.md) — source contribution for the tool-boundary map.
- [ByteByteGo: configuration management](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-manage-configurations-in-a-system.md) — source contribution for ownership boundaries; its visual was rejected by the audit.
- [ByteByteGo: Terraform plan/apply](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-terraform-turn-code-into-cloud.md) — source contribution for state, drift, and recovery.
