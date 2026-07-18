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

# Intro

A port number selects a service endpoint within an IP host. IANA registrations provide interoperable defaults; they do not force a deployment to listen there, prove which application owns a socket, or bypass firewall policy. Diagnose the actual listener and negotiated protocol before treating a familiar number as evidence.

| Service | Registered/default port | Usual transport | Operational caveat |
| --- | ---: | --- | --- |
| FTP control | 21 | TCP | Data uses a separate negotiated connection; prefer SSH-based or HTTPS transfer for new systems |
| SSH | 22 | TCP | Frequently moved, but changing the port is noise reduction rather than authentication |
| Telnet | 23 | TCP | Unencrypted; use SSH |
| SMTP relay | 25 | TCP | Client submission normally uses 587; implicit TLS submission commonly uses 465 |
| DNS | 53 | UDP and TCP | UDP handles ordinary queries; TCP is required for zone transfer and used for truncation fallback and larger exchanges |
| DHCP server/client | 67 / 68 | UDP | Broadcast behavior and relay agents matter across subnets |
| HTTP | 80 | TCP | May redirect to HTTPS; HTTP/3 is normally advertised on a secure origin instead |
| POP3 | 110 | TCP | Implicit TLS is registered on 995 |
| NTP | 123 | UDP primarily | IANA also registers TCP; normal NTP exchanges use UDP |
| NetBIOS session | 139 | TCP | Name and datagram services use UDP 137/138; modern Windows file sharing usually uses SMB directly on 445 |
| IMAP | 143 | TCP | Implicit TLS is registered on 993 |
| HTTPS | 443 | TCP and UDP | HTTP/1.1 and HTTP/2 use TLS over TCP; HTTP/3 uses QUIC over UDP |
| SMB | 445 | TCP | Never expose directly to the public internet without a specific protected design |
| Oracle listener | 1521 | TCP | A common registered listener port, still configurable |
| MySQL | 3306 | TCP | Keep database listeners on private networks and require authenticated TLS where supported |
| RDP | 3389 | TCP and UDP | Modern RDP can use both; public exposure attracts credential attacks |
| PostgreSQL | 5432 | TCP | Configurable; network access and `pg_hba.conf` are separate gates |

```bash
# A port says what accepted the connection, not what protocol is safe.
nc -vz db.internal.example 5432
openssl s_client -connect api.example.com:443 -servername api.example.com
```

## References

- [IANA Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml) — authoritative registrations for service names, ports, transports, and assignment notes.
- [ByteByteGo: 18 common ports](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/18-common-ports-worth-knowing.md) — source list corrected here for multi-transport and configuration caveats.
