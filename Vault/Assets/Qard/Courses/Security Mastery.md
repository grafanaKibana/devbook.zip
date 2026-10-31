---
topic: [Security]
subtopic: []
level: ["4"]
priority: High
status: Creation
publish: false
tags: [qard-internal, MetricsIgnore]
qard-mastery: "Security"
---

Begin with data and trust boundaries, then distinguish cryptographic guarantees from identity and access decisions. Finish by applying concrete controls at application sinks and assessing specialized trust models. Existing source completion does not establish objective mastery.

This is course 6 of the suggested vault route. Learn courses order capabilities; the existing first-pass plans track card exposure, and Today retains the material actually studied. Course switching is manual.

All mapped topics are included in the learning flow, including source notes marked Creation or Not-Started. Previously planned objectives are new and follow the same prerequisite route as other unassessed objectives. Source-note lifecycle statuses remain unchanged; assessment evidence still comes from actual study.

Start lessons and checks from this course's objectives. The record lives outside Home, so folder-based automatic association and Update objectives do not map the source tree. Maintain its explicit objective/source links directly. Prerequisites guide the frontier; Qard still permits manually teaching another objective.

Setup assigns no due dates or evidence. Teaching and assessment write subsequent evidence; source-note lifecycle statuses remain owner-managed. Draft source status does not place an objective on hold.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classify sensitive data by owner, purpose, consumers and retention and choose lifecycle controls for disclosure, misuse and deletion risks | Sensitive data lifecycle | data-lifecycle | 01 Data and cryptographic guarantees | new |  |  | [[Home/Security/Sensitive Data]] |  | v1:411c9c829bd7000b9fb413d4ee3bb29cdeda63a39e63cd32a58bb816d438bd7b/0 | |
| Distinguish preimage and collision resistance from secrecy and choose a digest, HMAC or signature for the required integrity boundary | Hash guarantees | hash-guarantees | 01 Data and cryptographic guarantees | new |  | data-lifecycle | [[Home/Security/Hashing]] |  | v1:ad5d616db69dfce01dac261eeff11be6b7bda8b88f69d3e331cd923d8919471f/5 | |
| Choose symmetric, public-key or hybrid encryption and distinguish confidentiality, authenticated encryption and encoding by the key-access boundary | Encryption and key access | encryption-boundary | 01 Data and cryptographic guarantees | new |  | hash-guarantees | [[Home/Security/Encryption]] |  | v1:6d6a28c34d12bcc2f7979f3f7661467a78e244bfab64f12151fd16bde936b441/1 | |
| Trace signing and verification and explain why integrity and private-key possession require an authenticated public-key trust binding | Signature and trust | signature-trust | 01 Data and cryptographic guarantees | new |  | hash-guarantees, encryption-boundary | [[Home/Security/Digital Signature]] |  | v1:79c625128b197d4eb15b6eee438557fe9176a241b7819130bd546073171d15e4/0 | |
| Store and migrate salted, costed password verifiers and bound verification concurrency and failure behavior after a credential leak | Password verifiers | password-verifiers | 02 Credentials and login | new |  | hash-guarantees | [[Home/Security/Password Storage]] |  | v1:efbc1cca5101ec9c82554c8e8827869d2100178ae769b1faaf8928e3b7f553cc/2 | |
| Trace credential issuance, workload delivery, refresh and revocation and plan rotation without introducing a stored bootstrap secret or consumer outage | Secret delivery and rotation | secret-delivery | 02 Credentials and login | new |  | encryption-boundary, data-lifecycle | [[Home/Security/Secrets Management]] |  | v1:458d38285adecfca75d12aa1fef37d95c5d3f4a918c670de16cbaa201b6a079f/1 | |
| Explain Basic authentication challenge and credential reuse and evaluate its TLS, logging and revocation boundaries | Basic authentication | basic-credentials | 02 Credentials and login | new |  | password-verifiers | [[Home/Security/Authentication/Basic Auth]] |  | v1:4d304416811cba31943ff1469b8d9b29e6ab4e1b97648f1966bc4495b7b67459/2 | |
| Choose distinct authentication factors and compare phishing resistance, enrollment and recovery paths across TOTP and WebAuthn | Factors and recovery | factor-recovery | 02 Credentials and login | new |  | password-verifiers | [[Home/Security/Authentication/Two-Factor Auth]] |  | v1:cdcea8effcc7632358c1a2682fd1498ae3d52898ae5c70b619d3ee0239838a0c/0 | |
| Trace provisioning and time-step HMAC verification and bound replay, clock skew, guessing and recovery within the verifier acceptance window | TOTP acceptance window | totp-window | 02 Credentials and login | new |  | factor-recovery, hash-guarantees | [[Home/Security/Authentication/TOTP]] |  | v1:c82e5e774460c210efd564ca7aa1c2e65a6c71ef3b323591d8fad32e3bb4988d/0 | |
| Trace authorization code with PKCE and distinguish API access-token authority from the OIDC authentication result and its intended audience | OAuth and OIDC artifacts | oauth-artifacts | 03 Identity and access decisions | new |  | signature-trust | [[Home/Security/Authentication/Oauth OIDC (OpenId Connect)]] |  | v1:444da30ed7606fe85bcaf8a3035eded00b1f44a654ca4679bd32c5dd78d8e668/0 | |
| Validate bearer tokens under fixed issuer, audience, algorithm and lifetime rules and account for key rotation, replay and revocation limits | JWT validation boundary | jwt-validation | 03 Identity and access decisions | new |  | oauth-artifacts, signature-trust | [[Home/Security/JWT Bearer]] |  | v1:fc449df149de806d2348b77aefed0527e277c659d02fa7f9bee4e47306a5c991/0 | |
| Trace an SSO sign-in across identity-provider and relying-application sessions and explain validation, logout and concentrated failure risks | Federated sessions | federated-sessions | 03 Identity and access decisions | new |  | oauth-artifacts | [[Home/Security/Authentication/SSO (Single Sign-On)]] |  | v1:481fcc1e4cf2f1638de788bde5e023883b41a132b490300a67cc0616b3e787c4/0 | |
| Choose RBAC, ABAC or relationship-based policy inputs and enforce decisions for each principal, action, resource and context | Authorization policy facts | authorization-policy | 03 Identity and access decisions | new |  | data-lifecycle | [[Home/Security/Authorization Models]] |  | v1:35dadc56e3ee9bfbffffe94fcabf3767b56eab1c4a2e7eee0b9d3220159416e4/0 | |
| Place resource-specific authorization after loading the relevant policy facts and test tenant, ownership and forbidden-versus-not-found behavior | Resource authorization | resource-enforcement | 03 Identity and access decisions | new |  | authorization-policy, jwt-validation | [[Home/Security/Authentication/Resource-based Auth]] |  | v1:de15c378bec14efa0ae35ae8db3c7a0531ba055ee1df51b49178e34d3a2101b3/1 | |
| Distinguish SQL injection, XSS and CSRF mechanisms and apply parameterization, context-safe rendering or antiforgery controls at the relevant sink | Application trust sinks | injection-sinks | 04 Application and network controls | new |  | authorization-policy | [[Home/Security/Web Vulnerabilities]] |  | v1:4b497d165183882b418bb3de1fa876a3c6d698b2f80edb9f4180da547ee8e53d/0 | |
| Express required traffic as source, destination, protocol, direction and zone transitions and identify what network and application firewalls cannot prove | Firewall boundaries | firewall-boundaries | 04 Application and network controls | new |  | data-lifecycle | [[Home/Security/Firewall]] |  | v1:46995e0dbd5a37ae4a48c2316fac1b87f724b9fae7e8cb637771f3278f55dc7e/0 | |
| Use OWASP categories to review concrete application threats and controls without treating an awareness list as a complete threat model or compliance proof | Risk coverage and evidence | risk-coverage | 04 Application and network controls | new |  | injection-sinks, resource-enforcement | [[Home/Security/OWASP]] |  | v1:03bc28c1e1368e046db89cbfd96cfc3411987f12d3733be2b090a5c9626de4a6/1 | |
| Explain how hash links and consensus constrain ledger rewriting and justify distributed trust costs against a trusted database and audit log | Blockchain trust costs | ledger-trust | 05 Specialized trust models | new |  | signature-trust, hash-guarantees | [[Home/Security/Block-chain]] |  | v1:4adc87d473cf953cd1189ab18e3e04c94bc0196576f29643c96ae0ff2edb27c4/0 | |
