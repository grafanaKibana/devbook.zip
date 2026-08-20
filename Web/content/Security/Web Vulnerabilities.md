---
publish: true
created: 2026-08-20T20:41:15.673Z
modified: 2026-08-20T20:41:15.673Z
published: 2026-08-20T20:41:15.673Z
topic:
  - Security
subtopic:
  - Security
summary: How SQL Injection, XSS, and CSRF work and the .NET defenses against each.
level:
  - "4"
priority: High
status: Ready to Repeat
---

SQL injection, cross-site scripting (XSS), and cross-site request forgery (CSRF) cross different trust boundaries. SQL injection changes a database command. XSS makes a browser execute attacker-controlled content in the application's origin. CSRF causes a browser to send an authenticated request that the user did not intend.

They do not share one universal “sanitize input” fix. SQL values need parameterization, rendered content needs context-specific encoding or sanitization, and cookie-authenticated state changes need request-origin or antiforgery protection. The categories connect to the broader risk model in [[OWASP|OWASP Top 10]], but each mechanism must be handled at its own sink.

# SQL Injection (SQLi)

SQL injection occurs when untrusted data becomes part of SQL command text and changes the statement's structure. String concatenation is the usual path, including interpolation that produces a string before a database API receives it.

```csharp
// VULNERABLE: input becomes part of the SQL text
var sql = $"SELECT * FROM Users WHERE Name = '{name}'";
// name = "x' OR '1'='1"  → returns every row
// name = "x'; DROP TABLE Users;--"  → destructive
```

Parameterization keeps values separate from SQL syntax. The database parses a command with placeholders and binds typed values through the provider:

```csharp
// Safe: ADO.NET parameter
cmd.CommandText = "SELECT * FROM Users WHERE Name = @name";
cmd.Parameters.AddWithValue("@name", name);

// Safe: EF Core parameterizes interpolated values automatically
var users = await db.Users.Where(u => u.Name == name).ToListAsync();
await db.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM Logs WHERE Id = {id}");
```

Parameterized values cannot alter the command structure. Dynamic identifiers such as a table or sort column usually cannot be parameters. Map those from a fixed set rather than accepting arbitrary text. Stored procedures are safe only when they avoid constructing SQL from untrusted input internally. Input validation and least-privilege database accounts remain useful impact controls, but neither repairs a query that mixes code and data.

Document databases and query DSLs have related injection failures when an application accepts operator objects or builds query expressions from untrusted structure. Their safe construction APIs are technology-specific, so “parameterize” should not be copied mechanically from SQL.

# Cross-Site Scripting (XSS)

XSS makes a browser interpret attacker-controlled content as active content in the application's origin. The script can read origin-accessible data and issue requests with the user's ambient authority. `HttpOnly` prevents direct cookie reads, but it does not stop injected code from acting through the authenticated page.

- **Stored:** the payload is persisted and later rendered to one or more users.
- **Reflected:** the current request carries a payload that the server places into its response.
- **DOM-based:** client-side code reads attacker-influenced data and passes it to an unsafe DOM sink such as `innerHTML`.

The primary defense is to keep untrusted values in safe sinks and encode them for the exact output context. HTML text, attributes, URLs, CSS, and JavaScript follow different rules. Some contexts should not accept untrusted values at all. Razor HTML-encodes ordinary expressions by default. Explicit raw rendering removes that protection:

```cshtml
@* Safe: Razor HTML-encodes automatically *@
<p>@Model.UserComment</p>

@* DANGEROUS: Html.Raw bypasses encoding — only for content you fully trust/sanitize *@
<p>@Html.Raw(Model.UserComment)</p>
```

Rich HTML that must preserve markup needs an actively maintained allowlist sanitizer. After sanitization, the result must not be modified by code that can create new executable markup. A well-designed Content Security Policy limits script sources and can require nonces or hashes, reducing exploitability when a rendering mistake survives. CSP is a second layer, not the primary XSS fix.

