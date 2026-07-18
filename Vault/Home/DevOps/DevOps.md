---
icon: skull
order: 100
color: "#6366f1"
topic:
  - DevOps
subtopic: []
summary: "Automation, observability, and delivery practices that move changes to production safely."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Done
---

DevOps is about shortening the path from change to production safely: automation, observability, and ownership of runtime behavior. The goal is not tools; it is predictable delivery and fast recovery when things break. Example: a good pipeline makes rollback boring and makes failures visible before users notice.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# DevOps, SRE, and Platform Engineering

DevOps is the organizational and technical practice of shortening delivery feedback loops while the team that changes a service remains accountable for its runtime behavior. SRE applies software engineering to operations and makes reliability explicit through SLOs, error budgets, automation, and limits on toil. Platform engineering builds an internal product—a supported self-service path—that reduces repeated cognitive and operational load for application teams.

Use SRE when reliability work needs an explicit operating model and measurable budget. Build a platform when several teams repeatedly solve the same paved-road problem and will actually adopt the product. Neither creates a handoff back to an operations silo: application teams still own service behavior, while SRE or platform teams supply policy, expertise, and reusable mechanisms. A platform with no product owner becomes another ticket queue; SRE without authority over reliability priorities becomes incident cleanup.

![[DevOps/DevOps-DevOps-18120000.png]]

> [!WARNING] Non-normative source visual
> The illustrated SRE “handoff” is not the ownership model used here. The application team remains accountable for service behavior; SRE and platform teams provide reliability policy, expertise, and reusable mechanisms without becoming a downstream operations silo.

# Twelve-Factor Application and Deployment Contract

The durable Twelve-Factor constraints are one codebase per deployable app, explicit dependencies, configuration outside code, attached resources behind replaceable bindings, separate build/release/run stages, stateless share-nothing processes, self-contained service binding, horizontal process scaling, fast startup and graceful shutdown, development/production parity, event-stream logs, and admin tasks run as one-off processes.

Translate those constraints into current mechanics: build one image, attach environment configuration and secret references to form a release, run disposable replicas, stream structured events, and execute migrations as bounded jobs. The method does not specify containers, Kubernetes, service meshes, zero trust, supply-chain provenance, or modern telemetry; add those controls when the threat model and platform require them instead of pretending the original twelve factors cover them.

# DevSecOps Security Gates

| Boundary | Evidence | Blocking rule |
| --- | --- | --- |
| Design | Threat model and abuse cases | Block unresolved high-impact design threats |
| Commit/PR | Secret scan, SAST, dependency and license policy | Block verified secrets, exploitable critical findings, or prohibited dependencies |
| Build | SBOM, provenance, IaC and container scan, signature | Block missing identity/provenance or policy-breaking artifacts |
| Test environment | DAST and authorization tests | Block reproducible high-impact exploit paths |
| Deploy | Signature verification and admission policy | Reject unknown or noncompliant digests |
| Runtime | Detection, drift, and incident telemetry | Page on active exploitation; create tracked risk for non-urgent findings |

Severity alone is not a release rule. Include exploitability, reachability, asset criticality, compensating controls, owner, and expiry. False positives need a documented suppression tied to the exact rule and artifact, not a global disable. Signing an artifact proves identity and integrity; it does not prove the code is safe.

![[DevOps/DevOps-DevOps-18120000-1.png]]

# Questions

> [!QUESTION]- What does DevOps actually optimize, beyond tooling?
> - The target is delivery throughput and instability. DORA's current five metrics are change lead time, deployment frequency, failed deployment recovery time, change fail rate, and deployment rework rate.
> - Automation (CI/CD, infrastructure as code) exists to make releases boring and repeatable, removing the manual steps where humans introduce variance
> - Observability (logs, metrics, traces) exists so failures are visible before users report them and diagnosable without a redeploy
> - Ownership closes the loop: the team that ships a change runs it, so production feedback shapes the next change

> [!QUESTION]- Why is fast, safe rollback more valuable than trying to avoid failure?
> - You cannot prevent all failures; you can make their blast radius and duration small — a one-click rollback turns an incident into a non-event
> - Progressive delivery (canary, blue-green, feature flags) limits how many users a bad change reaches and lets you revert without a full redeploy
> - Small, frequent deploys are easier to reason about and roll back than large batched ones — big-bang releases are where irreversible failures hide
> - Design the pipeline so the *undo* path is as tested as the *deploy* path

# References

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/) — current primary definition of the five metrics, including failed deployment recovery time and deployment rework rate.
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/) — the canonical text on running production systems: SLOs, error budgets, and incident response.
- [The Twelve-Factor App](https://12factor.net/) — foundational methodology for building deployable, scalable services.
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/) — primary SRE operating mechanics for objectives and error budgets.
- [CNCF platform engineering white paper](https://tag-app-delivery.cncf.io/whitepapers/platforms/) — vendor-neutral platform-as-product boundaries and responsibilities.
- [NIST Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final) — primary secure-development practices and evidence across the lifecycle.
- [SLSA specification](https://slsa.dev/spec/v1.0/) — supply-chain provenance and artifact integrity controls.
- [ByteByteGo: DevOps, SRE, and platform engineering](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/devops-vs-sre-vs-paltform-engg.md) — source contribution for the team-responsibility boundary.
- [ByteByteGo: Twelve-Factor App](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/the-12-factor-app.md) — source contribution for the deployment contract; its visual was rejected by the audit.
- [ByteByteGo: DevSecOps](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-is-devsecops.md) — source contribution for the lifecycle security gates.
