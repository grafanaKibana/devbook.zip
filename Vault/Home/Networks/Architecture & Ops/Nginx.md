---
topic:
  - Networks
subtopic:
  - Architecture & Ops
summary: "An event-driven web server and reverse proxy for static delivery, TLS, routing, caching, and load balancing."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

NGINX is an event-driven HTTP web server and reverse proxy. A master process handles global config and worker lifecycle; workers keep request state on sockets.

Use NGINX for commodity edge behavior: path/host routing, TLS termination, buffering, caching, and upstream balancing. Prefer managed ingress or platform edge services when operations ownership already exists and product requirements are not edge-specific.

![[Networks/Networks-Nginx-18120000.png]]

The diagram's “cache memory” label is shorthand: response bodies are file-backed under `proxy_cache_path`, while the shared-memory zone holds keys and metadata.

# Reverse-Proxy Boundary

When a public request enters NGINX:

1. The proxy accepts or reuses a connection.
2. It applies host/path/header policy.
3. It opens upstream connection(s).
4. It forwards, buffers, and returns a response.

The origin sees proxy-origin traffic as client traffic. If app identity needs to include user identity, only trust proxy-authenticated forwarding headers from known and controlled edge nodes.

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

If upstream uses TLS, verify certificate policy separately at that hop. A plain proxy-to-origin channel can reduce latency but lowers transport isolation.

# Forward Proxy vs Reverse Proxy

Both are intermediaries but represent different trust models:

- Forward proxy: represents client egress and policy, may tunnel with `CONNECT`.
- Reverse proxy: represents the origin side and handles inbound public entry.

For forward proxy scenarios (egress controls, filtering, TLS inspection), enforce strict policy for `CONNECT`, authentication, and trusted CA trust-path assumptions.

# Observability and Failure Codes

- `502`: upstream response was invalid for the proxy.
- `504`: request hit gateway timeout before upstream completion.
- `503`: capacity or protection boundary reached.

Design retries and failover upstreams based on this boundary, not on the application alone.

# Why NGINX for This Layer

NGINX remains strong for stable declarative edge behavior and static/off-path optimization. For service-specific logic, policy, auth, and custom routing composition inside an app stack, YARP inside ASP.NET Core can reduce operational fragmentation.

# References

- [Why is NGINX so Popular? (ByteByteGo)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/why-is-nginx-so-popular.md) — process and proxy feature baseline.
- [NGINX Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html) — configuration and proxy basics.
- [Controlling NGINX](https://nginx.org/en/docs/control.html) — lifecycle and graceful reload behavior.
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) — directives for forwarding and buffering.
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html) — load balancing and upstream options.
- [NGINX TLS module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html) — TLS protocol and certificate behavior.
- [YARP overview](https://learn.microsoft.com/aspnet/core/fundamentals/servers/yarp/yarp-overview) — .NET-native proxy alternative.
