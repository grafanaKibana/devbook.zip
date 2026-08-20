---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "Structuring a relational schema to remove redundancy, trading read performance for fewer anomalies."
level:
  - "4"
priority: High
status: Done

publish: true
---

Normalization uses functional, multivalued, and join dependencies to separate facts that have different keys. The goal is not to remove every repeated value. It is to prevent insertion, update, and deletion anomalies by giving each fact one authoritative dependency boundary. If a customer's current address is one fact, changing it should not require finding every order row that happened to repeat it.

Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF) cover most ordinary OLTP dependencies. Fourth and Fifth Normal Form address independent multivalued facts and join dependencies. Sixth Normal Form is mainly useful in specialized temporal designs. The stopping point is determined by the actual dependencies and workload. Join count alone is not a reason to denormalize, and a read-heavy system does not automatically benefit from duplicated state.

# First Normal Form

A relation is in 1NF when each tuple has one value for each attribute and repeating groups are represented as rows rather than numbered columns or packed lists. “Atomic” is relative to the declared domain: a timestamp may be one value even though it has components. The design question is whether the database can apply the intended key, constraint, and query semantics to the value.

For example, consider the "Cars" table:

| Make | Models |
| --- | --- |
| Audi | A4, S5, RS6, TT |
| Infiniti | Q50 |

The Audi row packs four independent model values into one string, so the database cannot constrain or join an individual model as a row. Represent each make-model fact separately:

| Make | Models |
| --- | --- |
| Audi | A4 |
| Audi | S5 |
| Audi | RS6 |
| Audi | TT |
| Infiniti | Q50 |

# Second Normal Form

A relation is in 2NF when it is in 1NF and every non-prime attribute is fully functionally dependent on every candidate key. A partial dependency exists when a non-prime attribute depends on only part of a composite candidate key. Relations whose candidate keys are all single attributes satisfy this condition automatically.

For example, consider the table:

| Make | Model | Price | Discount |
| --- | --- | --- | --- |
| Audi | S5 | 5500000 | 5% |
| Audi | RS6 | 6000000 | 5% |
| Audi | TT | 2500000 | 5% |
| Infiniti | Q50 | 5000000 | 10% |

Assuming `{Make, Model}` identifies a row, `Price` depends on the full key while `Discount` depends only on `Make`. Repeating the make-level discount in every model row creates a partial dependency. Separate the model price from the make discount:

| Make | Model | Price |
| --- | --- | --- |
| Audi | S5 | 5500000 |
| Audi | RS6 | 6000000 |
| Audi | TT | 2500000 |
| Infiniti | Q50 | 5000000 |

| Make | Discount |
| --- | --- |
| Audi | 5% |
| Infiniti | 10% |

# Third Normal Form

A relation is in 3NF when, for every non-trivial functional dependency `X → A`, either `X` is a superkey or `A` is a prime attribute belonging to some candidate key. A common practical violation is a non-key fact that depends on another non-key fact instead of on a key.

## What Are Transitive Functional Dependencies?

A transitive dependency appears when a key determines one non-key attribute, which in turn determines another. The second fact has a different determinant and should usually have its own relation.

Consider the table:

| Model | Store | Phone |
| --- | --- | --- |
| BMW | Real Auto | 87-33-98 |
| Audi | Real Auto | 87-33-98 |
| Nissan | Next Auto | 94-54-12 |

The table is in 2NF but not in 3NF.

Assume `Model` is the candidate key. A store has a phone number, so the phone depends on `Store`, not directly on the car model.

The dependencies are `Model → Store`, `Store → Phone`, and therefore `Model → Phone`. Because `Store` is not a superkey and `Phone` is not prime, `Store → Phone` violates 3NF.

Decomposing the original relation produces two relations in 3NF:

| Store | Phone |
| --- | --- |
| Real Auto | 87-33-98 |
| Next Auto | 94-54-12 |

| Model | Store |
| --- | --- |
| BMW | Real Auto |
| Audi | Real Auto |
| Nissan | Next Auto |

# Boyce-Codd Normal Form (BCNF)

