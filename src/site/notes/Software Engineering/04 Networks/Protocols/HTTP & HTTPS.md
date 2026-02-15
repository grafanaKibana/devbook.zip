---
{"dg-publish":true,"permalink":"/software-engineering/04-networks/protocols/http-and-https/","noteIcon":""}
---


# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is the difference between HTTP and HTTPS?
> HTTPS is HTTP over TLS.
> It provides confidentiality (encryption), integrity (tamper detection), and server authentication via certificates.
> Plain HTTP has no built-in protection against eavesdropping or manipulation.

> [!QUESTION]- What HTTP methods exist?
> Common methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS.
> Less common: TRACE, CONNECT.

> [!QUESTION]- What is the difference between GET and POST?
> GET is intended for retrieving a resource representation; it is safe and can be cached.
> POST is intended for submitting data to be processed (often creating a new resource or triggering an action); it is not safe and is generally not idempotent.
> GET parameters are typically in the URL query; POST usually sends a request body.

> [!QUESTION]- What do idempotency and safety mean for HTTP methods?
> Safe means the request does not change server state (for example, GET, HEAD, OPTIONS).
> Idempotent means repeating the same request has the same effect as doing it once (for example, GET, PUT, DELETE).
> A method can be idempotent but not safe (for example, DELETE).

## Links

- [Idempotency in REST (RU)](https://restapitutorial.ru/lessons/idempotency.html)
- [MDN: HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)

# Whats next

:LiArrowUpLeft: [[Software Engineering/04 Networks/04 Networks\|04 Networks]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/04 Networks/Protocols/DNS.md" data-href="Software Engineering/04 Networks/Protocols/DNS.md" href="Software Engineering/04 Networks/Protocols/DNS.md" class="internal-link" target="_blank" rel="noopener nofollow">DNS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/04 Networks/Protocols/gRPC.md" data-href="Software Engineering/04 Networks/Protocols/gRPC.md" href="Software Engineering/04 Networks/Protocols/gRPC.md" class="internal-link" target="_blank" rel="noopener nofollow">gRPC</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/04 Networks/Protocols/HTTP 2.md" data-href="Software Engineering/04 Networks/Protocols/HTTP 2.md" href="Software Engineering/04 Networks/Protocols/HTTP 2.md" class="internal-link" target="_blank" rel="noopener nofollow">HTTP 2</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/04 Networks/Protocols/RPC.md" data-href="Software Engineering/04 Networks/Protocols/RPC.md" href="Software Engineering/04 Networks/Protocols/RPC.md" class="internal-link" target="_blank" rel="noopener nofollow">RPC</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/04 Networks/Protocols/SMTP.md" data-href="Software Engineering/04 Networks/Protocols/SMTP.md" href="Software Engineering/04 Networks/Protocols/SMTP.md" class="internal-link" target="_blank" rel="noopener nofollow">SMTP</a></span></li></ul></div>
