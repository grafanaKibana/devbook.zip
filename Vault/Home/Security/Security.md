---
icon: lock
order: 80
color: "#0ea5e9"
topic:
  - Security
subtopic: []
summary: "Protecting users, data, and systems: authentication, authorization, and cryptography."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Done
---

Security keeps a system's promised behavior intact when people, software, and infrastructure fail or act maliciously. It is an engineering property of the whole service: identities, authorization, data handling, dependencies, deployment, detection, and recovery all contribute to the result.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# The Shape of the Problem

The CIA triad names three recurring goals: confidentiality limits disclosure, integrity limits unauthorized change, and availability keeps required operations usable. A real threat model adds the assets, actors, trust boundaries, abuse paths, and impact that make those goals concrete. Defense in depth then places independent controls along an abuse path so one failed control does not decide the outcome.

Two distinctions run through everything below:

- **Authentication and authorization:** authentication establishes a principal with some assurance. Authorization decides whether that principal may perform this operation on this resource now. A valid session never replaces the resource decision.
- **Encoding, password hashing, integrity, and encryption:** encoding changes representation. Password hashing creates an expensive verifier. A MAC or signature authenticates data within a defined trust model. Encryption protects confidentiality for key holders. None substitutes for the others.

Small omissions often open the path: one missing ownership check, one reusable credential in telemetry, one unbounded recovery endpoint, or one dependency deployed past its supported lifetime. The surrounding notes isolate those mechanisms. This page keeps their shared design process visible.

# Secure System Design Checklist

Start with one abuse case, not a catalog of controls. For a payroll export, identify the employee records as assets, payroll staff and the export worker as actors, and the browser, API, job queue, object store, and third-party delivery service as separate trust boundaries. Then make each control answer a concrete path through those boundaries.

1. **Assets and actors:** classify the data and operations, name legitimate actors, and describe what an attacker gains. See [[Home/Security/Sensitive Data|Sensitive Data]].
2. **Trust boundaries:** draw where identities, data, and administrative control cross processes, networks, tenants, and vendors.
3. **Identity and access:** authenticate each actor, authorize the exact resource and action, deny by default, and keep privileges narrow. See [[Home/Security/Authentication/Authentication|Authentication]] and [[Home/Security/Authorization Models|Authorization Models]].
4. **Secure defaults:** expose only required endpoints and methods, close unused ports, reject unknown input, and make a missing policy fail closed. See [[Home/Security/Firewall|Firewall]], [[Home/Security/OWASP|OWASP]], and [[Home/Security/Web Vulnerabilities|Web Vulnerabilities]].
5. **Secrets and keys:** keep credentials out of code and telemetry, use managed key storage, separate key and data administration, and test rotation. See [[Home/Security/Secrets Management|Secrets Management]] and [[Home/Security/Encryption|Encryption]].
6. **Dependencies and delivery:** pin and verify build inputs, scan deployed artifacts, protect CI identities, and keep a current inventory of components and public APIs.
7. **Detection:** record authentication, authorization, administrative, and sensitive-data events with safe metadata. Alert on an attack pattern rather than one expected denial.
8. **Response and recovery:** assign incident owners, preserve evidence, revoke compromised access, communicate under the applicable obligations, and restore from a tested recovery path.

![[Security/Security-Security-18120000.png]]

A checklist becomes evidence only when its failure paths are exercised. The payroll export should reject another tenant, a missing policy, a revoked job identity, and a stale signing key. Operations should also know what happens when audit delivery fails or the only clean backup predates the incident.

# Questions

> [!QUESTION]- What is the difference between authentication and authorization?
> Authentication establishes a principal. Authorization evaluates that principal's proposed action against the target resource and current context.

# References

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
