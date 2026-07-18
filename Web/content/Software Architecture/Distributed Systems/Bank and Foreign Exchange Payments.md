---
publish: true
created: 2026-07-16T11:20:03.909Z
modified: 2026-07-16T12:33:33.358Z
published: 2026-07-16T12:33:33.358Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Bank and foreign-exchange payments separate instruction delivery, account posting, returns, clearing, settlement, and currency-liquidity evidence.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Bank and Foreign Exchange Payments

Bank rails do not share one success contract. ACH processes file-based credits and debits with later returns, UPI routes instant account-to-account instructions through participating banks, SWIFT carries financial messages rather than settling them, and foreign exchange adds quote and liquidity legs. Model each rail's acknowledgement, posting, settlement, return, and reconciliation evidence explicitly.

![[Assets/System Design 101/d6433f826dcebfd6175486e97b6c27d27d97890de0478bb43c08c1de691dc57e.png]]

The industry map is a scope check. Regulatory authorities, central banks, commercial banks, non-bank providers, clearing networks, and settlement systems vary by market. A generic `PaymentProvider` adapter can normalize transport details, but it must not erase rail-specific failure states.

## ACH Batch Clearing

ACH moves U.S. credit and debit entries through an originator, an Originating Depository Financial Institution, an ACH Operator, and a Receiving Depository Financial Institution. Files are validated and processed in network windows; settlement and account posting follow network rules. Same Day ACH adds faster windows, not an atomic request-response guarantee.

Track `SUBMITTED`, `OPERATOR_ACCEPTED`, `SETTLEMENT_PENDING`, `POSTED`, `RETURN_PENDING`, `RETURNED`, and `RECONCILED`. Reconcile file control totals, trace numbers, settlement dates, and bank postings. The source image with fixed overnight times and “next-day system” framing remains rejected because current schedules and exception paths are more nuanced.

## UPI Routing and Posting

UPI is an interoperable instant-payment system operated by NPCI. A payment app or PSP resolves a Virtual Payment Address, routes through participating banks and NPCI, obtains payer authorization, and receives a transaction response. Address resolution, authentication, switch routing, debit posting, credit posting, acknowledgement, disputes, reconciliation, and participant settlement are different records.

Bind the NPCI or bank reference to the internal intent. An ambiguous timeout follows `UNKNOWN -> query -> reconcile`, and duplicate callbacks pass through idempotent transitions. The source image remains rejected because it depicts NPCI as directly mutating bank accounts and collapses bank posting with settlement.

## SWIFT Messaging Is Not Settlement

SWIFT validates and transports standardized financial messages and reports. Store-and-forward delivery and network acknowledgements prove facts about the message path. They do not prove that the receiver accepted the business instruction, posted a customer account, or completed clearing and settlement.

![[Assets/System Design 101/627ea74b051057b557fff49852525ae0a9f5590448b7002a818570464fdcee6a.png]]

Persist the instruction ID, sender, receiver, message type and version, network acknowledgement, business status, settlement reference, and reconciliation result. A negative acknowledgement can be corrected and retried. A positive network acknowledgement without business confirmation is an exception, not payment success. ISO 20022 defines messages across initiation, clearing, settlement, and cash management; the business process determines which evidence closes which state.

## Foreign Exchange and Liquidity

Cross-currency payments carry at least presentment, conversion, and settlement amounts. Record the quote ID, source and destination currencies, rate, fee, expiration, rounding rule, and who bears slippage. Reject or requote after expiry; silently using a new rate changes the customer's contract.

![[Assets/System Design 101/edc5a3fba02ab42a17b79453d45a26df72be0628447dc0c1c6b53d0e0adc9064.png]]

Suppose a provider prefunds USD and EUR accounts, collects `100.00 USD`, locks `0.88 EUR per USD`, and posts an `88.00 EUR` payable. Collection, conversion, inventory transfer, and recipient settlement each need their own status and journal. If collection succeeds but conversion or payout fails, retain the collected liability and expose a recoverable state; do not mark the whole payment failed and forget held funds.

Multi-currency settlement avoids conversion when presentment and configured settlement currencies match. It costs more bank accounts, liquidity management, and reconciliation per currency. Automatic conversion reduces that operational surface but makes rate, fee, expiry, and rounding evidence part of every transaction.

## References

- [How ACH payments work (Nacha)](https://www.nacha.org/content/how-ach-payments-work) — current network roles and settlement framing for ACH credits and debits.
- [UPI product overview (NPCI)](https://www.npci.org.in/product/upi) — operator documentation for UPI participants and product behavior.
- [UPI settlement process (NPCI)](https://www.npci.org.in/PDF/npci/others/UPI-Settlement-Process.pdf) — participant settlement accounts and settlement processing.
- [Swift InterAct](https://www.swift.com/products/interact) — official store-and-forward messaging, validation, delivery status, and use cases.
- [Swift ISO 20022 standards](https://www.swift.com/standards/iso-20022/iso-20022-standards) — message domains for initiation, clearing, settlement, and cash management.
- [Stripe multi-currency settlement](https://docs.stripe.com/payouts/multicurrency-settlement) — official balances and bank-account model for settlement without automatic conversion.
