---
publish: true
created: 2026-07-11T21:47:05.936Z
modified: 2026-07-16T12:34:48.046Z
published: 2026-07-16T12:34:48.046Z
topic:
  - DevOps
subtopic: []
summary: Packages an application and its dependencies into an isolated, portable container.
level:
  - "2"
priority: High
status: Ready to Repeat
---

# Docker

Docker packages an application and its dependencies into a container — an isolated process that runs identically across dev, CI, and production. The core value is eliminating environment drift: if it runs in the container locally, it runs the same way in production. Docker is the de facto standard for containerizing .NET applications before deploying to Kubernetes or Azure Container Apps.

## How Containers Work

A container is not a VM. It is a process on the host OS that uses two Linux kernel features:

- **Namespaces**: isolate what the process can see (filesystem, network, PIDs, users)
- **cgroups**: limit what the process can use (CPU, memory, I/O)

A Docker **image** is a read-only layered filesystem built from a `Dockerfile`. Each instruction (`FROM`, `COPY`, `RUN`) adds a layer. Layers are cached and shared across images, so a base layer (e.g., `mcr.microsoft.com/dotnet/aspnet:8.0`) is downloaded once and reused.

A **container** is a running instance of an image. Multiple containers can run from the same image simultaneously, each with its own writable layer.

## Dockerfile for a .NET 8 App

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

The SDK image (~800MB) is used only for building. The final image uses the ASP.NET runtime (~200MB). The published artifact is copied between stages.

## Reproducible and Least-Privilege Images

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

## Key Commands

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

## Docker Compose

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

## Pitfalls

**Running as root**: By default, containers run as root inside the container. If the container is compromised, the attacker has root access to the container filesystem. Fix: add `USER app` to your Dockerfile after creating a non-root user.

**Secrets in image layers or tracked configuration**: `ENV MY_SECRET=abc`, a literal connection string in Compose, or a committed `appsettings` password leaves recoverable credentials in image or Git history. Keep ordinary configuration in environment variables, but mount credentials at runtime from Docker secrets or a platform secret-provider volume. Keep the source secret files out of Git.

**Image bloat**: Including the SDK in the final image adds ~600MB unnecessarily. Fix: always use multi-stage builds. Also use `.dockerignore` to exclude `bin/`, `obj/`, `.git/` from the build context.

**State tied to one container**: A container's writable layer survives a stop and start of that same container, but it is deleted when the container is removed and does not follow a replacement container. Use volumes or bind mounts for database files and other durable state that must survive redeployment.

**Ignoring health checks**: Kubernetes and load balancers need to know when a container is ready. Without a health check, traffic is routed to containers that are still starting up. Fix: add `HEALTHCHECK` in Dockerfile or configure liveness/readiness probes in Kubernetes.

## Tradeoffs

| | Docker | Podman | Bare Metal |
|---|---|---|---|
| Daemon | Required (dockerd) | Daemonless | N/A |
| Rootless | Requires config | Native | N/A |
| Kubernetes workflow | Build and push OCI images; Kubernetes uses its configured CRI runtime | Build and push OCI images; Kubernetes uses its configured CRI runtime | N/A |
| Windows-host workflow | Docker Desktop supports Linux containers and Windows-container tooling | Podman Desktop runs Linux containers through a VM or WSL; no native Windows containers | N/A |

**Docker vs Podman**: Docker has the broader Compose, Build, Desktop, and integration ecosystem. Podman uses a daemonless architecture and supports rootless workflows, with a Docker-compatible CLI and API where the required features are implemented. For Linux containers, choose the workflow your build and deployment tooling actually supports. For Windows containers, validate a Windows-capable runtime and orchestrator stack; Docker is one option, not the container contract.

**Docker Compose vs Kubernetes**: Compose is for local development and simple single-host deployments. Kubernetes is for production multi-node orchestration. Do not use Compose in production for anything that needs scaling, rolling updates, or self-healing.

## Questions

> [!QUESTION]- Why use multi-stage builds for .NET applications?
>
> - The .NET SDK image (~800MB) includes compilers and build tools not needed at runtime.
> - The ASP.NET runtime image (~200MB) is sufficient for running the published app.
> - Multi-stage builds copy only the published output to the final image, reducing size by ~75%.
> - Smaller images mean faster pulls, less attack surface, and lower registry storage costs.
> - Cost: slightly more complex Dockerfile; worth it for any production workload.

> [!QUESTION]- How do you prevent secrets from leaking into Docker images?
>
> - Never use `ENV` or `ARG` for secrets in Dockerfiles — they are visible in `docker history`.
> - Keep non-sensitive settings in environment variables; mount credentials at runtime from Docker secrets or a platform secret provider.
> - For build-time secrets (e.g., NuGet feeds), use `RUN --mount=type=secret` (BuildKit).
> - In Kubernetes, mount Secrets or external-secret-provider volumes as files and restrict access with RBAC.
> - Tradeoff: runtime injection adds operational complexity but is the only safe approach.

## References

- [Docker documentation](https://docs.docker.com/) — official Docker docs; covers Dockerfile reference, Compose, networking, and volumes
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/) — official guide to multi-stage builds; essential for .NET production images
- [.NET Docker samples](https://github.com/dotnet/dotnet-docker/tree/main/samples) — official Microsoft .NET Docker examples including multi-stage builds and Compose
- [Docker security best practices](https://docs.docker.com/develop/security-best-practices/) — official guide covering rootless containers, secrets, and image scanning
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/) — official guidance on base images, cache order, contexts, pinning, and multi-stage output.
- [Docker build secrets](https://docs.docker.com/build/building/secrets/) — official mechanism for build-time credentials that must not enter layers.
- [ByteByteGo: Docker practices](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/9-docker-best-practices-you-must-know.md) — source contribution for the reproducible least-privilege image example.
