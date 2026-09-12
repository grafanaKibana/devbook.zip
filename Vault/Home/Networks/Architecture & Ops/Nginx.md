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

NGINX is an event-driven HTTP server and reverse proxy. A master process owns configuration and worker lifecycle. Worker processes handle connections and requests.

NGINX fits stable edge behavior such as host and path routing, TLS termination, buffering, caching, and upstream balancing. A managed ingress or platform edge is usually the smaller operational choice when it already supplies the required controls.

![[Networks/Networks-Nginx-18120000.png|theme-aware]]

The diagram's “cache memory” label is shorthand: response bodies are file-backed under `proxy_cache_path`, while the shared-memory zone holds keys and metadata.

# Reverse-Proxy Boundary

When a public request enters NGINX:

1. The proxy accepts or reuses a connection.
2. It applies host/path/header policy.
3. It opens upstream connection(s).
4. It forwards, buffers, and returns a response.

The upstream connection originates at NGINX, so the application sees the proxy's network identity unless forwarding metadata carries the original scheme, host, or address. Only known proxies may supply identity-bearing forwarding headers, and the edge should overwrite untrusted client values.

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

TLS to the client does not protect the proxy-to-upstream hop. If that hop crosses an untrusted network, configure upstream TLS and certificate verification explicitly.

# Forward Proxy Vs Reverse Proxy

Both are intermediaries but represent different trust models:

- Forward proxy: represents client egress and policy, may tunnel with `CONNECT`.
- Reverse proxy: represents the origin side and handles inbound public entry.

For forward-proxy scenarios, `CONNECT` destination policy, proxy authentication, and any interception CA become explicit parts of the egress trust boundary.

# Observability and Failure Codes

- `502`: upstream response was invalid for the proxy.
- `504`: request hit gateway timeout before upstream completion.
- `503`: the proxy or upstream reports that the service is currently unavailable. Maintenance and protection policy can also produce it.

These codes identify the failing boundary, not the root cause. Correlate them with upstream timing, connection errors, and application health before retrying. An indiscriminate retry can multiply load on an already failing dependency.

# Why NGINX for This Layer

NGINX keeps generic edge policy outside application code. YARP can be a better fit when routing and transforms belong to the .NET service lifecycle and need the same dependency injection, deployment, and observability model.

# References

- [NGINX Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [YARP overview](https://learn.microsoft.com/aspnet/core/fundamentals/servers/yarp/yarp-overview)
