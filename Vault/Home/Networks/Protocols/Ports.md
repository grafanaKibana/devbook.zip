---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Registered service ports, their usual transports, and the caveats behind the defaults."
level:
  - "2"
priority: Low
status: Ready to Repeat
publish: true
---

A port number selects a service endpoint on an IP host. IANA registrations provide shared defaults, not proof of what a deployment actually runs. A service may listen elsewhere, another application may own the expected socket, and firewall policy still decides whether traffic reaches it. The listener and negotiated protocol are stronger evidence than a familiar number.

| Service | Registered/default port | Usual transport | Operational caveat |
| --- | ---: | --- | --- |
| FTP control | 21 | TCP | Data uses a separate negotiated connection. Prefer SSH-based or HTTPS transfer for new systems |
| SSH | 22 | TCP | Frequently moved, but changing the port is noise reduction rather than authentication |
| Telnet | 23 | TCP | Unencrypted. Use SSH |
| SMTP relay | 25 | TCP | Client submission normally uses 587. Implicit TLS submission commonly uses 465 |
| DNS | 53 | UDP and TCP | TCP is required for AXFR and for IXFR responses that do not fit in one UDP message. Compact IXFR can use UDP. |
| DHCP server/client | 67 / 68 | UDP | Broadcast behavior and relay agents matter across subnets |
| HTTP | 80 | TCP | May redirect to HTTPS. HTTP/3 is normally advertised on a secure origin instead |
| POP3 | 110 | TCP | Implicit TLS on 995 |
| NTP | 123 | UDP primarily | IANA also registers TCP. Normal NTP exchanges use UDP |
| NetBIOS session | 139 | TCP | Name and datagram services use UDP 137/138. Modern Windows file sharing usually uses SMB directly on 445 |
| IMAP | 143 | TCP | Implicit TLS is registered on 993 |
| HTTPS | 443 | TCP and UDP | HTTP/1.1 and HTTP/2 use TLS over TCP. HTTP/3 uses QUIC over UDP |
| SMB | 445 | TCP | Never expose directly without strict hardening |
| SMTP submission | 587 | TCP | Authenticated submission normally upgrades with STARTTLS |
| Oracle listener | 1521 | TCP | A common registered listener port, still configurable |
| MySQL | 3306 | TCP | Keep database listeners on private networks and require authenticated TLS where supported |
| RDP | 3389 | TCP and UDP | Modern RDP can use both. Public exposure attracts credential attacks |
| PostgreSQL | 5432 | TCP | Configurable. Network access and `pg_hba.conf` are separate gates |

```bash
# A port says what accepted the connection, not what protocol is safe.
nc -vz db.internal.example 5432
openssl s_client -connect api.example.com:443 -servername api.example.com
```

# References

- [Service Name and Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml)
