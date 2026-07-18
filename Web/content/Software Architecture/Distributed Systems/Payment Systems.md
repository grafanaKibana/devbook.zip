---
publish: true
created: 2026-07-18T08:17:54.512Z
modified: 2026-07-18T09:50:14.208Z
published: 2026-07-18T09:50:14.208Z
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

# Intro

A payment system turns one business intent into external instructions, internal accounting, and evidence that money reached the expected destination. Those events are not one transaction. An issuer can authorize a card while the merchant has no settled funds; a timeout can hide a successful capture; a bank can return a transfer after the application displayed success.

Keep four records separate: what the customer requested, what each execution attempt reported, what the ledger posted, and what settlement or reconciliation later proved. A `100.00 USD` checkout can be `CAPTURED` at the PSP, represented as a `100.00 USD` processor receivable in the ledger, absent from today's settlement file, and therefore unavailable for payout. One mutable `PAID` flag cannot represent those facts without losing recovery evidence.

## Payment State Is Evidence, Not One Status

Use stable identities across the lifecycle:

- A **payment intent** owns the business objective: merchant, order, amount, currency, permitted methods, and expiry.
- A **payment attempt** owns one provider or rail execution, including the idempotency key, request fingerprint, provider reference, and observed outcome.
- A **ledger transaction** owns balanced entries for assets and liabilities.
- A **settlement record** owns independently produced evidence from a provider report, rail file, payout report, or bank statement.

The financial transitions answer different questions:

| Transition | Evidence gained | Evidence still missing |
| --- | --- | --- |
| **Authorization** | The issuer or account provider approved the request and may have reserved spending capacity | Capture, clearing, or merchant funds |
| **Capture** | The merchant submitted an authorized amount for financial processing | Clearing and settlement |
| **Clearing** | Participants exchanged and validated records and calculated obligations | Discharge of those obligations |
| **Settlement** | Participants discharged obligations using the rail's agreed asset or accounts | Merchant payout or destination-bank finality |
| **Payout** | Available platform or PSP funds were instructed to an external account | Irrevocable availability at the destination bank |
| **Refund** | A new operation returns value against a successful payment | Erasure of the original capture or fulfillment |
| **Chargeback** | An issuer-led dispute created a new financial claim | Automatic proof that the original authorization never occurred |
| **Reconciliation** | Independent internal and external records were matched or classified as a break | A substitute for missing ledger entries or rail evidence |

A reusable state machine needs ambiguous and adverse paths:

```text
REQUIRES_METHOD -> REQUIRES_ACTION -> AUTHORIZED
AUTHORIZED -> CAPTURE_PENDING -> CAPTURED -> SETTLEMENT_PENDING -> SETTLED
SETTLED -> PAYOUT_PENDING -> PAID_OUT -> PAYOUT_RETURNED
CAPTURED -> REFUND_PENDING -> REFUNDED
CAPTURED | SETTLED -> DISPUTED -> CHARGEBACK_POSTED | DISPUTE_WON
PENDING -> UNKNOWN -> RESOLVED | RECONCILIATION_BREAK
```

Also model `DECLINED`, `CANCELED`, `EXPIRED`, and rail-specific return states. Transitions should be conditional and monotonic for the evidence they represent. An `AUTHORIZED` callback arriving after `CAPTURED` is useful duplicate evidence, not permission to move backward.

## Card Payments

A card payment coordinates the merchant, gateway or PSP, acquirer, card network, and issuer. One company may bundle several roles, but bundling does not collapse the lifecycle.

![[Assets/System Design 101/6edace788c2b754e70b48b8e29525f9d4d002051476ac99d36a8bc96e6d11b63.png]]

Store the operation, amount, currency, attempt ID, provider reference, and evidence behind each transition. “The PSP approved it” is too vague to decide whether goods can ship, funds can be paid out, or a dispute needs a new journal.

### Authorization and Capture Are Business Decisions

Separate authorization from capture when fulfillment occurs later. A hotel can authorize `300.00 USD`, capture `247.50 USD` after checkout, and cancel the unused hold. A merchant that fulfills immediately can capture with authorization and avoid the extra failure window.

