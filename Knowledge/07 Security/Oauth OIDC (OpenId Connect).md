---
topic: ["Security"]
subtopic: []
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is authentication?
> Authentication is the process of verifying an identity claim (who you are).
> Common factors: something you know (password), have (OTP device), or are (biometrics).

> [!QUESTION]- What is authorization?
> Authorization is the decision of what an identified and authenticated subject is allowed to do.
> It is typically enforced via access control policies (RBAC, ABAC, ACLs) and happens after authentication.

> [!QUESTION]- What is the difference between identification, authentication, and authorization?
> Identification: a claim of identity (for example, a username or account id).
> Authentication: proving that claim (password, MFA, certificate, etc.).
> Authorization: checking permissions for a specific action on a specific resource.

## Further Reading
- [Identification, authentication, authorization (RU)](http://security.mosmetod.ru/paroli/192-identifikatsiya-autentifikatsiya-i-avtorizatsiya-v-chem-raznitsa)
