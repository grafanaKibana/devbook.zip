---
topic:
  - DevOps
subtopic: []
summary: "Provisioning infrastructure through version-controlled files, making environments repeatable and auditable."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

Infrastructure as Code (IaC) records intended infrastructure in version-controlled definitions. A tool compares that desired state with observed resources, proposes create, update, replace, or delete operations, then applies the approved change. The definition makes intent reviewable; provider behavior, credentials, quotas, existing data, and regional capacity still affect the result.

# Desired State and the Plan/Apply Loop

Declarative IaC describes the end state. The tool computes the path from the current state. Imperative automation specifies the steps itself. Both can be repeatable, but declarative tools make the proposed difference an explicit artifact for review.

This Terraform fragment is for field recognition, not production use:

```hcl
resource "aws_s3_bucket" "assets" {
  bucket = "myapp-assets-prod"

  tags = {
    Environment = "prod"
  }
}
```

`resource` declares both a provider type and a local address. `bucket` affects the remote object's identity. `tags` are managed fields, so an out-of-band change may appear as drift and be reverted on the next apply. A plan can reveal replacement or deletion, but it does not make those actions safe automatically.

The common loop is:

```text
configuration + inputs + observed resources -> plan -> review -> apply -> new observed state
```

When approval must bind to exact operations, apply the saved reviewed plan rather than recomputing it after the gate.

# State and Drift

Terraform-style tools keep **state** that maps configuration addresses to remote objects and records attributes needed to calculate future changes. State is operational data, not source code. It may contain sensitive values and belongs in a protected remote backend with access control, encryption, versioning, and locking.

Provider-native systems such as ARM or CloudFormation keep equivalent deployment state on the provider side rather than in an operator-managed state file.

**Drift** is a difference between declared and observed infrastructure. Refresh and plan can expose drift only for fields the provider reads and manages. Apply can reconcile those fields. Ignored attributes, provider defaults, and external systems remain outside that guarantee. Emergency console changes should be reflected in code before the next reconciliation undoes them or leaves the repository misleading.

# One Authoritative Controller

Infrastructure tools overlap. Terraform can bootstrap machine configuration; Kubernetes controllers can provision cloud resources; configuration-management tools can create infrastructure. The critical question is which controller owns each resource or field. Two reconcilers managing the same value can repeatedly overwrite each other.

Split ownership by lifecycle and failure impact. Networks, shared data services, application deployments, and runtime configuration often change at different rates and need different permissions. The split should reduce the scope of a destructive plan, not create modules merely for structure.

# Engineering Boundaries

- Review replacements and deletes, not only textual diffs.
- Promote provider and module versions deliberately; changed defaults can change a plan.
- Keep state and secrets out of Git.
- Authenticate CI with short-lived workload identity where the platform supports it.
- Treat data backup and recovery as separate from resource recreation. Recreating a database resource does not restore its data.

# References

- [Terraform documentation](https://developer.hashicorp.com/terraform/intro)
- [OpenGitOps principles](https://opengitops.dev/)