An uncaptured authorization is reversed or expires. Once captured, returning value is a refund linked to the original operation. A chargeback is not a refund: the cardholder disputes through the issuer, the scheme opens a case, and the merchant may lose funds while evidence is reviewed. Preserve the original capture and post reversals, refunds, and disputes as new operations. Rewriting `CAPTURED` to `FAILED` destroys the accounting lineage.

### Fulfillment Boundary

Do not fulfill from a browser redirect or payer screen. The customer can close the tab after approval but before the redirect reaches the merchant. Fulfill from a verified server event or provider lookup, and make fulfillment itself idempotent. A later refund or dispute changes the financial position; it does not mean fulfillment never happened.

The adopted participant visual is useful for role boundaries, but fixed timing is not part of the model. Capture, clearing, interbank settlement, merchant funding, and payout schedules vary by merchant, acquirer, network, region, and exception path.

## Bank and Foreign Exchange Payments

Bank rails do not share one success contract. ACH processes file-based credits and debits with later returns, UPI routes instant account-to-account instructions through participating banks, SWIFT carries financial messages rather than settling them, and foreign exchange adds quote and liquidity legs.

![[Assets/System Design 101/d6433f826dcebfd6175486e97b6c27d27d97890de0478bb43c08c1de691dc57e.png]]

The industry map is a scope check: regulatory authorities, central banks, commercial banks, non-bank providers, clearing networks, and settlement systems vary by market. A provider adapter can normalize transport details, but it must retain each rail's acknowledgement, posting, return, settlement, liquidity, and reconciliation states.

### ACH Batch Clearing

ACH moves U.S. credit and debit entries through an originator, an Originating Depository Financial Institution, an ACH Operator, and a Receiving Depository Financial Institution. Files are validated and processed in network windows; settlement and account posting follow network rules. Same Day ACH adds faster windows, not an atomic request-response guarantee.

Track `SUBMITTED`, `OPERATOR_ACCEPTED`, `SETTLEMENT_PENDING`, `POSTED`, `RETURN_PENDING`, `RETURNED`, and `RECONCILED`. Reconcile file control totals, trace numbers, settlement dates, and bank postings. Do not encode fixed overnight timing or describe the rail as only a “next-day system”; schedules and exception paths are more nuanced.

### UPI Routing and Posting

UPI is an interoperable instant-payment system operated by NPCI. An app or PSP resolves a Virtual Payment Address, routes through participating banks and NPCI, obtains payer authorization, and receives a transaction response. Address resolution, authentication, switch routing, debit posting, credit posting, acknowledgement, disputes, reconciliation, and participant settlement remain different records.

Bind the NPCI or bank reference to the internal intent. An ambiguous timeout follows `UNKNOWN -> query -> reconcile`, and duplicate callbacks pass through idempotent transitions. NPCI routes and coordinates the payment; the participating banks own account posting.

## SWIFT Messaging Is Not Settlement

SWIFT validates and transports standardized financial messages and reports. Store-and-forward delivery and network acknowledgements prove facts about the message path. They do not prove that the receiver accepted the business instruction, posted a customer account, or completed clearing and settlement.

![[Assets/System Design 101/627ea74b051057b557fff49852525ae0a9f5590448b7002a818570464fdcee6a.png]]

Persist the instruction ID, sender, receiver, message type and version, network acknowledgement, business status, settlement reference, and reconciliation result. A negative acknowledgement can be corrected and retried. A positive network acknowledgement without business confirmation remains an exception. ISO 20022 defines messages across initiation, clearing, settlement, and cash management; the business process decides which evidence closes each state.

## Foreign Exchange and Liquidity

Cross-currency payments carry at least presentment, conversion, and settlement amounts. Record the quote ID, source and destination currencies, rate, fee, expiration, rounding rule, and who bears slippage. Reject or requote after expiry; silently using a new rate changes the customer's contract.

![[Assets/System Design 101/edc5a3fba02ab42a17b79453d45a26df72be0628447dc0c1c6b53d0e0adc9064.png]]

Suppose a provider prefunds USD and EUR accounts, collects `100.00 USD`, locks `0.88 EUR per USD`, and posts an `88.00 EUR` payable. Collection, conversion, inventory transfer, and recipient settlement each need a status and journal. If collection succeeds but conversion or payout fails, retain the collected liability and expose a recoverable state; do not mark the payment failed and forget held funds.

