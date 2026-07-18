---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Trading systems establish deterministic order admission and matching before publishing executions to asynchronous consumers."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Trading Systems

An exchange matching path must make one deterministic decision about order sequence. Risk checks, matching, execution IDs, and the authoritative order book belong to a strict protocol; market data, reporting, analytics, and surveillance can consume the resulting execution stream asynchronously.

## Order Lifecycle and Deterministic Sequencing

An accepted order carries participant, instrument, side, type, price, quantity, client ID, and a stable client-order ID. Validate syntax and pre-trade limits before the sequencer. The sequencer assigns a monotonically increasing input sequence for one instrument partition, and the matching engine processes that sequence without concurrent mutation of the same book.

```text
501 BUY  100 XYZ @ 42.10
502 SELL  40 XYZ @ 42.00  -> execution_9001, 40 @ 42.10
503 CANCEL order_501      -> remaining 60 removed
```

Replay the same input log into the same engine version and configuration to reproduce the same book and executions. Idempotency is still required at admission: a reconnect retry with the same participant and client-order ID must not create a second order.

![[System Design 101/d2ef300c5b094c7a49cb1c4415d820aec581312416a00ead1868cb3ba0eff2e1.png]]

The visual separates the critical order path from market-data and reporting flows. Broker examples and component placement are illustrative; the exchange protocol and operating rules define the actual participants and controls.

## Critical-Path Budget

Every network hop, serialization boundary, lock, and cache miss spends latency and adds jitter. A single-threaded matching loop can outperform a shared concurrent book because it removes lock arbitration and makes order deterministic. Collocating processes and using memory-mapped transport can reduce transfer cost when one failure domain is acceptable.

![[System Design 101/df4c729bc881ce42086508e2b7c59e027f2ce26525ca01576040afdc6a5a6ec5.jpg]]

This is one low-latency topology, not a universal exchange design. A single physical host raises availability and recovery stakes. Durable input journaling, replicated recovery state, tested failover, clock discipline, capacity headroom, and deterministic replay remain necessary. Keep blocking reporting and database writes off the matching loop, but never acknowledge an order beyond the durability guarantee the venue publishes.

## References

- [Nasdaq TotalView-ITCH specification](https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHSpecification.pdf) — official sequenced market-data message definitions and order-book events.
- [FIX Trading Community standards](https://www.fixtrading.org/standards/) — industry protocol specifications for order, execution, session, and market-data messages.
- [The LMAX Disruptor](https://lmax-exchange.github.io/disruptor/disruptor.html) — primary engineering paper on a sequenced single-writer event-processing design and its latency tradeoffs.
- [ByteByteGo: design a stock exchange](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/design-stock-exchange.md) — provenance for the sequencer, matching, market-data, and reporting split.
- [ByteByteGo: low-latency stock exchange](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/low-latency-stock-exchange.md) — provenance for the collocated application-loop and memory-mapped transport case.
