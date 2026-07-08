---
publish: true
created: 2026-07-05T10:54:04.336+03:00
modified: 2026-07-05T20:28:24.141+03:00
---

# Common Web Vulnerabilities

Three injection-family attacks account for an outsized share of real-world web breaches: **SQL Injection**, **Cross-Site Scripting (XSS)**, and **Cross-Site Request Forgery (CSRF)**. They sit behind several [[OWASP|OWASP Top 10]] categories (Injection, Broken Access Control). The unifying lesson: **never trust input, and never mix untrusted data into a command/markup/request without the right escaping or token**. This page covers how each works and the .NET defenses.

## SQL Injection (SQLi)

The attacker smuggles SQL syntax through user input into a query that's built by string concatenation, changing what the query _means_.

```csharp
// VULNERABLE: input becomes part of the SQL text
var sql = $"SELECT * FROM Users WHERE Name = '{name}'";
// name = "x' OR '1'='1"  → returns every row
// name = "x'; DROP TABLE Users;--"  → destructive
```

**Defense — parameterize.** A parameter is sent separately from the SQL text, so the database treats it as _data_, never as code:

```csharp
// Safe: ADO.NET parameter
cmd.CommandText = "SELECT * FROM Users WHERE Name = @name";
cmd.Parameters.AddWithValue("@name", name);

// Safe: EF Core parameterizes interpolated values automatically
var users = await db.Users.Where(u => u.Name == name).ToListAsync();
await db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM Logs WHERE Id = {id}");
```

Parameterization is the _complete_ fix for SQLi; input validation and least-privilege DB accounts are defense-in-depth, not substitutes. The one place parameters can't help is dynamic identifiers (table/column names) — allowlist those against a fixed set. NoSQL has the analogous **NoSQL injection** (e.g. passing an object where a string is expected), defended the same way: never interpolate untrusted input into a query.

## Cross-Site Scripting (XSS)

The attacker gets their JavaScript to run **in another user's browser**, in the victim site's origin — so it can read cookies, the DOM, and act as the user. Three flavours:

- **Stored** — the payload is saved server-side (a comment, a profile field) and served to every viewer. Worst, because it's persistent and self-spreading.
- **Reflected** — the payload is in the request (a query param) and echoed straight back into the response; the attacker must lure the victim to a crafted URL.
- **DOM-based** — client-side JS writes untrusted data into the DOM (`element.innerHTML = location.hash`) with no server involved.

**Defense — contextual output encoding.** The root cause is putting untrusted data into HTML without encoding it for the context (HTML body vs attribute vs JS vs URL). Razor encodes by default; the danger is opting out:

```cshtml
@* Safe: Razor HTML-encodes automatically *@
<p>@Model.UserComment</p>

@* DANGEROUS: Html.Raw bypasses encoding — only for content you fully trust/sanitize *@
<p>@Html.Raw(Model.UserComment)</p>
```

Layered defenses:

- **Output-encode** at every sink, in the right context (use the framework's encoders; don't hand-roll).
- **Sanitize** rich HTML you must render (e.g. a WYSIWYG field) with an allowlist library like **HtmlSanitizer** — never a blocklist.
- **Content-Security-Policy (CSP)** header — a strong backstop: disallow inline scripts so an injected `<script>` won't execute even if encoding is missed.
- Store JWTs/session tokens in **HttpOnly cookies** so XSS can't read them (see [[JWT Bearer]]).

## Cross-Site Request Forgery (CSRF)