Multi-currency settlement avoids conversion when presentment and configured settlement currencies match. It costs more bank accounts, liquidity management, and reconciliation per currency. Automatic conversion reduces that surface but makes rate, fee, expiry, and rounding evidence part of every transaction.

## Durable Idempotency

Payment idempotency needs two contracts: a durable local attempt keyed to the merchant operation and a provider that honors the same key for repeated calls. The generic mechanism and its database race boundaries belong in [[Idempotency]]; the payment-specific sequence is reserve, call, then reconcile.

1. In a short transaction, insert a `PENDING` attempt with a unique `(merchant, provider, idempotency_key)` constraint, the request fingerprint, and a stable attempt ID.
2. If the attempt is `COMPLETED`, replay its stored response. If it is `PENDING` or `UNKNOWN`, return the current state or enter resolution; never allocate another provider key.
3. Commit before calling the provider. Pass the same key and immutable request parameters.
4. Persist the result in a second short transaction through a conditional transition such as `PENDING -> AUTHORIZED` or `PENDING -> UNKNOWN`.

```http
POST /payments
Idempotency-Key: order_8127:card:capture:v1
Content-Type: application/json

{
  "amount": 10000,
  "currency": "USD"
}
```

```sql
CREATE UNIQUE INDEX ux_payment_attempt_provider_key
ON payment_attempt(merchant_id, provider, idempotency_key);
```

Reusing the key with `12000 USD` must return a conflict. A duplicate with the same key and fingerprint returns the same attempt ID and current response. Never hold a local database transaction across the provider call: it holds locks during network latency and still cannot atomically commit the provider's database with yours.

The defensible claim is one durable effect at the declared boundary. A provider can guarantee one charge per key while the local database guarantees one completed attempt per key. Ledger posting, fulfillment, email, and downstream events need their own conditional transition, inbox, or outbox.

## Unknown Outcomes

A five-second timeout after capture submission has three explanations: the PSP never received the request, accepted it before the response was lost, or is still processing it. Treat timeout as evidence of uncertainty:

1. Mark the same attempt `UNKNOWN`; keep its merchant reference and idempotency key.
2. Query the PSP by provider or merchant reference.
3. Retry the same provider operation with the same key only when its retention and request-equivalence contract permits it.
4. Accept signed callback evidence through a conditional transition.
5. Reconcile against provider reports before declaring the attempt missing.
6. Route elsewhere only after the first attempt is terminal or a deliberate duplicate-risk policy permits it.

Blind failover converts uncertainty into a probable double charge.

## PSP Routing and Failure Isolation

Route before creating the attempt and persist the rule version. Inputs can include currency, country, method, merchant contract, provider health, cost, and measured authorization rate.

| Strategy | Benefit | Cost | Use when |
| --- | --- | --- | --- |
| One PSP | Simple integration and reconciliation | One provider outage stops acceptance | Early products and low volume |
| Terminal failover | Better availability for proven failures | Portable tokens and normalized failures | A second PSP materially reduces outage risk |
| Dynamic routing | Cost or authorization optimization | More paths, experiments, and reconciliation surfaces | Volume funds a dedicated payments platform |

Trip circuit breakers on technical failure and saturation, not issuer declines. Bound calls by the checkout latency budget, isolate pools, cap concurrent attempts, and shed load before queues exhaust the database.

![[Assets/System Design 101/1adb865f841a8c5c151bbe3f1e971ed5a58335ff6ddbda5d983c0ba7152b8953.png]]

Measure latency, traffic, technical errors, declines by reason, unknown outcomes, saturation, webhook lag, and reconciliation breaks. Load tests need retries and callback bursts because those paths amplify incidents.

## Verified Webhooks

[[Webhooks]] are asynchronous evidence, not trusted commands. Verify the signature over the exact raw body and signed timestamp, reject stale timestamps, and store `(provider, event_id)` under a unique constraint. Persist the event before returning `2xx`, then process it asynchronously.

