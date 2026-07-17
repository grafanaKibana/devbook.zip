---
publish: true
created: 2026-07-16T08:27:14.398Z
modified: 2026-07-16T08:35:47.513Z
published: 2026-07-16T08:35:47.513Z
topic:
  - Networks
subtopic:
  - Architecture & Ops
summary: An event-driven web server and reverse proxy for static delivery, TLS, routing, caching, and load balancing.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

NGINX is a web server and general-purpose HTTP reverse proxy. A master process owns configuration and worker lifecycle; worker processes handle connections through non-blocking event loops. That design lets a small worker set keep many sockets in flight without assigning one thread or process to every connection.

Reach for NGINX when the work is infrastructure-shaped: serve static files, terminate TLS, route by host or path, buffer slow clients, cache public responses, or balance across upstreams. Prefer a managed load balancer or ingress service when operating the proxy fleet would add no product value. Prefer YARP when routing, transforms, or authorization must be composed directly with ASP.NET Core code.

![[Assets/System Design 101/bc36232ffdb4e6260e2e16a8ed32a50504fe57d8a6812e2fd2d6c30d3c66c506.png]]

The diagram's “cache memory” label is shorthand. Proxy-cache response bodies are file-backed under the path configured by `proxy_cache_path`; the shared-memory zone holds cache keys and metadata.

## Process and Connection Lifecycle

The master process reads configuration, performs privileged setup such as binding configured ports, and starts workers. A worker accepts connections and advances each ready socket through the request state machine. Waiting for one upstream does not block the worker from processing other ready connections.

A configuration reload sends the master a signal. NGINX validates the new configuration, starts new workers, and asks old workers to finish existing requests before exiting. A valid reload therefore changes routing without dropping all in-flight traffic; a bad configuration is rejected and the old workers continue.

The event loop does not make blocking work free. Slow upstreams still consume connections and buffers, disk-backed buffering can add I/O, and CPU-heavy modules stall a worker. Capacity planning still needs connection limits, upstream timeouts, file-descriptor limits, and observability at both proxy and origin.

## Concrete Reverse-Proxy Path

```nginx
upstream orders_api {
    least_conn;
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
}

server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/private.key;

    location /assets/ {
        root /srv/site;
    }

    location /orders/ {
        proxy_pass http://orders_api;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_read_timeout 15s;
    }
}
```

For `GET https://api.example.com/orders/42`, NGINX completes the client TLS handshake, chooses the least-busy upstream, forwards an HTTP request over a separate connection, buffers the response by default, and relays it to the client. `/assets/logo.svg` never reaches the application: NGINX reads it from the configured static root.

TLS termination exposes HTTP to routing and logging. The upstream hop in this example is plaintext, so it belongs only on a trusted network. Use an HTTPS upstream with certificate verification when that boundary requires encryption; terminating client TLS does not secure the second hop automatically.

## Buffering, Caching, and Load Balancing

- **Buffering** decouples a fast upstream from a slow client. It protects application connections but consumes memory or temporary-file I/O. Disable it deliberately for streaming or low-latency incremental responses.
- **Caching** is opt-in through `proxy_cache_path` and `proxy_cache`. Cache only responses whose keys, authorization rules, and freshness semantics are understood; NGINX is not an application-data cache by default.
- **Load balancing** uses round robin by default, with alternatives such as `least_conn` and hashing. Passive failure handling can try another upstream, but retries need method semantics: replaying a non-idempotent request can duplicate work.

If every client depends on one NGINX instance, the proxy is the outage. Use multiple instances behind independent traffic steering, test graceful reloads, and monitor upstream connection errors, timeout classes, response codes, and saturation. A `502` usually means NGINX could not obtain a valid upstream response; a `504` means the configured gateway timeout expired. Those codes locate the failed boundary but do not prove the root cause.

## NGINX, Managed Proxies, and YARP

Use NGINX for stable, declarative edge behavior and efficient static or proxy I/O. A cloud-managed proxy or Kubernetes ingress surface is the better default when the platform already owns certificates, health checks, upgrades, and high availability. It removes host maintenance at the cost of provider-specific controls and pricing.

YARP is a .NET library, not a drop-in NGINX configuration. Choose it when proxy policy must share ASP.NET Core middleware, dependency injection, authorization, or custom C# routing. That flexibility also puts proxy correctness and deployment inside the application team's failure domain. Do not add YARP merely to reproduce commodity TLS termination or path routing that the platform already supplies.

## References

- [Why is NGINX so Popular? (ByteByteGo snapshot)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/why-is-nginx-so-popular.md) — the reviewed source for the master-worker overview, feature set, and adopted diagram.
- [NGINX Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html) — official configuration, static serving, proxying, and master/worker process introduction.
- [Controlling NGINX](https://nginx.org/en/docs/control.html) — official signal and graceful configuration-reload behavior.
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) — authoritative directives for upstream forwarding, buffering, timeouts, retries, and cache activation.
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html) — load-balancing algorithms and upstream failure controls.
- [NGINX TLS module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html) — certificate, protocol, and session configuration for TLS termination.
- [YARP overview](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/yarp-overview?view=aspnetcore-10.0) — Microsoft documentation for the .NET reverse-proxy boundary and customization model.