BCNF strengthens 3NF: for every non-trivial functional dependency `X → Y`, `X` must be a superkey. The difference from 3NF appears in schemas with overlapping candidate keys, where 3NF may allow a dependency whose right side is prime even though its determinant is not a superkey.

Consider a relation representing parking reservations for one day:

| Parking spot number | Start time | End time | Rate |
| --- | --- | --- | --- |
| 1 | 09:30 | 10:30 | Economy |
| 1 | 11:00 | 12:00 | Economy |
| 1 | 14:00 | 15:30 | Standard |
| 2 | 10:00 | 12:00 | Premium B |
| 2 | 12:00 | 14:00 | Premium B |
| 2 | 15:00 | 18:00 | Premium A |

The rate has a unique name and depends on the chosen parking spot and whether discounts apply, specifically:

- "Economy": parking spot 1 for discount-eligible customers
- "Standard": parking spot 1 for non-eligible customers
- "Premium A": parking spot 2 for discount-eligible customers
- "Premium B": parking spot 2 for non-eligible customers.

Under the example's assumptions that times identify one reservation per spot or rate, the candidate keys are `{Parking spot number, Start time}`, `{Parking spot number, End time}`, `{Rate, Start time}`, and `{Rate, End time}`.

Every attribute is prime, so `Rate → Parking spot number` is permitted by 3NF. `Rate` is not a superkey, however, so the same dependency violates BCNF.

The anomaly is concrete: the table can assign the `Economy` rate to parking spot 2 even though the rate determines parking spot 1.

Decompose the rate-to-spot fact from the reservation and make discount eligibility explicit. Under the stated dependencies, both resulting relations satisfy BCNF:

**Rates**

| Rate | Parking spot number | Has discounts |
| --- | --- | --- |
| Economy | 1 | true |
| Standard | 1 | false |
| Premium A | 2 | true |
| Premium B | 2 | false |

**Reservations**

| Rate | Start time | End time |
| --- | --- | --- |
| Economy | 09:30 | 10:30 |
| Economy | 11:00 | 12:00 |
| Standard | 14:00 | 15:30 |
| Premium B | 10:00 | 12:00 |
| Premium B | 12:00 | 14:00 |
| Premium A | 15:00 | 18:00 |

# Fourth Normal Form

A relation is in 4NF when every non-trivial multivalued dependency `X ↠ Y` has a superkey on its left side. A multivalued dependency says that, for one `X`, the set of `Y` values is independent of the remaining attributes.

Suppose restaurants make different kinds of pizza, and each restaurant's delivery service operates only in certain areas of the city. The candidate key for the combined relation is `{Restaurant, Pizza type, Delivery area}`.

The relation is not in 4NF because two independent sets are multiplied together:

{Restaurant} ↠ {Pizza type}

{Restaurant} ↠ {Delivery area}

Adding one pizza type requires a row for every delivery area. Missing one row falsely states that the pizza is unavailable in that area, even though pizza choice and delivery coverage are independent facts.

The anomaly disappears when the independent facts move into `{Restaurant, Pizza type}` and `{Restaurant, Delivery area}` relations.

An attribute such as delivery-inclusive price may genuinely depend on the full `{Restaurant, Pizza type, Delivery area}` key. That fact cannot be placed in either binary projection without changing its meaning. The dependency model must therefore decide whether pizza availability and delivery coverage are truly independent before decomposition. 4NF is not a mechanical instruction to discard facts that require the full key.

# Fifth Normal Form

A relation is in 5NF (also called PJ/NF, Projection-Join Normal Form) if it is in 4NF and every join dependency is implied by its candidate keys. In other words, the relation cannot be losslessly decomposed into smaller projections unless those projections are defined by candidate keys.

The classic example uses Supplier, Product, and Customer. Suppose the business rule says that a valid ternary fact exists exactly when the supplier offers the product, serves the customer, and the customer buys the product. The ternary relation is then the lossless join of `SupplierProduct`, `SupplierCustomer`, and `ProductCustomer`. That join dependency is not derived from one candidate key, so the original relation violates 5NF and can be decomposed into those three projections.

