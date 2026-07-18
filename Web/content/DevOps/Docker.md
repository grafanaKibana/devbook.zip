---
publish: true
created: 2026-07-11T21:47:05.936Z
modified: 2026-07-18T11:30:06.558Z
published: 2026-07-18T11:30:06.558Z
topic:
  - DevOps
subtopic: []
summary: Packages an application and its dependencies into an isolated, portable container.
level:
  - "2"
priority: High
status: Ready to Repeat
---

Docker builds OCI-compatible images and runs containers from them. Pinning the application, runtime, and filesystem reduces environment drift, but it does not guarantee identical behavior across development, CI, and production. The host kernel and CPU architecture, resource limits, network and DNS path, mounts, injected configuration and secrets, security policy, and external dependencies remain part of the runtime contract.

# How Containers Work

A container is not a VM. A Linux container is a host process isolated with Linux namespaces and constrained through cgroups. Docker can also run Windows containers, which use Windows kernel isolation mechanisms, and Docker Desktop commonly runs Linux containers inside a Linux VM on macOS or Windows. An image must match the target OS and CPU architecture unless a multi-platform manifest supplies a compatible variant.

A Docker **image** combines filesystem layers with image configuration. Filesystem-changing build instructions such as `RUN`, `COPY`, and `ADD` produce layer changes; metadata instructions such as `CMD`, `ENTRYPOINT`, and `ENV` update image configuration and do not each imply a new filesystem payload. BuildKit can also reuse cached results without making "one Dockerfile line equals one stored layer" a safe mental model.

A **container** is a running instance of an image. Multiple containers can run from the same image simultaneously, each with its own writable layer.

# Dockerfile for a .NET 8 App

Multi-stage builds are the standard pattern for .NET — they produce small production images by separating the build environment from the runtime environment:

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["MyApp/MyApp.csproj", "MyApp/"]
RUN dotnet restore "MyApp/MyApp.csproj"
COPY . .
WORKDIR /src/MyApp
RUN dotnet publish -c Release -o /app/publish

# Stage 2: Runtime (much smaller image)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

The SDK stage contains compilers and build tooling. The final stage starts from the ASP.NET runtime image and receives only the published output, so build-only tools are absent from the runtime image. Measure the resulting digest for the selected tag and architecture; image sizes change across .NET versions, base variants, and platforms.

# Reproducible and Least-Privilege Images

A production image should be reproducible from a small context, contain only runtime output, and run without root privileges. Pin the base by version and, where the threat model requires reproducible bytes, by digest. Put stable restore inputs before frequently changing source so the layer cache stays useful. Generate labels and an SBOM in CI, scan the final digest, and promote that same digest rather than rebuilding it per environment.

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY MyApp.csproj .
RUN dotnet restore MyApp.csproj
COPY . .
RUN dotnet publish MyApp.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
USER $APP_UID
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

Keep `.git`, `bin`, `obj`, local secrets, and test output out of the build context with `.dockerignore`. Environment variables are configuration transport, not secret storage: inject secrets at runtime from the platform, and use BuildKit secret mounts for private package feeds during build. A smaller image reduces transfer and attack surface, but removing diagnostics can slow incidents; keep a separate debug image or ephemeral debugging workflow.

![[Assets/System Design 101/fd62a54fcf46c885b6e5dfa40f7ac7800ba0acc656e8b2209c984dadb1bc1625.png]]

> [!WARNING] Non-normative source visual
> The Node 14 tags and `docker scan` command are obsolete examples. Build from a supported, pinned base image, scan the final immutable digest with the scanner enforced by CI, run as a non-root user, and inject secrets through runtime secret mounts rather than ordinary environment variables.

# Key Commands

```bash
# Build an image tagged as myapp:latest
docker build -t myapp:latest .

# Run a container, mapping host port 8080 to container port 8080
docker run -p 8080:8080 myapp:latest

# Non-sensitive runtime configuration can use environment variables
docker run -e ASPNETCORE_ENVIRONMENT=Production myapp:latest

# Mount sensitive configuration at runtime; keep the source file out of Git
docker run --mount type=bind,source="$(pwd)/secrets/appsettings.Production.json",target=/app/appsettings.Production.json,readonly myapp:latest

# View running containers
docker ps

# View logs
docker logs <container-id>

# Execute a command inside a running container (debugging)
docker exec -it <container-id> /bin/bash
```

# Docker Compose

Compose defines multi-container applications in a single YAML file. Useful for local development with a database, cache, and app running together:

```yaml
services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
    secrets:
      - source: appsettings
        target: /app/appsettings.Production.json
    depends_on:
      - db
  db:
    image: postgres:17
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
    secrets:
      - postgres_password
    volumes:
      - pgdata:/var/lib/postgresql/data

secrets:
  appsettings:
    file: ./secrets/appsettings.Production.json
  postgres_password:
    file: ./secrets/postgres_password

volumes:
  pgdata:
```

