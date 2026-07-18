---
topic:
  - Networks
subtopic:
  - Protocols
summary: "An encrypted remote-access protocol with host authentication, user authentication, and multiplexed channels."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

SSH provides an encrypted, integrity-protected connection for remote shells, command execution, file transfer, and forwarding. It separates three jobs that are often confused: the transport protocol negotiates algorithms and authenticates the server host; the user-authentication protocol proves which user may enter; the connection protocol multiplexes shells, commands, and forwarded streams over the protected transport.

```text
TCP connect
  -> version and algorithm negotiation
  -> ephemeral key exchange + server host-key signature
  -> verify known_hosts
  -> user authentication (public-key signature, password, or other method)
  -> open shell/exec/forwarding channels
```

## Host Authenticity and Key Exchange

During key exchange, both sides derive fresh symmetric keys. The server signs exchange-bound data with its host private key; the client checks that public host key against `known_hosts`, a host certificate authority, or another trusted bootstrap. Accepting an unexpected fingerprint without investigation defeats server authentication and permits a machine-in-the-middle attack.

The negotiated session keys encrypt bulk traffic. Neither the user's public key nor the server host key encrypts every packet. Modern ephemeral Diffie-Hellman key exchange also provides forward secrecy: stealing a long-term host key later does not decrypt captured sessions.

## User Authentication

Public-key authentication proves possession by signing data bound to the current SSH session. The server verifies the signature against an authorized public key. It does not encrypt a random challenge with the user's public key and ask the client to decrypt it.

```bash
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/id_ed25519_work
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519_work deploy@app.example.com
```

Use separate keys for separate trust domains, protect private keys with a passphrase, and keep agent forwarding off unless a hop genuinely requires it. An agent can sign on the user's behalf; forwarding its socket lets a compromised remote host request signatures while the session is open. See [[Security]], [[Secrets Management]], and [[Digital Signature]] for the surrounding key-handling model.

## Channels and Forwarding

One SSH connection can carry several independent channels: an interactive shell, an `exec` request, SFTP, and forwarded TCP streams. Flow control is per channel, so a large transfer and a shell share the encrypted connection without becoming one undifferentiated byte stream.

- Local forwarding: `ssh -L 15432:db.internal:5432 bastion` exposes a local port through the server.
- Remote forwarding: `ssh -R 8080:localhost:8080 bastion` exposes a listener from the remote side back to the client.
- Dynamic forwarding: `ssh -D 1080 bastion` creates a SOCKS proxy.

Forwarding extends network reach. Restrict `AllowTcpForwarding`, destination policy, and bastion accounts instead of treating encryption as authorization.

## Common Failures

- `REMOTE HOST IDENTIFICATION HAS CHANGED`: investigate a legitimate rebuild, DNS/routing error, or interception before removing the old key.
- `Permission denied (publickey)`: inspect offered identities with `ssh -vv`, file ownership/modes, server authorization, and algorithm policy.
- Works interactively but not in automation: the agent, passphrase prompt, host-key prompt, or different `HOME` is part of the hidden dependency.
- Tunnel connects but the service fails: the SSH server must be able to reach the forwarding destination; `localhost` is evaluated on the side named by the forwarding rule.

## References

- [RFC 4251: SSH Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251) — defines the transport, user-authentication, and connection protocol boundaries.
- [RFC 4253: SSH Transport Layer Protocol](https://www.rfc-editor.org/rfc/rfc4253) — specifies key exchange, server authentication, encryption, and integrity.
- [RFC 4252: SSH Authentication Protocol](https://www.rfc-editor.org/rfc/rfc4252) — defines password and public-key user authentication, including signature proof.
- [OpenSSH manual pages](https://www.openssh.com/manual.html) — primary implementation documentation for client, server, key, agent, and configuration behavior.
- [ByteByteGo: How SSH works](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-ssh-work.md) — source prompt; its rejected visual conflated transport key exchange with user authentication.