The business rule is essential. If a supplier may offer a product to only selected customers, joining the three pairwise relations invents spurious triples and the decomposition is not lossless. Fifth Normal Form applies when the full fact is implied by lower-arity facts. It does not assume that every ternary relation should be split.

# Domain-key Normal Form

A relation is in Domain-key Normal Form (DKNF) when every constraint follows solely from its domains and keys.

A domain constraint restricts an attribute to the values and operations of its declared domain. A key constraint identifies tuples uniquely.

DKNF removes the need for separate cross-attribute rules, but many business constraints cannot be expressed as domains or keys. It is therefore an ideal end state rather than a routine decomposition target. A relation in DKNF is necessarily in 5NF.

# Sixth Normal Form

A relation is in 6NF when it has no non-trivial lossless join decomposition: it cannot be split further without losing information. Every 6NF relation is also in 5NF.

Maximal decomposition is rarely useful for an ordinary current-state schema. It becomes valuable in temporal models because independently changing attributes can have independent validity intervals. Temporal relational theory defines unpacking and packing operators, including temporal joins, to align those intervals before recombination. These are theoretical operators rather than standard SQL syntax.

**Employees**

| Emp No. | Time | Position | Home address |
| --- | --- | --- | --- |
| 6575 | 01-01-2000:10-02-2003 | mechanic | Lenin St, 10 |
| 6575 | 11-02-2003:15-06-2006 | mechanic | Soviet St, 22 |
| 6575 | 16-06-2006:05-03-2009 | foreman | Soviet St, 22 |

Position and home address change on different timelines, so the combined relation repeats one history whenever the other changes. Separate temporal relations let each fact record only its own change points.

**Employee positions**

| Emp No. | Time | Position |
| --- | --- | --- |
| 6575 | 01-01-2000:10-02-2003 | mechanic |
| 6575 | 16-06-2006:05-03-2009 | foreman |

**Home addresses**

| Emp No. | Time | Home address |
| --- | --- | --- |
| 6575 | 01-01-2000:10-02-2003 | Lenin St, 10 |
| 6575 | 11-02-2003:15-06-2006 | Soviet St, 22 |

# Denormalization

Denormalization deliberately stores a derived or duplicated fact in the shape a read path needs. It trades read-time work for write-time maintenance. The normalized source remains authoritative unless the design explicitly gives the denormalized representation its own ownership contract.

Denormalization is justified by a measured query whose latency or resource cost cannot be met through [[Indexes]], plan correction, partitioning, or an acceptable cache. Read frequency alone is insufficient. The gain must exceed the cost of maintaining and reconciling the duplicate.

Common forms include:

- copying a related value into a read model.
- storing a precomputed aggregate.
- maintaining a materialized view that can be rebuilt from source data.
- flattening a hierarchy into a columnar or analytical projection.

**Concrete example:** instead of computing total order value on every request with a JOIN + SUM, store it directly:

```sql
-- Normalized: computed at read time
SELECT c.Name, SUM(o.Amount)
FROM Customers c
JOIN Orders o ON o.CustomerId = c.Id
GROUP BY c.Id, c.Name;

-- Denormalized: pre-stored on the Customers table
SELECT Name, TotalOrderAmount FROM Customers;
```

The second query removes aggregation from the read path, but every order change must update `TotalOrderAmount` under a defined consistency policy. A same-database transaction can maintain both synchronously. An asynchronous projection needs lag semantics, idempotent updates, and reconciliation. The duplicated value is safe only when ownership and repair are explicit.

# Pitfalls

**Decomposition without a dependency** — splitting attributes merely because they can live in separate tables adds joins without removing an anomaly. Normalize from keys and dependencies, then measure critical plans with realistic cardinalities. A multi-table query is not inherently slow, and join count is not a reliable threshold. Poor estimates, missing indexes, wide rows, and unnecessary fan-out are the mechanisms to diagnose.

