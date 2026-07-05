---
publish: true
created: 2026-07-05T10:54:07.994+03:00
modified: 2026-07-05T15:49:32.092+03:00
---

# Infrastructure as Code

Infrastructure as Code (IaC) is the practice of defining and provisioning infrastructure — VMs, networks, databases, load balancers, DNS, Kubernetes clusters — through **machine-readable definition files kept in version control**, rather than clicking through a cloud console. The infrastructure becomes reviewable, repeatable, and auditable like application code: the same environment can be stood up identically in dev, staging, and prod, and torn down and recreated on demand. It is a foundational DevOps practice and the antidote to "it works because someone configured the server by hand two years ago."

## Why IaC

- **Reproducibility** — the definition _is_ the environment; spin up an identical stack anywhere, every time.
- **Version control** — infrastructure changes go through Git: diffs, code review, blame, and rollback to a known-good state.
- **Eliminates configuration drift** — manual console tweaks ("snowflake servers") diverge from documented state; IaC re-asserts the declared state.
- **Disaster recovery & scale** — recreate a region from code; provision 100 identical nodes from one definition.
- **Documentation by definition** — the code is the always-current source of truth for what exists.

## Declarative vs Imperative

The central distinction in IaC tools:

- **Declarative ("what")** — you describe the _desired end state_ and the tool figures out the steps to reach it, creating/updating/deleting to converge. Idempotent: applying twice yields the same result. **Terraform, Bicep, CloudFormation, Pulumi, Kubernetes manifests** are declarative.
- **Imperative ("how")** — you write the _sequence of commands_ to execute (a bash script of `az`/`aws` CLI calls). Flexible but not idempotent and hard to reason about as it grows.

Declarative is the modern default because **idempotency** and a computed diff (plan) make changes safe and predictable.

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

Declarative tools track what they've created in a **state file** that maps your code to real cloud resources. The workflow:

1. **Plan** — diff desired config against current state → a preview of what will be created/changed/destroyed. The safety gate; review it like a PR.
2. **Apply** — execute the plan; update state.

State is the crux of Terraform-style tools (Bicep/ARM and CloudFormation keep state on the provider side instead). Mismanaged state is the most common source of IaC pain:

- **Remote, locked state** — store state in a shared backend (S3 + DynamoDB lock, Terraform Cloud, Azure Storage) so a team doesn't corrupt it with concurrent applies. Never commit `terraform.tfstate` to Git — it contains resource details and sometimes secrets.
- **Drift** — if someone changes a resource in the console, real state diverges from the file; the next plan shows the drift so you can re-converge.

## The Tool Landscape

| Tool | Scope | Language | Notes |
|---|---|---|---|
| **Terraform / OpenTofu** | Multi-cloud | HCL (declarative) | The de-facto standard; huge provider ecosystem. OpenTofu is the open-source fork after the licence change. |
| **Bicep** | Azure | DSL → ARM | Azure-native, no state file to manage (state lives in Azure). |
| **AWS CloudFormation / CDK** | AWS | YAML / real languages (CDK) | AWS-native; CDK lets you author in TypeScript/C#/Python. |
| **Pulumi** | Multi-cloud | Real languages (C#, TS, Python, Go) | Declarative model authored in general-purpose code. |
| **Ansible** | Config mgmt | YAML | More config management than provisioning; often paired with the above. |

> [!NOTE]
> **Provisioning vs configuration management.** Terraform/Bicep _provision_ infrastructure (create the VM, network, DB). Tools like Ansible/Chef/Puppet _configure_ what's inside (install packages, set files). They're complementary — provision with one, configure with the other — though containers + Kubernetes increasingly fold configuration into immutable images.

## Pitfalls

- **Committing state or secrets** — the state file can contain plaintext secrets and full resource maps; keep it in a locked remote backend, never in Git. Don't hard-code secrets in IaC — reference a [[Secrets Management|secret store]].
- **Manual console changes ("ClickOps")** — editing resources by hand creates drift the code doesn't know about; a later apply may revert or conflict. Make _all_ changes through code.
- **No state locking** — two engineers applying at once corrupt shared state. Use a backend with locking.
- **Giant monolithic stacks** — one state file for everything makes every change slow and risky. Split by lifecycle/blast-radius (network vs app vs data) and compose with modules.
- **No plan review** — applying without reading the plan can silently destroy/recreate a database. Treat the plan as a mandatory review gate, ideally in [[CI CD tools|CI]].
- **Hand-rolled credentials in CI** — authenticate the pipeline to the cloud with **OIDC/workload identity**, not a long-lived stored key.

## Tradeoffs

| | IaC | Manual / ClickOps |
|---|---|---|
| Reproducibility | High (identical every time) | Low (snowflakes, drift) |
| Speed (first time) | Slower (write definitions) | Faster to click once |
| Speed (repeat/scale) | Near-instant, N copies | Slow, error-prone |
| Auditability | Full (Git history, plan) | None |
| Learning curve | Real (HCL, state, modules) | None |

**Decision rule**: use IaC for anything beyond a throwaway experiment — the reproducibility, review, and drift-elimination pay for themselves the first time you rebuild an environment. Choose **Terraform/OpenTofu** for multi-cloud or tool portability, **Bicep/CloudFormation** when you're all-in on one provider and want native integration with no state file to babysit, and **Pulumi/CDK** when you'd rather author infrastructure in a general-purpose language. Always keep state remote and locked, run `plan` in CI, and make every change through code.

## Questions

> [!QUESTION]- What is the difference between declarative and imperative IaC?
> **Declarative** IaC describes the _desired end state_ (e.g. "an S3 bucket named X exists") and the tool computes and executes whatever create/update/delete actions converge reality to that state — it's idempotent, so re-applying is safe. **Imperative** IaC specifies the _exact sequence of commands_ to run (a CLI script); it's flexible but not idempotent and gets brittle as it grows. Modern tools (Terraform, Bicep, CloudFormation) are declarative precisely because the computed diff (plan) and idempotency make changes predictable and reviewable.

> [!QUESTION]- Why is the Terraform state file important, and how should it be managed?
> The state file is Terraform's record of which real cloud resources correspond to your code; it's how `plan` computes a diff and how `apply` knows what already exists. If it's lost or corrupted, Terraform can't map config to reality and may try to recreate or orphan resources. Manage it in a **remote, locked backend** (S3 + DynamoDB, Terraform Cloud, Azure Storage) so the team shares one source of truth and concurrent applies can't corrupt it — and never commit it to Git, because it can contain secrets and full resource details.

> [!QUESTION]- What is configuration drift and how does IaC address it?
> Drift is when the real infrastructure diverges from the declared definition — usually because someone changed a resource manually in the console. It's dangerous because the documented state no longer matches reality, so deployments behave unpredictably. IaC addresses it by making the code the single source of truth: `plan` surfaces the difference between declared and actual state, and `apply` re-converges the infrastructure back to the definition. The discipline that makes this work is forbidding manual changes — _all_ changes go through the code.

## References

- [What is Infrastructure as Code? (Microsoft Learn / DevOps)](https://learn.microsoft.com/en-us/devops/deliver/what-is-infrastructure-as-code) — concepts, declarative vs imperative, drift.
- [Terraform documentation (HashiCorp)](https://developer.hashicorp.com/terraform/intro) — state, plan/apply, modules, providers.
- [Bicep documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview) — Azure-native declarative IaC.
- [Pulumi documentation](https://www.pulumi.com/docs/) — IaC in general-purpose languages.
- [OpenTofu](https://opentofu.org/) — the open-source Terraform fork and its governance.