Session cookies should use `HttpOnly` so injected JavaScript cannot read their values. This limits credential theft, not authenticated actions, and does not make an XSS defect harmless. See [[JWT Bearer]] for the distinct risks of bearer-token storage.

# Cross-Site Request Forgery (CSRF)

CSRF exploits ambient credentials, most commonly cookies that the browser attaches without the attacking origin knowing their value. A malicious page triggers a state-changing request to a site where the victim is signed in. The same-origin policy usually prevents the attacker from reading the response, but confidentiality of the response does not undo the action.

Cookie-authenticated endpoints need a CSRF policy appropriate to their framework and browser clients. The synchronizer-token pattern binds an unpredictable request value to the user's session. ASP.NET Core Razor Pages have antiforgery protection by convention, and MVC form tag helpers can emit tokens for qualifying forms. Controller actions must still be covered by the chosen validation policy:

```csharp
[HttpPost]
[ValidateAntiForgeryToken]                  // rejects requests missing the token
public IActionResult Transfer(TransferDto dto) { /* ... */ }
```

`SameSite=Lax` withholds a cookie from most cross-site subrequests while allowing it on some top-level safe navigations. `Strict` withholds it more broadly. `None` permits cross-site use and requires `Secure`. Because browser compatibility, sibling subdomains, navigation behavior, and application flows complicate the boundary, `SameSite` is normally paired with token validation or another explicit origin-verification design rather than treated as the only control.

> [!NOTE]
> An API whose credential is supplied only through an `Authorization` header is not exposed to classic ambient-cookie CSRF because a hostile page cannot make the browser attach that header. CORS still governs which browser origins may send permitted cross-origin requests and read responses, while server authorization remains mandatory. The token's storage may create a separate XSS exposure. If the same bearer token is placed in a cookie, the browser treats it as a cookie credential and the CSRF boundary returns.

# Pitfalls

- **Blocklist filtering:** regular expressions that remove `<script>` or quotes do not model parser behavior and are bypassable through alternate syntax and contexts.
- **Validation used as output encoding:** validation can constrain an input domain, but the safe representation still depends on the sink that later consumes the value.
- **Raw HTML APIs on user content:** `Html.Raw` and `dangerouslySetInnerHTML` move responsibility from framework encoding to the caller. Untrusted rich content needs sanitization first.
- **Antiforgery disabled for a SPA:** cookie-authenticated JSON endpoints need a token-in-header or supported origin-verification design. Removing validation does not make the client architecture simpler. It moves trust to the browser's automatic cookie behavior.
- **CSP treated as a sanitizer:** policy mistakes and allowed script gadgets can leave an injection exploitable. Fix the unsafe sink even when a CSP blocks the current payload.

# Tradeoffs

| Vulnerability | Root cause | Primary fix | Backstop |
|---|---|---|---|
| SQL injection | Untrusted values become SQL syntax | Parameterized values. Allowlisted identifiers | Least-privilege database identity |
| XSS | Untrusted content reaches an executable browser context | Safe sinks, contextual encoding, or HTML sanitization | CSP and `HttpOnly` session cookies |
| CSRF | Browser sends ambient credentials on an unintended request | Framework antiforgery or explicit origin verification | `SameSite` cookies and narrow methods/content types |

The control must meet the parser or credential mechanism at the boundary it protects. Parameterize SQL values. Keep browser data in safe sinks and encode for its context. Cover every cookie-authenticated state-changing endpoint with the application's CSRF policy. CSP, least privilege, and cookie attributes reduce impact when a primary control fails.

# References

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Prevent cross-site scripting in ASP.NET Core](https://learn.microsoft.com/aspnet/core/security/cross-site-scripting)
- [Prevent Cross-Site Request Forgery attacks in ASP.NET Core](https://learn.microsoft.com/aspnet/core/security/anti-request-forgery)