**Under-normalizing and silent data corruption** — storing the same fact in multiple places creates update anomalies that are invisible until they cause business impact. Consider an e-commerce system that stores `product_price` on both `Products` and `OrderLineItems`. A price-update path changes `Products` but leaves pending carts stale. A finalized order-line price is a historical fact, while a pending cart may still depend on the current-price policy. Those facts need separate names and ownership. A `PriceHistory` table with effective dates can preserve the distinction, with the applicable price selected when the order is finalized.

**Premature denormalization** — storing `TotalOrderAmount` before proving the aggregate is costly adds another row to every order-write transaction. Concurrent orders for one customer can then contend on that summary row. Inspect the plan and workload first. A suitable index, materialized view, cache, or scheduled analytical projection may meet the read contract with a cheaper write path.

**Treating migration cost as a normal-form property** — foreign keys, large indexes, backfills, and application coupling can make a schema change expensive, but decomposition does not automatically require cascading DDL. Plan each migration from the engine's current behavior. For example, modern PostgreSQL can add a column with a non-volatile constant default without rewriting every row, while volatile defaults and later backfills have different costs. Measure locks and rewrite behavior on the deployed version instead of carrying forward an old rule.

# Tradeoffs

| Decision | Option A | Option B | When to Choose A | When to Choose B |
| --- | --- | --- | --- | --- |
| **Stop at 3NF vs BCNF** | 3NF preserves dependencies and permits a prime attribute on the right of a non-superkey dependency | BCNF requires every determinant to be a superkey | A BCNF decomposition would lose enforceable dependencies needed by the design | Overlapping candidate keys create a demonstrated update anomaly and the decomposition is lossless |
| **Normalize vs denormalize a read** | Keep one authoritative dependency boundary | Store a redundant column or materialized projection | Integrity and flexible queries dominate, or the normalized plan meets the objective | A named read path misses its objective and the duplicate has an owner, update policy, and reconciliation path |
| **Precompute vs aggregate on demand** | Maintain a stored aggregate | Run `JOIN + SUM` from source facts | The aggregate is frequent and bounded write contention is acceptable | Fresh source truth matters more, or updates make the summary row a hotspot |
| **4NF/5NF decomposition** | Separate independent multivalued or join-dependent facts | Retain the relation | The business dependencies prove a lossless decomposition | The full tuple carries information that the projections cannot reconstruct |

Start an OLTP design by writing candidate keys and functional dependencies, then decompose toward 3NF or BCNF while preserving a lossless join and the constraints the database must enforce. Denormalize only for a named, measured read path. Every duplicate needs an authoritative source, freshness contract, complete update path, failure behavior, and reconciliation query.

# Questions

> [!QUESTION]- What is normalization and why do most systems stop at 3NF/BCNF?
> Normalization decomposes relations according to their dependencies so that one update cannot leave conflicting versions of the same fact. 3NF and BCNF cover ordinary functional dependencies. 4NF and 5NF matter when the domain contains independent multivalued facts or a genuine join dependency. 6NF is mainly a temporal modeling tool. The stopping point follows the domain's dependencies, not a universal target number.

> [!QUESTION]- What conditions justify denormalizing a table, and what risks does it introduce?
> Denormalization is justified when a specific read path misses its latency or resource target and storing the result is cheaper than rebuilding it from source facts on every read. The duplicate adds another update path and can introduce lag, write contention, and repair work. The design must identify the source of truth, acceptable freshness, how updates are applied, and how the duplicate is reconciled when it drifts.

> [!QUESTION]- How can 2NF and 3NF violations be distinguished?
> 2NF removes partial dependencies of a non-prime attribute on part of a composite candidate key. A make-level discount repeated in rows keyed by `{Make, Model}` violates it. 3NF additionally constrains dependencies whose determinant is not a superkey. A store phone determined by `Store` inside a table keyed by `Model` is the usual transitive shape. A repair separates the facts only when the decomposition is lossless and preserves the constraints the system needs.

# References

- [Further Normalization of the Data Base Relational Model](https://apollo.inf.upol.cz/~urbanec/teaching/2021/data2/files/codd2.pdf)
