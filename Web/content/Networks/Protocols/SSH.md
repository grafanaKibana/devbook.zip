---
publish: true
created: 2026-08-20T20:41:15.634Z
modified: 2026-08-20T20:41:15.635Z
published: 2026-08-20T20:41:15.635Z
topic:
  - Networks
subtopic:
  - Protocols
summary: An encrypted remote-access protocol with host authentication, user authentication, and multiplexed channels.
level:
  - "3"
priority: High
status: Ready to Repeat
---

SSH provides an encrypted, integrity-protected connection for remote shells, command execution, file transfer, and forwarding. Three protocol layers do distinct jobs. The transport layer negotiates algorithms and authenticates the server host. User authentication establishes which account may enter. The connection layer multiplexes shells, commands, and forwarded streams over the protected transport.

```text
TCP connect
  -> version and algorithm negotiation
  -> ephemeral key exchange + server host-key signature
  -> verify known_hosts
  -> user authentication (public-key signature, password, or other method)
  -> open shell/exec/forwarding channels
```

# Host Authenticity and Key Exchange

During key exchange, both sides derive fresh session keys. The server signs exchange-bound data with its host private key. The client then checks the public host key against `known_hosts`, a host certificate authority, or another trusted bootstrap. Accepting an unexpected fingerprint without investigation discards server authentication and opens the connection to a machine-in-the-middle attack.

The negotiated session keys encrypt bulk traffic. Neither the user's public key nor the server host key encrypts every packet. Modern ephemeral Diffie-Hellman key exchange also provides forward secrecy: stealing a long-term host key later does not decrypt captured sessions.

# User Authentication

Public-key authentication proves possession of a private key by signing data bound to the current SSH session. The server verifies that signature against an authorized public key. The mechanism is not public-key encryption of a random challenge followed by client-side decryption.

```bash
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/id_ed25519_work
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519_work deploy@app.example.com
```

Use separate keys for separate trust domains, protect private keys with a passphrase, and keep agent forwarding off unless a hop genuinely requires it. An agent can sign on the user's behalf. Forwarding its socket lets a compromised remote host request signatures while the session is open. See [[Security]], [[Secrets Management]], and [[Digital Signature]] for the surrounding key-handling model.

# Channels and Forwarding

One SSH connection can carry several independent channels: an interactive shell, an `exec` request, SFTP, and forwarded TCP streams. Flow control is per channel, so a large transfer and a shell share the encrypted connection without becoming one undifferentiated byte stream.

- Local forwarding: `ssh -L 15432:db.internal:5432 bastion` exposes a local port through the server.
- Remote forwarding: `ssh -R 8080:localhost:8080 bastion` exposes a listener from the remote side back to the client.
- Dynamic forwarding: `ssh -D 1080 bastion` creates a SOCKS proxy.

Forwarding extends network reach. Encryption does not authorize that reach. `AllowTcpForwarding`, destination policy, and bastion-account permissions must constrain where a channel may connect.

# Common Failures

- `REMOTE HOST IDENTIFICATION HAS CHANGED`: investigate a legitimate rebuild, DNS/routing error, or interception before removing the old key.
- `Permission denied (publickey)`: inspect offered identities with `ssh -vv`, file ownership/modes, server authorization, and algorithm policy.
- Works interactively but not in automation: the agent, passphrase prompt, host-key prompt, or different `HOME` is part of the hidden dependency.
- Tunnel connects but the service fails: the SSH server must be able to reach the forwarding destination. `localhost` is evaluated on the side named by the forwarding rule.

# References

- [SSH Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251)
- [OpenSSH manual pages](https://www.openssh.com/manual.html)