A duplicate success event must not fulfill twice. If a handler commits a transition but fails before acknowledging its queue message, the retry observes the applied event and becomes a no-op. Retrieval APIs and scheduled reconciliation recover callbacks that never arrive.

## Intent, Attempt, Journal, and Settlement Evidence

Provider state and accounting state answer different questions. A PSP records what it observed on a rail; the ledger records what the platform owns or owes; settlement files and bank statements show what moved externally. Keep the records linked but independent so fees, returns, disputes, payout failures, and missing callbacks have an honest place to land.

![[Assets/System Design 101/dfeeea5e79a61224470de2ecd8d703a0bb26a602fda2bac03ff5f9c3b6dd0bea.jpg]]

A marketplace order split across three sellers creates three stable allocation records or payment orders. Recomputing the split only in memory lets a retry charge or credit every seller again.

## Clearing, Settlement, and Fund Flow

Clearing exchanges and validates transaction information and determines obligations. Netting reduces multiple obligations to a smaller set of positions. Settlement discharges those obligations. Merchant funding and payout can occur on another schedule.

![[Assets/System Design 101/d6f78f4ec016cfa7a08a83d29b3b45ed87fc423ef849968bac2af537cf2b7fa4.jpg]]

For a captured `100.00 USD` payment with a `3.00 USD` processor fee:

```text
Capture accepted
  Dr Processor receivable     100.00
  Cr Merchant payable         100.00

Processor fee reported
  Dr Payment processing fee     3.00
  Cr Processor receivable       3.00

Settlement reaches bank
  Dr Bank cash                  97.00
  Cr Processor receivable      97.00
```

Every journal balances and retains the currency. A refund, return, reserve, or chargeback creates a linked journal; it never overwrites the capture. A mutable balance can be a projection, but append-only entries are the audit trail.

Settlement is not payout. Provider funds can move from `pending` to `available`, then a payout can be initiated, reported paid, and later returned by the destination bank. Each state needs its own evidence.

## Reconciliation

Reconciliation compares independently produced intents, attempts, journals, PSP exports, settlement batches, payout reports, and bank statements. It detects errors that API idempotency cannot: missing callbacks, duplicate provider operations, fees on another date, late returns, and cut-off mismatches.

![[Assets/System Design 101/324f75cc04635ee4a220ea741e4dd81b38c04660eb0ec99de9a952953fa1b777.jpg]]

Use an owned break workflow:

1. **Normalize** currencies, minor units, time zones, identifiers, signs, and record types without discarding raw input.
2. **Match** stable provider and merchant references, then verify amount, currency, operation, and lifecycle relationship.
3. **Classify** unmatched, duplicated, amount-mismatched, fee-mismatched, and state-mismatched records.
4. **Carry** plausible cut-off records into the next window with a deadline.
5. **Resolve or escalate** through a controlled journal, provider correction, or named investigation owner.
6. **Audit** automated and manual decisions with input hashes, rule version, actor, and resulting journal reference.

An internal capture at `23:59:55 UTC` can appear in the next provider file at `00:00:30 UTC`. Carry it through one tolerance window. If it remains missing, open an owned exception with the amount at risk; do not post a correction while timing alone explains the break.

## Mobile Wallet Tokenization

“Wallet” can mean a device presents a tokenized card credential, an operator maintains a custodial account, or a user controls a blockchain private key. Keep five mobile-wallet concepts separate:

1. **Provisioning** associates a card or account after issuer, network, and device checks.
2. **Payment token** substitutes for the PAN and can be constrained to a device, merchant, or usage domain.
3. **Device credential and user verification** authorize release of transaction data; they do not settle payment.
4. **Transaction cryptogram or signed payload** binds transaction-specific data for verification.
5. **Merchant processing** still routes through a gateway, acquirer, network, issuer, or account rail.

Apple documents an encrypted payment token produced with Secure Element participation. Google Pay can return PAN-based data or a device token with a cryptogram; direct integrations must verify, decrypt, expire, and protect the payload. Tokenization reduces PAN exposure but does not automatically remove PCI DSS scope. Prefer hosted or gateway-tokenized integration unless direct payload handling is a product requirement.

## QR Presentation and Replay Safety

