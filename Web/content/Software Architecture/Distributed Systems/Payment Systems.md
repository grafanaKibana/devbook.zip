---
publish: true
created: 2026-07-16T11:20:02.792Z
modified: 2026-07-17T05:47:33.450Z
published: 2026-07-17T05:47:33.450Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "A routing overview for payment architecture: execution, reliability, accounting, wallets, and bank rails each close a different part of the money-movement lifecycle."
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Payment Systems

A payment system turns a business intent into external instructions, internal accounting, and evidence that money reached the expected destination. Those events are not one atomic transaction. A provider can authorize a card while the merchant has no settled funds; a timeout can hide a successful capture; a bank can return a transfer after the application displayed success.

The durable model keeps four facts separate: what the customer requested, what each external attempt reported, what the ledger posted, and what settlement or reconciliation later proved. For example, a `100.00 USD` checkout may be `CAPTURED` at the PSP, represented as a `100.00 USD` processor receivable in the ledger, absent from today's settlement file, and therefore still not available for payout. Collapsing those states into `PAID` makes recovery guesswork.

## Choose the State Model First

| Design question | Focused note | Decision boundary |
| --- | --- | --- |
| What do authorization, capture, clearing, settlement, refund, and chargeback mean? | [[Software Architecture/Distributed Systems/Card Payments\|Card Payments]] | Card roles and financial transitions; a provider response never proves every downstream state. |
| What happens after timeout, retry, duplicate callback, or PSP outage? | [[Software Architecture/Distributed Systems/Payment Reliability\|Payment Reliability]] | Unknown outcomes, durable idempotency, verified webhooks, and failover only after the first attempt is resolved. |
| Where is the authoritative balance and how are breaks found? | [[Software Architecture/Distributed Systems/Payment Ledgers and Reconciliation\|Payment Ledgers and Reconciliation]] | Append-only balanced journals, settlement evidence, payout state, and independent reconciliation. |
| How do device wallets, QR codes, custodial balances, and self-custody differ? | [[Software Architecture/Distributed Systems/Wallet and QR Payments\|Wallet and QR Payments]] | Token and presentation mechanisms do not replace authorization, ledger, or settlement contracts. |
| How do ACH, UPI, SWIFT, and foreign exchange change the workflow? | [[Software Architecture/Distributed Systems/Bank and Foreign Exchange Payments\|Bank and Foreign Exchange Payments]] | Each rail has its own acknowledgement, return, settlement, liquidity, and reconciliation semantics. |

Start with one rail and one provider unless measured availability, authorization, or cost gains justify more routes. Put the internal intent and ledger ahead of provider-specific status. When an external result is ambiguous, show `PROCESSING` or `UNKNOWN`; resolve it through provider lookup, verified callbacks, and reconciliation rather than inventing certainty.

## Canonical Source Routing

Each source below contributes one bounded decision to the focused note named beside it. The linked ByteByteGo material is provenance; primary references in the child notes govern terminology and current behavior.

### Wallet and QR Payments

- [How scan to pay works](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-scan-to-pay-work.md) — routes the scan-to-pay participants into a signed, expiring intent with idempotent confirmation, verified merchant state, timeout recovery, and reconciliation.
- [How Apple Pay and Google Pay work](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-applegoogle-pay-works.md) — separates provisioning, payment tokens, device credentials, transaction cryptograms, and merchant processing; the historical universal-wallet image remains rejected.
- [Four ways of QR code payment](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/4-ways-of-qr-code-payment.md) — keeps presentation mode independent from the underlying debit, credit, card, or account rail; its source image remains rejected.
- [Digital wallets: banks vs. blockchain](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/digital-wallet-in-traditional-banks-vs-wallet-in-blockchain.md) — distinguishes custodial ledger accounts from private-key control; its public-key/address visual remains rejected.

### Card Payments

- [How Visa works when swiping a credit card](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-visa-work-when-we-swipe-a-credit-card-at-a-merchant%27s-shop.md) — supplies the card lifecycle lead, corrected to separate authorization hold, capture, clearing, settlement, funding, reversals, refunds, and chargebacks; the fixed-timing source image remains rejected.
- [The payments ecosystem](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/the-payments-ecosystem.md) — maps merchant, gateway, processor, acquirer, network, and issuer roles without treating a bundled PSP product as the financial model.

### Payment Reliability

- [Ten principles for resilient payment systems](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/10-principles-for-building-resilient-payment-systems-by-shopify.md) — routes timeouts, circuit breaking, capacity, observability, load tests, reconciliation, and incidents into explicit failure controls.

### Payment Ledgers and Reconciliation

- [Reconciliation in payment](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/reconciliation-in-payment.md) — becomes a normalize, match, classify, carry, resolve, and audit workflow for independently produced records.
- [Money movement](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/money-movement.md) — separates transaction information, clearing, netting, settlement, merchant funding, and payout.
- [Payment system](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/payment-system.md) — anchors the intent, attempt executor, wallet, ledger, and settlement-file records.

### Bank and Foreign Exchange Payments

- [SWIFT payment messaging system](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/swift-payment-messaging-system.md) — uses the acknowledgement chain to distinguish durable instruction delivery from business acceptance, clearing, and settlement.
- [Foreign exchange payments](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/foreign-exchange-payments.md) — models prefunded currency ledgers, quote locking, conversion and settlement legs, reconciliation, and partial failure.
- [How ACH payment works](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-ach-payment-work.md) — preserves ACH roles while replacing fixed overnight timing with current network evidence; its source image remains rejected.
- [Unified Payments Interface](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/unified-payments-interface-upi-in-india.md) — separates VPA routing, payer authorization, bank posting, acknowledgement, reconciliation, and inter-participant settlement; its source image remains rejected.
- [How to learn payments](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-to-learn-payments.md) — provides the industry scope across authorities, banks, non-bank providers, clearing systems, and settlement systems without pretending the same topology applies to every country.

## References

- [CPMI glossary](https://www.bis.org/cpmi/glossary.pdf) — primary terminology for payment instructions, clearing, settlement, netting, reconciliation, and participant roles.
- [Principles for financial market infrastructures](https://www.bis.org/cpmi/publ/d101a.pdf) — CPMI-IOSCO primary risk-management standard for systemically important payment systems, including settlement finality, liquidity, operational resilience, and default management.
- [PCI DSS](https://www.pcisecuritystandards.org/standards/pci-dss/) — primary scope boundary for systems that store, process, transmit, or affect payment account data security.
