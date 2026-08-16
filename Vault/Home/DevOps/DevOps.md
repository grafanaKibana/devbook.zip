---
icon: skull
order: 100
color: "#6366f1"
topic:
  - DevOps
subtopic: []
summary: "Automation, observability, and delivery practices that move changes to production safely."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Done
---

DevOps shortens the path from a code change to production without giving up control of risk. Automation removes avoidable variation, observability exposes what the change did, and service ownership keeps production feedback with the team that can act on it. A healthy delivery system makes the normal path repeatable and the recovery path routine.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# DevOps, SRE, and Platform Engineering

DevOps is a way of working: the team that changes a service also sees and owns its behavior in production. SRE makes reliability measurable through service-level objectives (SLOs) and error budgets, then uses engineering to reduce operational toil. Platform engineering builds a supported internal product that gives application teams a safer self-service path through repeated infrastructure and delivery work.

These models change support, not accountability. Application teams remain responsible for service behavior. SRE supplies reliability policy and expertise. A platform supplies reusable paths such as deployment templates, environments, and observability defaults. SRE fits when reliability needs an explicit budget; a platform earns its cost when several teams will adopt the same path.

# Twelve-Factor Application and Deployment Contract

The deployment contract separates three things:

- **Build** produces an immutable package or image from source.
- **Release** combines that artifact with environment configuration and secret references.
- **Run** starts disposable processes that can shut down gracefully and keep durable state in attached services.

This shape comes from the Twelve-Factor model and remains useful with containers and orchestration. It does not define Kubernetes, supply-chain security, or telemetry. Those are separate decisions. The practical test is whether the running artifact, its configuration, its dependencies, and its previous recoverable version can be identified without rebuilding it.

# Security as Delivery Evidence

Security checks belong at the boundary where they can still prevent or contain harm: threat analysis during design, secret and dependency checks before merge, provenance and artifact scanning during build, authorization testing before release, signature or policy checks during deployment, and detection after release.

A gate needs evidence and a named response. Severity alone is not enough; exploitability, reachability, asset importance, compensating controls, ownership, and expiry decide whether a finding blocks release. A signature proves artifact identity and integrity, not that the code is safe.

# References

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [Site Reliability Engineering](https://sre.google/sre-book/table-of-contents/)
- [The Twelve-Factor App](https://12factor.net/)
- [CNCF Platforms White Paper](https://tag-app-delivery.cncf.io/whitepapers/platforms/)
- [NIST Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)
