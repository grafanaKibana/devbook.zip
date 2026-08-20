---
publish: true
created: 2026-08-20T20:41:15.624Z
modified: 2026-08-20T20:41:15.624Z
published: 2026-08-20T20:41:15.624Z
topic:
  - DevOps
subtopic: []
summary: Packages an application and its dependencies into an isolated, portable container.
level:
  - "2"
priority: High
status: Ready to Repeat
---

Docker builds an OCI-compatible image containing an application and its filesystem dependencies, then starts isolated processes from that image. The image is portable; the complete runtime is not. The host kernel and CPU architecture, networking, mounts, resource limits, injected configuration, security policy, and external services remain environmental inputs.

# Image, Container, and Runtime Boundary

An **image** is an immutable set of filesystem layers plus configuration such as the entry point and default environment. A **container** is one running instance of that image with a writable layer. Removing the container removes that writable layer unless data lives in a volume or external service.

A Linux container is a host process isolated with namespaces and constrained with cgroups, not a virtual machine. Docker Desktop commonly runs Linux containers inside a Linux VM on macOS or Windows. The image must therefore match the target operating system and CPU architecture, or publish a multi-platform manifest with a compatible variant.

# Reading a Multi-Stage Dockerfile

This small .NET example teaches stage and runtime boundaries; it is not a production-ready build:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish MyApp.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

`FROM ... AS build` gives compilation its own stage. The second `FROM` starts a new image that has the runtime but not the SDK. `COPY --from=build` transfers only published output. `USER` avoids running the application as root. `EXPOSE 8080` documents the intended listening port but does not publish it to the host. `ENTRYPOINT` defines the process whose lifetime is the container lifetime.

A real build should use a small `.dockerignore`, lock or review base-image identity, keep private-feed credentials out of layers, scan the final digest, and promote that same digest through environments.

# Reading a Compose File

Compose describes a multi-container application, commonly for local development. This example is intentionally incomplete for production:

```yaml
services:
  api:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - db

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql/data

secrets:
  db_password:
    file: ./secrets/db_password

volumes:
  pgdata:
```

`build` creates the API image from the local Dockerfile. `ports` publishes a container port on the host. `depends_on` controls start order but does not prove the database is ready. The named volume keeps database files outside the replaceable container. The secret is mounted as a file instead of embedded in the image or committed YAML; its source file must remain outside Git.

# Safety Boundaries

- **Privilege** — run as a non-root user and add only required capabilities or mounts. Container isolation does not make root harmless.
- **Secrets** — keep credentials out of Dockerfile `ARG`/`ENV`, copied files, image history, and tracked Compose values. Inject them at build or run time through the platform's secret mechanism.
- **State** — treat the writable container layer as disposable. Put durable data in a volume or external service.
- **Health** — a running process may still be unable to serve traffic. Configure the health mechanism consumed by the actual runtime; a Docker `HEALTHCHECK` does not automatically become a Kubernetes readiness probe.
- **Artifact identity** — tags can move. A digest identifies the exact image that passed verification.

Docker Compose is suitable when a single-host lifecycle is enough. Kubernetes adds multi-node scheduling and reconciliation when the workload requires them; it does not replace the image or application runtime contract.

# References

- [Docker documentation](https://docs.docker.com/)
- [.NET Docker samples](https://github.com/dotnet/dotnet-docker/tree/main/samples)
