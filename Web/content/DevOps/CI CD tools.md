---
publish: true
created: 2026-08-20T20:41:15.622Z
modified: 2026-08-20T20:41:15.622Z
published: 2026-08-20T20:41:15.622Z
topic:
  - DevOps
subtopic: []
summary: Pipelines that automate the path from commit to production, compared across major tools.
level:
  - "3"
priority: High
status: Ready to Repeat
---

CI/CD turns a source change into a traceable release decision. Continuous integration (CI) combines small changes frequently and verifies them while the context is fresh. Continuous delivery keeps a verified artifact releasable. Continuous deployment releases qualifying changes without a routine human approval.

# One Artifact Through the Pipeline

A commit should produce one immutable package or image. Every later stage promotes that exact artifact rather than rebuilding it. If CI verifies `checkout-api@sha256:8f31…`, production should run that digest. Rebuilding after approval creates different bytes and breaks the evidence chain.

```text
commit -> build artifact -> verify artifact -> deploy artifact -> expose artifact
             same digest       same digest       same digest
```

Delivery and deployment differ at the last production decision. Continuous delivery leaves that decision to a person or business process. Continuous deployment makes it from automated evidence. Both can enforce tests, security policy, environment checks, and [[DevOps/Deployment Strategies/Deployment Strategies|progressive exposure]].

# Stages and Gates

| Stage | Produces or proves | Typical gate | Failure consequence |
| --- | --- | --- | --- |
| Build | Versioned package or image | Reproducible build and artifact identity | Nothing is promoted |
| Verify | Test, security, and policy evidence for that artifact | Required evidence passes | Fix the change or record an explicit exception |
| Deploy | Running instances in one environment | Startup, readiness, and smoke evidence | Remove the candidate from traffic |
| Release | User exposure to the healthy candidate | Service and business guardrails | Shift traffic back or disable the feature |

Build checks describe the artifact. Deployment checks describe that artifact in a particular environment. A pipeline should make the running version, previous recoverable version, responsible environment, and gate result visible.

# Reading a Workflow File

This simplified GitHub Actions workflow is for field recognition, not production use:

```yaml
name: verify-and-deploy
on:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<reviewed-immutable-ref>
      - run: ./build.sh
      - run: ./test.sh

  deploy:
    runs-on: ubuntu-latest
    needs: verify
    environment: production
    steps:
      - run: ./deploy.sh registry.example/checkout@sha256:8f31...
```

`on` selects the repository event. `jobs` separates independently scheduled work. `runs-on` selects an execution environment for each job that runs steps. `uses` invokes reusable action code; the placeholder represents a current reviewed immutable ref. `steps` run in order within a job. `needs: verify` prevents deployment before verification completes. `environment: production` can attach host-level protection and secrets outside the YAML. The digest makes the deployed artifact explicit.

Repository workflow files are not the whole control plane. GitHub Actions can attach policy to repositories and environments. Azure Pipelines can attach checks to environments, service connections, and agent pools. Jenkins keeps more policy in an organization-operated controller and plugin estate. The important architectural questions are where release policy lives, which identities may deploy, what runners can reach, and who operates them.

# Questions

> [!QUESTION]- What separates continuous delivery from continuous deployment?
> Both approaches keep a tested artifact ready for production. With continuous delivery, releasing that artifact is still a separate decision, often an approval or a business-controlled step. With continuous deployment, every change that passes the required automated checks is released automatically.

# References

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Azure Pipelines documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/)
- [Jenkins documentation](https://www.jenkins.io/doc/)
- [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html)
- [SLSA provenance](https://slsa.dev/spec/v1.2/provenance)