CSRF abuses the fact that browsers **auto-attach cookies** to requests. A malicious page makes the victim's browser send a _state-changing_ request to a site where the victim is logged in; the cookie rides along and the request is honored as the user. The attacker can't _read_ the response (that's what the same-origin policy and CORS prevent) — but a fire-and-forget `POST /transfer` still does damage.

**Defenses (use both):**

- **Anti-forgery token** (synchronizer token pattern) — the server embeds an unpredictable token in the form that the attacker's site can't know or read. ASP.NET Core does this automatically for Razor form posts (`@Html.AntiForgeryToken()` + `[ValidateAntiForgeryToken]`):

```csharp
[HttpPost]
[ValidateAntiForgeryToken]                  // rejects requests missing the token
public IActionResult Transfer(TransferDto dto) { /* ... */ }
```

- **`SameSite` cookies** — `SameSite=Lax` (the modern browser default) or `Strict` stops the cookie from being sent on cross-site requests, neutralizing most CSRF at the browser level. Pair it with the token; don't rely on it alone.

> [!NOTE]
> **Token-based APIs (JWT in an `Authorization` header) are largely CSRF-immune** because the browser doesn't auto-attach a header the way it does a cookie. CSRF is primarily a _cookie-authentication_ problem — which is also why storing tokens in cookies (good for XSS) reintroduces CSRF and needs `SameSite` + anti-forgery.

## Pitfalls

- **Blocklist filtering** — trying to strip `<script>` or `'` with regex. Attackers have endless encodings/variants; always use parameterization (SQLi) and contextual encoding/allowlist sanitization (XSS) instead.
- **Validation mistaken for output encoding** — input validation reduces attack surface but is _not_ the XSS/SQLi fix; the same data is safe in one context and dangerous in another. Encode/parameterize at the sink.
- **`Html.Raw` / `dangerouslySetInnerHTML` on user content** — the classic stored-XSS hole.
- **Disabling anti-forgery "to make the SPA work"** — fix it with `SameSite` + token-in-header, don't switch the protection off.
- **Reflected XSS in error pages / search results** — echoing the raw query string back is a common reflected-XSS sink.

## Tradeoffs

| Vulnerability | Root cause | Primary fix | Backstop |
|---|---|---|---|
| SQL Injection | Data concatenated into SQL | **Parameterized queries** | Least-privilege DB user, input validation |
| XSS | Untrusted data in HTML/JS unescaped | **Contextual output encoding** | CSP, HtmlSanitizer, HttpOnly cookies |
| CSRF | Browser auto-sends cookies | **Anti-forgery token** | `SameSite` cookies |

**Decision rule**: parameterize _every_ query, output-encode _every_ untrusted value at the point of rendering, and protect _every_ cookie-authenticated state-changing endpoint with an anti-forgery token plus `SameSite`. These three habits eliminate the most common and most damaging web vulnerabilities; treat CSP and least-privilege as defense-in-depth on top.

## Questions

> [!QUESTION]- Why does parameterizing a query fully prevent SQL injection, where input filtering does not?
> A parameter is transmitted to the database **separately from the SQL text**, and the query is parsed/planned _before_ the value is bound — so the value can never change the statement's structure, no matter what characters it contains. Filtering tries to anticipate every dangerous input and always misses encodings/edge cases. Parameterization removes the entire class of attack rather than playing whack-a-mole with payloads.

> [!QUESTION]- What's the difference between XSS and CSRF?
> **XSS** runs the attacker's _code_ in the victim's browser within your site's origin (so it can read the DOM, cookies, and act with full privilege) — caused by unescaped untrusted data in your output. **CSRF** runs no code in your origin; it tricks the victim's browser into _sending a request_ to your site using its existing cookies, and the attacker can't even read the response — caused by browsers auto-attaching cookies. XSS is fixed by output encoding/CSP; CSRF by anti-forgery tokens and `SameSite`. Notably, an XSS hole can defeat CSRF tokens, so XSS is the more severe of the two.

> [!QUESTION]- Why are header-token (JWT) APIs less exposed to CSRF than cookie-session apps?
> CSRF works because browsers automatically include cookies on cross-site requests without the attacker's page needing to read or set anything. A bearer token sent in the `Authorization` header is _not_ auto-attached — JavaScript on the attacker's origin can't read your token (same-origin policy) and can't set the header on a forged cross-site request. So pure header-token APIs sidestep CSRF; the risk returns the moment you store the token in a cookie, which is why cookie storage (good against XSS) must be paired with `SameSite` + anti-forgery.

## References

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) — parameterization and defense-in-depth.
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — contextual output-encoding rules.
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) — synchronizer token and `SameSite`.
- [Prevent XSS in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/cross-site-scripting) — Razor encoding and `Html.Raw` caveats.
- [Anti-forgery / CSRF in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery) — token generation and validation.
