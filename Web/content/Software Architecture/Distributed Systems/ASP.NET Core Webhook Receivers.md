---
publish: true
created: 2026-07-16T16:57:20.686Z
modified: 2026-07-16T16:57:20.686Z
published: 2026-07-16T16:57:20.686Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Receiving webhooks in ASP.NET Core with raw-byte signature verification, replay controls, and durable acknowledgement.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

An ASP.NET Core webhook receiver is an untrusted public endpoint. It must authenticate the exact bytes the provider signed, reject replays when the provider supplies a timestamp, deduplicate events, and durably accept work before returning `2xx`. Parsing and reserializing JSON before HMAC verification changes bytes and can invalidate the signature.

## Raw-byte verification

```csharp
using System.Security.Cryptography;
using System.Text;

app.MapPost("/webhooks/provider", async (
    HttpRequest request,
    IWebhookInbox inbox,
    IConfiguration configuration,
    CancellationToken ct) =>
{
    await using var buffer = new MemoryStream();
    await request.Body.CopyToAsync(buffer, ct);
    var body = buffer.ToArray();

    if (!request.Headers.TryGetValue("X-Signature", out var supplied) ||
        !Convert.TryFromHexString(supplied.ToString(), new byte[32], out var written) ||
        written != 32)
    {
        return Results.Unauthorized();
    }

    var secret = Encoding.UTF8.GetBytes(configuration["Webhooks:Secret"]!);
    var expected = HMACSHA256.HashData(secret, body);
    var actual = Convert.FromHexString(supplied.ToString());

    if (!CryptographicOperations.FixedTimeEquals(expected, actual))
    {
        return Results.Unauthorized();
    }

    var accepted = await inbox.StoreIfNewAsync(body, request.Headers, ct);
    return accepted ? Results.Accepted() : Results.Ok();
});
```

Adapt the signed payload construction to the provider contract: many providers sign `timestamp + "." + rawBody`, not the body alone. Validate timestamp skew before acceptance and store the provider event ID under a unique constraint. `StoreIfNewAsync` must commit the inbox record or durable queue message before the response is sent; background work can happen later.

## References

- [GitHub validating webhook deliveries](https://docs.github.com/webhooks/using-webhooks/validating-webhook-deliveries) — provider example for exact-payload HMAC and constant-time comparison.
- [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature) — provider example for raw body, timestamp, signed payload, and tolerance.
- [ASP.NET Core request and response operations](https://learn.microsoft.com/aspnet/core/fundamentals/middleware/request-response) — official request-body stream and pipeline behavior.