| Presentation | Static | Dynamic |
| --- | --- | --- |
| **Merchant-presented** | Reusable merchant identifier; payer confirms merchant and amount | Short-lived intent binds merchant, amount, currency, reference, and expiry |
| **Consumer-presented** | Weak choice for reusable credentials | Short-lived wallet credential or transaction payload for merchant scanning |

Presentation direction does not determine whether the rail is debit, credit, card, or account-to-account. For a dynamic merchant code, sign or MAC `intent_id`, merchant, amount, currency, expiration, and nonce. The server loads the canonical intent, rejects expiry or merchant mismatch, and accepts one idempotent confirmation. A static QR resolves only merchant identity; the server creates a fresh attempt after the payer confirms the amount.

## Scan-to-Pay Example

![[Assets/System Design 101/17273442bd87d4a601cec61990c96bd932a966ce9118ff90e92dd6c8a34fb0ca.png]]

1. Checkout creates an expiring payment intent and signed QR payload.
2. The wallet displays the canonical merchant and amount and obtains user authorization.
3. The wallet submits the intent with a stable confirmation key.
4. The service changes `AWAITING_PAYER -> PROCESSING` once and creates one provider attempt.
5. The merchant reads a verified server result, not the payer's screen.
6. Timeout produces `UNKNOWN`; lookup, callbacks, and reconciliation resolve it.

The visual shows participants, not replay prevention, ledger posting, callback verification, or reconciliation. A client-side “paid” screen is never settlement evidence.

## Custodial Accounts and Self-Custody

| Question | Custodial ledger account | Self-custodied blockchain wallet |
| --- | --- | --- |
| Authorization | Operator authenticates the customer | Private-key holder signs the transaction |
| Authoritative balance | Operator ledger reconciled to safeguarded or bank funds | Replicated ledger state for the chain |
| Recovery | Controlled support and compensating entries may be possible | Lost keys may be unrecoverable |
| Operational burden | Ledger integrity, custody, compliance, settlement | Key custody, fees, nonce handling, chain monitoring |

Choose custody when the product needs regulated account controls, reversible support operations, and bank or card integration. Choose self-custody only when user-controlled keys and protocol transfer semantics justify the recovery and chain risks. An Ethereum externally owned account address is derived from the public key; it is not the public key itself.

## References

### Provenance

- [How scan to pay works](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-scan-to-pay-work.md) — participant flow reconciled with signed intents, replay prevention, server verification, unknown outcomes, and reconciliation.
- [How Apple Pay and Google Pay work](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-applegoogle-pay-works.md) — provisioning, payment tokens, device credentials, cryptograms, and merchant processing.
- [Four ways of QR code payment](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/4-ways-of-qr-code-payment.md) — presentation modes retained without assigning unsupported debit or credit semantics.
- [Digital wallets: banks vs. blockchain](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/digital-wallet-in-traditional-banks-vs-wallet-in-blockchain.md) — custodial ledger accounts distinguished from private-key control.
- [How Visa works when swiping a credit card](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-visa-work-when-we-swipe-a-credit-card-at-a-merchant%27s-shop.md) — card lifecycle reconciled without fixed timing or collapsed settlement states.
- [The payments ecosystem](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/the-payments-ecosystem.md) — merchant, gateway, processor, acquirer, network, and issuer roles.
- [Ten principles for resilient payment systems](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/10-principles-for-building-resilient-payment-systems-by-shopify.md) — failure isolation, capacity, observability, testing, reconciliation, and incident controls.
- [Reconciliation in payment](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/reconciliation-in-payment.md) — normalize, match, classify, carry, resolve, and audit workflow.
- [Money movement](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/money-movement.md) — clearing, netting, settlement, merchant funding, and payout separation.
- [Payment system](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/payment-system.md) — intent, attempt, executor, wallet, ledger, and settlement-file records.
- [SWIFT payment messaging system](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/swift-payment-messaging-system.md) — acknowledgement chain separated from business acceptance and settlement.
- [Foreign exchange payments](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/foreign-exchange-payments.md) — prefunded currency ledgers, quote locking, conversion, settlement, and partial failure.
- [How ACH payment works](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-ach-payment-work.md) — ACH roles retained without fixed overnight timing.
- [Unified Payments Interface](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/unified-payments-interface-upi-in-india.md) — routing, authorization, bank posting, acknowledgement, reconciliation, and participant settlement.
- [How to learn payments](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-to-learn-payments.md) — scope across authorities, banks, non-bank providers, clearing systems, and settlement systems.

