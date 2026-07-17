---
publish: true
created: 2026-07-16T14:12:14.263Z
modified: 2026-07-16T14:12:14.263Z
published: 2026-07-16T14:12:14.263Z
topic:
  - Networks
subtopic:
  - Protocols
summary: A browser-oriented address with a scheme, authority, path, query, and fragment.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

A URL identifies how and where a resource can be accessed. Browsers parse URLs with the WHATWG algorithm; network protocols and many non-browser systems also rely on the generic URI syntax from RFC 3986. The distinction matters because string concatenation, premature decoding, or inconsistent normalization can change the origin, cache key, signature input, or routed resource.

```text
https://user@example.com:8443/orders/42?view=compact#history
\___/   \___________________/ \________/ \__________/ \_____/
scheme         authority          path       query     fragment
```

The authority contains optional user information, a host, and an optional port separated by `:`. An IPv6 literal must be bracketed: `https://[2001:db8::7]:8443/`. The fragment is interpreted by the client and is not sent in an HTTP request. Query syntax is owned by the application; `?a=1&a=2`, parameter order, and `+` decoding do not have one universal meaning outside the chosen form or API contract.

![[Assets/System Design 101/ba9b4a88efca327ece8fc56f8003d90e68a09fc296e559992d9347e1a6a5a123.png]]

## Parsing and Encoding

Percent-encoding represents bytes that cannot appear directly in a component. Decode only after splitting the URL into components: decoding `%2F` before path routing can turn data into a separator. Do not decode twice; `%252F` becomes `%2F` and then `/`, a common path-traversal and signature-bypass bug.

Relative references resolve against a base URL. From `https://example.com/a/b/`, `../c?x=1` resolves to `https://example.com/a/c?x=1`. A leading `//cdn.example.net/app.js` keeps the base scheme but replaces the authority.

Normalization is context-sensitive. Scheme and host comparison is case-insensitive, while path segments may be case-sensitive. Removing a default port or resolving dot segments can be safe for some protocols; sorting query parameters or decoding reserved characters can change application meaning. Parse with a standards-aware URL type and sign the exact canonical form your protocol defines.

## URI Examples

- URL: `https://example.com/docs?q=uri#syntax`
- Email URI: `mailto:alice@example.com` — no `//` authority form.
- LDAP URI with IPv6: `ldap://[2001:db8::7]/dc=example,dc=com`
- URN: `urn:isbn:9780131103627` — a persistent name, not a network location.

## References

- [WHATWG URL Standard](https://url.spec.whatwg.org/) — defines the parsing, serialization, origin, and browser URL algorithms used by web platforms.
- [RFC 3986: URI Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986) — defines scheme, authority, path, query, fragment, relative resolution, and normalization boundaries.
- [ByteByteGo: Components of a URL](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/do-you-know-all-the-components-of-a-url.md) — source anatomy visual, retained with corrected terminology in the text.
