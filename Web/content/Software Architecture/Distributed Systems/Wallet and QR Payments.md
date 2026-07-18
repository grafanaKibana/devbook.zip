---
publish: true
created: 2026-07-16T11:20:03.648Z
modified: 2026-07-16T11:20:03.648Z
published: 2026-07-16T11:20:03.648Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Device wallets, QR presentation, custodial balances, and self-custody use different credentials but still require explicit authorization and settlement states.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Wallet and QR Payments

“Wallet” can mean a device presents a tokenized card credential, an operator maintains a custodial account ledger, or a user controls a blockchain private key. A QR code adds another axis: it packages an identifier or short-lived payment intent for scanning. None of these mechanisms alone proves that funds settled.

## Mobile Wallet Tokenization

Separate five concepts often collapsed into “the wallet sends a token”:

1. **Provisioning** associates a card or account with a wallet after issuer, network, and device checks.
2. **Payment token** substitutes for the PAN and can be constrained to a device, merchant, or usage domain.
3. **Device credential and user verification** authorize release of transaction data; they do not settle payment.
4. **Transaction cryptogram or signed payload** binds transaction-specific data for downstream verification.
5. **Merchant processing** still routes the method through a gateway, acquirer, network, issuer, or account rail.

Apple documents an encrypted payment token produced with Secure Element participation. Google Pay can return PAN-based data or a device token with a cryptogram; direct integrations must verify, decrypt, expire, and protect the payload. No single historical server-vault diagram is a universal wallet architecture, so that source image remains rejected.

Tokenization reduces PAN exposure but does not automatically remove PCI DSS scope. Prefer hosted or gateway-tokenized integration unless direct payload handling is a product requirement. Keep token vault and detokenization access narrow, rotated, audited, and absent from logs.

## QR Presentation and Replay Safety

| Presentation | Static | Dynamic |
| --- | --- | --- |
| **Merchant-presented** | Reusable merchant identifier; payer confirms merchant and amount | Short-lived intent binds merchant, amount, currency, reference, and expiry |
| **Consumer-presented** | Weak choice for reusable payment credentials | Short-lived wallet credential or transaction payload for merchant scanning |

Presentation does not determine whether the rail is debit, credit, card, or account-to-account. EMVCo standardizes QR data formats; the provider contract defines the messages after parsing. The four-mode source image remains rejected because it assigns unsupported debit and credit semantics to presentation direction.

For a dynamic merchant-presented code, sign or MAC `intent_id`, merchant, amount, currency, expiration, and nonce. The server loads the canonical intent, rejects expiry or merchant mismatch, and accepts one idempotent confirmation. A static QR should resolve only a merchant identity; the server creates a fresh attempt after the payer confirms the amount.

## Scan-to-Pay Example

![[Assets/System Design 101/17273442bd87d4a601cec61990c96bd932a966ce9118ff90e92dd6c8a34fb0ca.png]]

1. Checkout creates an expiring payment intent and signed QR payload.
2. The wallet scans it, displays canonical merchant and amount, and obtains user authorization.
3. The wallet submits the intent with a stable confirmation key.
4. The payment service changes `AWAITING_PAYER -> PROCESSING` once and creates one provider attempt.
5. The merchant reads a verified server result, not the payer's screen.
6. Timeout produces `UNKNOWN`; lookup, callback processing, and reconciliation resolve it.

The visual shows the participants, not replay prevention, ledger posting, callback verification, or reconciliation. A client-side “paid” screen is never settlement evidence.

## Custodial Accounts and Self-Custody

| Question | Custodial ledger account | Self-custodied blockchain wallet |
| --- | --- | --- |
| Authorization | Operator authenticates the customer | Private-key holder signs the transaction |
| Authoritative balance | Operator ledger reconciled to safeguarded or bank funds | Replicated ledger state for the chain |
| Recovery | Controlled support and compensating entries may be possible | Lost keys may be unrecoverable |
| Operational burden | Ledger integrity, custody, compliance, settlement | Key custody, fees, nonce handling, chain monitoring |

Choose custody when the product needs regulated account controls, reversible support operations, and bank or card integration. Choose self-custody only when user-controlled keys and protocol-level transfer semantics justify the recovery and chain risks. On Ethereum, an externally owned account address is derived from the public key; it is not simply the public key. The source visual asserting that equivalence remains rejected.

## References

- [EMV Payment Tokenisation](https://www.emvco.com/emv-technologies/payment-tokenisation/) — official token roles, domains, and constraints.
- [Apple payment token format](https://developer.apple.com/documentation/PassKit/payment-token-format-reference) — official encrypted Apple Pay token structure and validation boundary.
- [Google Pay payment data cryptography](https://developers.google.com/pay/api/web/guides/resources/payment-data-cryptography) — official signed and encrypted payload, expiry, cryptogram, and direct-integration requirements.
- [EMV QR Codes](https://www.emvco.com/emv-technologies/qr-codes/) — official merchant-presented and consumer-presented formats and the boundary of the QR specification.
- [PCI Tokenization Product Security Guidelines](https://www.pcisecuritystandards.org/documents/Tokenization_Product_Security_Guidelines.pdf) — tokenization security properties and system boundaries.
- [Ethereum accounts](https://ethereum.org/developers/docs/accounts) — private-key control and address derivation for externally owned accounts.
