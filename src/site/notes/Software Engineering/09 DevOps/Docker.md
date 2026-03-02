---
{"dg-publish":true,"permalink":"/software-engineering/09-dev-ops/docker/"}
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

## Key Commands

```bash
# Build an image tagged as myapp:latest
docker build -t myapp:latest .

# Run a container, mapping host port 8080 to container port 8080
docker run -p 8080:8080 myapp:latest

# Run with environment variables (never bake secrets into images)
docker run -e ConnectionStrings__Default="Server=..." myapp:latest

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
      - ConnectionStrings__Default=Server=db;Database=mydb;User=sa;Password=YourPassword!
    depends_on:
      - db
  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourPassword!
    volumes:
      - sqldata:/var/opt/mssql
volumes:
  sqldata:
```

## Pitfalls

**Running as root**: By default, containers run as root inside the container. If the container is compromised, the attacker has root access to the container filesystem. Fix: add `USER app` to your Dockerfile after creating a non-root user.

**Secrets in image layers**: `ENV MY_SECRET=abc` bakes the secret into the image layer permanently — it is visible in `docker history` even if you delete it in a later layer. Fix: pass secrets at runtime via environment variables or Docker secrets, never in the Dockerfile.

**Image bloat**: Including the SDK in the final image adds ~600MB unnecessarily. Fix: always use multi-stage builds. Also use `.dockerignore` to exclude `bin/`, `obj/`, `.git/` from the build context.

**No persistent state**: Container filesystems are ephemeral — data written inside a container is lost when the container stops. Fix: use Docker volumes for databases and file storage. Never store application state in the container filesystem.

**Ignoring health checks**: Kubernetes and load balancers need to know when a container is ready. Without a health check, traffic is routed to containers that are still starting up. Fix: add `HEALTHCHECK` in Dockerfile or configure liveness/readiness probes in Kubernetes.

## Tradeoffs

| | Docker | Podman | Bare Metal |
|---|---|---|---|
| Daemon | Required (dockerd) | Daemonless | N/A |
| Rootless | Requires config | Native | N/A |
| K8s integration | Via containerd | Native OCI | N/A |
| Windows support | Good | Limited | N/A |

**Docker vs Podman**: Podman is daemonless and rootless by default, making it more secure. Docker has better Windows support and broader ecosystem tooling. For .NET on Linux/Kubernetes, either works. For Windows containers, Docker is the only option.

**Docker Compose vs Kubernetes**: Compose is for local development and simple single-host deployments. Kubernetes is for production multi-node orchestration. Do not use Compose in production for anything that needs scaling, rolling updates, or self-healing.

## Questions

> [!QUESTION]- What is the difference between a Docker image and a container?
> - An image is a read-only layered filesystem built from a Dockerfile. It is immutable.
> - A container is a running instance of an image with a writable layer on top.
> - Multiple containers can run from the same image simultaneously.
> - Deleting a container does not delete the image.
> - Tradeoff: images are shared and cached; containers are ephemeral and isolated.

> [!QUESTION]- Why use multi-stage builds for .NET applications?
> - The .NET SDK image (~800MB) includes compilers and build tools not needed at runtime.
> - The ASP.NET runtime image (~200MB) is sufficient for running the published app.
> - Multi-stage builds copy only the published output to the final image, reducing size by ~75%.
> - Smaller images mean faster pulls, less attack surface, and lower registry storage costs.
> - Cost: slightly more complex Dockerfile; worth it for any production workload.

> [!QUESTION]- How do you prevent secrets from leaking into Docker images?
> - Never use `ENV` or `ARG` for secrets in Dockerfiles — they are visible in `docker history`.
> - Pass secrets at runtime via environment variables (`docker run -e`) or Docker secrets.
> - For build-time secrets (e.g., NuGet feeds), use `RUN --mount=type=secret` (BuildKit).
> - In Kubernetes, use Secrets mounted as environment variables or files.
> - Tradeoff: runtime injection adds operational complexity but is the only safe approach.

## References

- [Docker documentation](https://docs.docker.com/) — official Docker docs; covers Dockerfile reference, Compose, networking, and volumes
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/) — official guide to multi-stage builds; essential for .NET production images
- [.NET Docker samples](https://github.com/dotnet/dotnet-docker/tree/main/samples) — official Microsoft .NET Docker examples including multi-stage builds and Compose
- [Docker security best practices](https://docs.docker.com/develop/security-best-practices/) — official guide covering rootless containers, secrets, and image scanning
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering\|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/09 DevOps/Deployment Strategies/Deployment Strategies\|Deployment Strategies]]
> - [[Software Engineering/09 DevOps/Version Control Systems/Version Control Systems\|Version Control Systems]]
>
> **Pages**
> - [[Software Engineering/09 DevOps/CI CD tools\|CI CD tools]]
> - [[Software Engineering/09 DevOps/Kubernetes\|Kubernetes]]
> - [[Software Engineering/09 DevOps/Observability\|Observability]]
<!-- whats-next:end -->
