---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Card payments coordinate merchant, PSP, acquirer, network, and issuer states from authorization through settlement, refund, and dispute."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Card Payments

A card payment is a sequence of financial operations shared by several parties. The merchant creates the sale, a gateway or PSP exposes the integration, the acquirer sponsors the merchant side, the network routes messages, and the issuer decides whether the cardholder account can authorize the amount. One company may bundle several roles, but the state transitions remain distinct.

![[System Design 101/6edace788c2b754e70b48b8e29525f9d4d002051476ac99d36a8bc96e6d11b63.png]]

The application should store the operation, amount, currency, attempt ID, provider reference, and current evidence. “The PSP approved it” is too vague to decide whether goods can ship, funds can be paid out, or a later dispute needs a new journal entry.

## Authorization Through Payout

| Transition | What it proves | What it does not prove |
| --- | --- | --- |
| **Authorization** | The issuer approved the request and usually reserved spending capacity | The merchant received funds |
| **Capture** | The merchant submitted an authorized amount for financial processing | Clearing or settlement completed |
| **Clearing** | Participants exchanged and validated financial records and calculated obligations | Cash reached the merchant's bank |
| **Settlement** | Participants discharged obligations according to the rail | A merchant payout arrived or cannot be returned |
| **Payout** | The PSP instructed available funds to an external bank account | The destination bank made them irrevocably available |

A useful state machine admits more than the happy path:

```text
REQUIRES_METHOD -> REQUIRES_ACTION -> AUTHORIZED
AUTHORIZED -> CAPTURE_PENDING -> CAPTURED -> SETTLEMENT_PENDING -> SETTLED
CAPTURED -> REFUND_PENDING -> REFUNDED
CAPTURED | SETTLED -> DISPUTED -> CHARGEBACK_POSTED | DISPUTE_WON
```

Also model `DECLINED`, `CANCELED`, `EXPIRED`, and `UNKNOWN`. A timeout after capture submission is not a decline; [[Payment Reliability]] owns the recovery rules. Settlement and payout evidence belong beside the journals described in [[Payment Ledgers and Reconciliation]].

## Authorization and Capture Are Business Decisions

Use separate authorization and capture when fulfillment must occur later. A hotel can authorize `300.00 USD`, capture `247.50 USD` after checkout, and cancel the unused hold. A merchant shipping immediately can capture with authorization and remove the extra failure window.

An uncaptured authorization is reversed or expires. Once captured, returning value is a refund linked to the original operation. A chargeback is not a refund: the cardholder disputes through the issuer, the scheme opens a case, and the merchant may lose funds while evidence is reviewed. Preserve the original capture and post refunds, reversals, and disputes as new operations. Rewriting `CAPTURED` to `FAILED` destroys the accounting lineage.

## Fulfillment Boundary

Do not fulfill from a browser redirect. The customer can close the tab after issuer approval but before the redirect reaches the merchant. Fulfill from a verified server event or a provider lookup, and make the fulfillment operation idempotent. A later refund or dispute changes the financial position; it does not mean the original fulfillment never happened.

## Rejected Lifecycle Visual

The historical card visual is not embedded because it treats an issuer hold as frozen money, fixes capture and funding to one end-of-day schedule, and collapses capture, clearing, interbank settlement, and merchant funding. Timing varies by merchant, acquirer, network, region, and exception path. The timing-neutral lifecycle above is the safer reusable model.

## References

- [Visa Developer glossary](https://developer.visa.com/pages/glossary) — network definitions for authorization, clearing, settlement, acquirers, and issuers.
- [Adyen capture](https://docs.adyen.com/online-payments/capture/) — official authorization/capture separation, partial capture, cancellation, and asynchronous capture results.
- [Stripe refunds](https://docs.stripe.com/refunds) — official refund behavior and its relationship to the original successful payment.
- [Stripe disputes](https://docs.stripe.com/disputes) — official chargeback lifecycle, evidence window, and balance impact.
