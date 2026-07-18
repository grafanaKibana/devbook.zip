---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Payment ledgers record balanced obligations while settlement and reconciliation prove how internal records correspond to external money movement."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Payment Ledgers and Reconciliation

Provider state and accounting state answer different questions. A PSP says what it observed on a rail; the ledger says what the platform owns or owes; a settlement file and bank statement later show what moved externally. Keep those records linked but independent so fees, returns, disputes, payout failures, and missing callbacks have an honest place to land.

## Intent, Attempt, Journal, and Settlement Evidence

- **Payment intent** records the business objective: merchant, order, amount, currency, permitted methods, and expiry.
- **Payment attempt** records one execution against one provider or rail, with its immutable attempt ID, idempotency key, reference, and outcome category.
- **Ledger transaction** contains balanced, append-only entries representing platform assets and liabilities.
- **Settlement record** captures the provider statement or file that groups captures, fees, refunds, disputes, and payouts.

![[System Design 101/dfeeea5e79a61224470de2ecd8d703a0bb26a602fda2bac03ff5f9c3b6dd0bea.jpg]]

A marketplace order split across three sellers should create three payment orders or allocation records with stable IDs. Recomputing the split only in memory lets a retry charge or credit every seller again.

## Clearing, Settlement, and Fund Flow

Clearing exchanges and validates transaction information and determines obligations. Netting reduces multiple obligations to a smaller set of positions. Settlement discharges those obligations through the agreed asset or accounts. Merchant funding and payout can occur on another schedule.

![[System Design 101/d6f78f4ec016cfa7a08a83d29b3b45ed87fc423ef849968bac2af537cf2b7fa4.jpg]]

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

Every journal balances and retains the currency. A refund, return, reserve, or chargeback creates a linked journal; it does not overwrite the original capture. A mutable balance may be a projection, but the entries are the audit trail.

Settlement is not payout. Provider funds may move from `pending` to `available`, then a payout can be initiated, reported paid, and later returned by the destination bank. Model each state and its evidence.

## Reconciliation

Reconciliation compares independently produced records: intents, attempts, journals, PSP exports, settlement batches, payout reports, and bank statements. It detects errors that API-level idempotency cannot: missing callbacks, duplicate provider operations, fees on another date, late returns, and cut-off mismatches.

![[System Design 101/324f75cc04635ee4a220ea741e4dd81b38c04660eb0ec99de9a952953fa1b777.jpg]]

Use an explicit break workflow:

1. **Normalize** currencies, minor units, time zones, identifiers, sign conventions, and record types without discarding raw input.
2. **Match** stable provider and merchant references, then verify amount, currency, operation, and lifecycle relationship.
3. **Classify** unmatched, duplicated, amount-mismatched, fee-mismatched, and state-mismatched records.
4. **Carry** plausible cut-off-window records into the next comparison window with a deadline.
5. **Resolve or escalate** through a controlled journal, provider correction, or named investigation owner.
6. **Audit** automated and manual decisions with input hashes, rule version, actor, and resulting journal reference.

An internal capture at `23:59:55 UTC` may appear in the next provider file at `00:00:30 UTC`. Carry it through one tolerance window. If it is still missing afterward, open an owned exception with the amount at risk; do not post a correction while timing alone explains the break.

## References

- [CPMI glossary](https://www.bis.org/cpmi/glossary.pdf) — primary definitions for clearing, netting, settlement, reconciliation, and payment-system participants.
- [Adyen Settlement details report](https://docs.adyen.com/reporting/settlement-reconciliation/transaction-level/settlement-details-report) — transaction-level settlement, fee, refund, dispute, and payout evidence.
- [Stripe payouts](https://docs.stripe.com/payouts) — official distinction between pending and available balances, settlement timing, payout schedules, and payout failures.
- [Stripe balance transactions](https://docs.stripe.com/reports/balance-transaction-types) — official transaction types used to explain balance changes and reconciliation records.