# Pitfalls

**Running as root**: By default, containers run as root inside the container. If the container is compromised, the attacker has root access to the container filesystem. Fix: add `USER app` to your Dockerfile after creating a non-root user.

**Secrets in image layers or tracked configuration**: `ENV MY_SECRET=abc`, a literal connection string in Compose, or a committed `appsettings` password leaves recoverable credentials in image or Git history. Keep ordinary configuration in environment variables, but mount credentials at runtime from Docker secrets or a platform secret-provider volume. Keep the source secret files out of Git.

**Image bloat**: Shipping the SDK and build context in the runtime image adds tools and bytes that production does not need. Use a multi-stage build when build-time and runtime dependencies differ, and use `.dockerignore` to exclude `bin/`, `obj/`, `.git/`, and local artifacts from the build context. Verify the final image contents and size instead of relying on a generic reduction percentage.

**State tied to one container**: A container's writable layer survives a stop and start of that same container, but it is deleted when the container is removed and does not follow a replacement container. Use volumes or bind mounts for database files and other durable state that must survive redeployment.

**Ignoring health checks**: Kubernetes and load balancers need to know when a container is ready. Without a health check, traffic is routed to containers that are still starting up. Fix: add `HEALTHCHECK` in Dockerfile or configure liveness/readiness probes in Kubernetes.

# Tradeoffs

| | Docker | Podman | Bare Metal |
|---|---|---|---|
| Daemon | Required (dockerd) | Daemonless | N/A |
| Rootless | Requires config | Native | N/A |
| Kubernetes workflow | Build and push OCI images; Kubernetes uses its configured CRI runtime | Build and push OCI images; Kubernetes uses its configured CRI runtime | N/A |
| Windows-host workflow | Docker Desktop supports Linux containers and Windows-container tooling | Podman Desktop runs Linux containers through a VM or WSL; no native Windows containers | N/A |

**Docker vs Podman**: Docker has the broader Compose, Build, Desktop, and integration ecosystem. Podman uses a daemonless architecture and supports rootless workflows, with a Docker-compatible CLI and API where the required features are implemented. For Linux containers, choose the workflow your build and deployment tooling actually supports. For Windows containers, validate a Windows-capable runtime and orchestrator stack; Docker is one option, not the container contract.

**Docker Compose vs Kubernetes**: Compose is a good fit for local development and can run bounded single-host production workloads when host failure, manual rollout, and limited orchestration are acceptable. Kubernetes fits multi-node workloads that need scheduling, controlled rollout, autoscaling, and reconciliation. Compose is not an HA orchestrator; the boundary is the workload requirement, not the word "production."

# Questions

> [!QUESTION]- Why use multi-stage builds for .NET applications?
>
> - The .NET SDK stage includes compilers and build tools that the running application usually does not need.
> - The runtime stage can start from the ASP.NET runtime image and copy only the published output.
> - This separates build credentials and tooling from the production filesystem and usually reduces transfer and scan surface; measure the actual result for the chosen tags and architecture.
> - Smaller images mean faster pulls, less attack surface, and lower registry storage costs.
> - Cost: slightly more complex Dockerfile; worth it for any production workload.

> [!QUESTION]- How do you prevent secrets from leaking into Docker images?
>
> - Never use `ENV` or `ARG` for secrets in Dockerfiles — they are visible in `docker history`.
> - Keep non-sensitive settings in environment variables; mount credentials at runtime from Docker secrets or a platform secret provider.
> - For build-time secrets (e.g., NuGet feeds), use `RUN --mount=type=secret` (BuildKit).
> - In Kubernetes, mount Secrets or external-secret-provider volumes as files and restrict access with RBAC.
> - Tradeoff: runtime injection adds operational complexity but is the only safe approach.

# References

- [Docker documentation](https://docs.docker.com/) — official Docker docs; covers Dockerfile reference, Compose, networking, and volumes
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/) — official guide to multi-stage builds; essential for .NET production images
- [.NET Docker samples](https://github.com/dotnet/dotnet-docker/tree/main/samples) — official Microsoft .NET Docker examples including multi-stage builds and Compose
- [Docker security best practices](https://docs.docker.com/develop/security-best-practices/) — official guide covering rootless containers, secrets, and image scanning
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/) — official guidance on base images, cache order, contexts, pinning, and multi-stage output.
- [Docker build secrets](https://docs.docker.com/build/building/secrets/) — official mechanism for build-time credentials that must not enter layers.
- [ByteByteGo: Docker practices](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/9-docker-best-practices-you-must-know.md) — source contribution for the reproducible least-privilege image example.