### Primary and implementation sources

- [CPMI glossary](https://www.bis.org/cpmi/glossary.pdf) — primary terminology for payment instructions, clearing, settlement, netting, reconciliation, and participant roles.
- [Principles for financial market infrastructures](https://www.bis.org/cpmi/publ/d101a.pdf) — primary risk-management standard covering settlement finality, liquidity, operational resilience, and default management.
- [PCI DSS](https://www.pcisecuritystandards.org/standards/pci-dss/) — scope boundary for systems that store, process, transmit, or affect payment account data.
- [How ACH payments work](https://www.nacha.org/content/how-ach-payments-work) — current ACH roles and settlement framing.
- [UPI product overview](https://www.npci.org.in/product/upi) — operator documentation for UPI participants and product behavior.
- [UPI settlement process](https://www.npci.org.in/PDF/npci/others/UPI-Settlement-Process.pdf) — participant settlement accounts and processing.
- [Swift InterAct](https://www.swift.com/products/interact) — store-and-forward messaging, validation, and delivery status.
- [Swift ISO 20022 standards](https://www.swift.com/standards/iso-20022/iso-20022-standards) — message domains spanning initiation, clearing, settlement, and cash management.
- [Stripe multi-currency settlement](https://docs.stripe.com/payouts/multicurrency-settlement) — balances and bank-account model for settlement without automatic conversion.
- [Visa Developer glossary](https://developer.visa.com/pages/glossary) — authorization, clearing, settlement, acquirer, and issuer definitions.
- [Adyen capture](https://docs.adyen.com/online-payments/capture/) — authorization/capture separation, partial capture, cancellation, and asynchronous results.
- [Stripe refunds](https://docs.stripe.com/refunds) — refund behavior and its link to the original payment.
- [Stripe disputes](https://docs.stripe.com/disputes) — chargeback lifecycle, evidence window, and balance impact.
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) — stable keys, parameter comparison, retention, and replayed responses.
- [Adyen API idempotency](https://docs.adyen.com/development-resources/api-idempotency/) — duplicate requests, transient errors, key scope, and retry boundaries.
- [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html) — reliable handoff from a local transaction to downstream messaging.
- [Stripe Payment Intents](https://docs.stripe.com/payments/payment-intents) — durable intent lifecycle for asynchronous and multi-step methods.
- [Stripe payment status updates](https://docs.stripe.com/payments/payment-intents/verifying-status) — server-side webhook, fulfillment, polling, and status-verification guidance.
- [Adyen settlement details report](https://docs.adyen.com/reporting/settlement-reconciliation/transaction-level/settlement-details-report) — transaction-level settlement, fee, refund, dispute, and payout evidence.
- [Stripe payouts](https://docs.stripe.com/payouts) — pending and available balances, payout schedules, and payout failures.
- [Stripe balance transaction types](https://docs.stripe.com/reports/balance-transaction-types) — records used to explain balance changes and reconciliation.
- [EMV Payment Tokenisation](https://www.emvco.com/emv-technologies/payment-tokenisation/) — token roles, domains, and constraints.
- [Apple payment token format](https://developer.apple.com/documentation/PassKit/payment-token-format-reference) — encrypted payment token structure and validation boundary.
- [Google Pay payment data cryptography](https://developers.google.com/pay/api/web/guides/resources/payment-data-cryptography) — signed and encrypted payload, expiry, cryptogram, and direct-integration requirements.
- [EMV QR Codes](https://www.emvco.com/emv-technologies/qr-codes/) — merchant-presented and consumer-presented formats.
- [PCI Tokenization Product Security Guidelines](https://www.pcisecuritystandards.org/documents/Tokenization_Product_Security_Guidelines.pdf) — tokenization security properties and system boundaries.
- [Ethereum accounts](https://ethereum.org/developers/docs/accounts) — private-key control and address derivation for externally owned accounts.
