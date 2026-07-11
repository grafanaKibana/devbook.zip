---
topic:
  - Security
subtopic:
  - Authentication
summary: "How a system proves who a user or service is, from passwords to OAuth/OIDC."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Creation
---

# Intro

Authentication is how a system proves who a user or service is, and it is a core control for production security. The details matter: password storage, MFA, session management, OAuth/OIDC, and secure failure handling. Example: a login flow is not done until you handle brute-force protection, account recovery, and session revocation.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
