---
topic: [Data Persistence]
subtopic: [SQL]
summary: "Structuring a relational schema to remove redundancy, trading read performance for fewer anomalies."
level: ["4"]
priority: High
status: Done

publish: true
qard-deck: "Data Persistence"
qard-topic: "SQL/Normalization Denormalization"
flashcard_uid: "ab5a8eb2"
---

Normalization uses functional, multivalued, and join dependencies to separate facts that have different keys. The goal is not to remove every repeated value. It is to prevent insertion, update, and deletion anomalies by giving each fact one authoritative dependency boundary. If a customer's current address is one fact, changing it should not require finding every order row that happened to repeat it.

Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF) cover most ordinary OLTP dependencies. Fourth and Fifth Normal Form address independent multivalued facts and join dependencies. Sixth Normal Form is mainly useful in specialized temporal designs. The stopping point is determined by the actual dependencies and workload. Join count alone is not a reason to denormalize, and a read-heavy system does not automatically benefit from duplicated state.

# First Normal Form

A relation is in 1NF when each tuple has one value for each attribute and repeating groups are represented as rows rather than numbered columns or packed lists. “Atomic” is relative to the declared domain: a timestamp may be one value even though it has components. The design question is whether the database can apply the intended key, constraint, and query semantics to the value.

The following "Cars" table stores several models in one value:

| Make | Models |
| --- | --- |
| Audi | A4, S5, RS6, TT |
| Infiniti | Q50 |

The Audi row packs four independent model values into one string, so the database cannot constrain or join an individual model as a row. 1NF represents each make-model fact as its own row:

| Make | Models |
| --- | --- |
| Audi | A4 |
| Audi | S5 |
| Audi | RS6 |
| Audi | TT |
| Infiniti | Q50 |

# Second Normal Form

A relation is in 2NF when it is in 1NF and every non-prime attribute is fully functionally dependent on every candidate key. A partial dependency exists when a non-prime attribute depends on only part of a composite candidate key. Relations whose candidate keys are all single attributes satisfy this condition automatically.

In the following table, every model row repeats its make's discount:

| Make | Model | Price | Discount |
| --- | --- | --- | --- |
| Audi | S5 | 5500000 | 5% |
| Audi | RS6 | 6000000 | 5% |
| Audi | TT | 2500000 | 5% |
| Infiniti | Q50 | 5000000 | 10% |

Assuming `{Make, Model}` identifies a row, `Price` depends on the full key while `Discount` depends only on `Make`. Repeating the make-level discount in every model row creates a partial dependency. The decomposition separates model prices from make discounts:

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

The following table stores each model's store and that store's phone number:

| Model | Store | Phone |
| --- | --- | --- |
| BMW | Real Auto | 87-33-98 |
| Audi | Real Auto | 87-33-98 |
| Nissan | Next Auto | 94-54-12 |

The table is in 2NF but not in 3NF.

In this example, `Model` is the candidate key. A store has a phone number, so the phone depends on `Store`, not directly on the car model.

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

The following relation represents parking reservations for one day:

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

The decomposition separates the rate-to-spot fact from the reservation and makes discount eligibility explicit. Under the stated dependencies, both resulting relations satisfy BCNF:

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

In this example, restaurants make different kinds of pizza, and each restaurant's delivery service operates only in certain areas of the city. The candidate key for the combined relation is `{Restaurant, Pizza type, Delivery area}`.

The relation is not in 4NF because two independent sets are multiplied together:

{Restaurant} ↠ {Pizza type}

{Restaurant} ↠ {Delivery area}

Adding one pizza type requires a row for every delivery area. Missing one row falsely states that the pizza is unavailable in that area, even though pizza choice and delivery coverage are independent facts.

The anomaly disappears when the independent facts move into `{Restaurant, Pizza type}` and `{Restaurant, Delivery area}` relations.

An attribute such as delivery-inclusive price may genuinely depend on the full `{Restaurant, Pizza type, Delivery area}` key. That fact cannot be placed in either binary projection without changing its meaning. The dependency model must therefore decide whether pizza availability and delivery coverage are truly independent before decomposition. 4NF is not a mechanical instruction to discard facts that require the full key.

# Fifth Normal Form

A relation is in 5NF (also called PJ/NF, Projection-Join Normal Form) if it is in 4NF and every join dependency is implied by its candidate keys. In other words, the relation cannot be losslessly decomposed into smaller projections unless those projections are defined by candidate keys.

The classic example uses Supplier, Product, and Customer. Under the example's business rule, a valid ternary fact exists exactly when the supplier offers the product, serves the customer, and the customer buys the product. The ternary relation is then the lossless join of `SupplierProduct`, `SupplierCustomer`, and `ProductCustomer`. That join dependency is not derived from one candidate key, so the original relation violates 5NF and can be decomposed into those three projections.

The business rule is essential. If a supplier may offer a product to only selected customers, joining the three pairwise relations invents spurious triples and the decomposition is not lossless. Fifth Normal Form applies when the full fact is implied by lower-arity facts. It does not assume that every ternary relation should be split.

# Domain-key Normal Form

A relation is in Domain-key Normal Form (DKNF) when every constraint follows solely from its domains and keys.

A domain constraint restricts an attribute to the values and operations of its declared domain. A key constraint identifies tuples uniquely.

DKNF removes the need for separate cross-attribute rules, but many business constraints cannot be expressed as domains or keys. It is therefore an ideal end state rather than a routine decomposition target. When every attribute domain is infinite, a relation in DKNF is necessarily in 5NF; with finite domains, domain constraints can imply a join dependency that the candidate keys alone do not, so the implication can fail.

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
| 6575 | 01-01-2000:15-06-2006 | mechanic |
| 6575 | 16-06-2006:05-03-2009 | foreman |

**Home addresses**

| Emp No. | Time | Home address |
| --- | --- | --- |
| 6575 | 01-01-2000:10-02-2003 | Lenin St, 10 |
| 6575 | 11-02-2003:05-03-2009 | Soviet St, 22 |

# Denormalization

Denormalization deliberately stores a derived or duplicated fact in the shape a read path needs. It trades read-time work for write-time maintenance. The normalized source remains authoritative unless the design explicitly gives the denormalized representation its own ownership contract.

Denormalization is justified by a measured query whose latency or resource cost cannot be met through [[Indexes]], plan correction, partitioning, or an acceptable cache. Read frequency alone is insufficient. The gain must exceed the cost of maintaining and reconciling the duplicate.

Common forms include:

- copying a related value into a read model.
- storing a precomputed aggregate.
- maintaining a materialized view that can be rebuilt from source data.
- flattening a hierarchy into a columnar or analytical projection.

**Concrete example:** instead of computing total order value on every request with a JOIN + SUM, a denormalized design stores it directly:

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

**Decomposition without a dependency** — splitting attributes merely because they can live in separate tables adds joins without removing an anomaly. Keys and dependencies determine the decomposition, and critical plans are then measured with realistic cardinalities. A multi-table query is not inherently slow, and join count is not a reliable threshold. Poor estimates, missing indexes, wide rows, and unnecessary fan-out are the mechanisms to diagnose.

**Under-normalizing and silent data corruption** — storing the same fact in multiple places creates update anomalies that are invisible until they cause business impact. For example, an e-commerce system stores `product_price` on both `Products` and `OrderLineItems`. A price-update path changes `Products` but leaves pending carts stale. A finalized order-line price is a historical fact, while a pending cart may still depend on the current-price policy. Those facts need separate names and ownership. A `PriceHistory` table with effective dates can preserve the distinction, with the applicable price selected when the order is finalized.

**Premature denormalization** — storing `TotalOrderAmount` before proving the aggregate is costly adds another row to every order-write transaction. Concurrent orders for one customer can then contend on that summary row. The plan and workload establish first whether the aggregate is actually costly. A suitable index, materialized view, cache, or scheduled analytical projection may meet the read contract with a cheaper write path.

**Treating migration cost as a normal-form property** — foreign keys, large indexes, backfills, and application coupling can make a schema change expensive, but decomposition does not automatically require cascading DDL. Each migration plan rests on the engine's current behavior. For example, modern PostgreSQL can add a column with a non-volatile constant default without rewriting every row, while volatile defaults and later backfills have different costs. Lock and rewrite behavior is measured on the deployed version rather than assumed from an old rule.

# Tradeoffs

| Decision | Option A | Option B | When to Choose A | When to Choose B |
| --- | --- | --- | --- | --- |
| **Stop at 3NF vs BCNF** | A dependency-preserving 3NF synthesis is always available, and 3NF permits a prime attribute on the right of a non-superkey dependency | BCNF requires every determinant to be a superkey | A BCNF decomposition would lose enforceable dependencies needed by the design | Overlapping candidate keys create a demonstrated update anomaly and the decomposition is lossless |
| **Normalize vs denormalize a read** | Keep one authoritative dependency boundary | Store a redundant column or materialized projection | Integrity and flexible queries dominate, or the normalized plan meets the objective | A named read path misses its objective and the duplicate has an owner, update policy, and reconciliation path |
| **Precompute vs aggregate on demand** | Maintain a stored aggregate | Run `JOIN + SUM` from source facts | The aggregate is frequent and bounded write contention is acceptable | Fresh source truth matters more, or updates make the summary row a hotspot |
| **4NF/5NF decomposition** | Separate independent multivalued or join-dependent facts | Retain the relation | The business dependencies prove a lossless decomposition | The full tuple carries information that the projections cannot reconstruct |

An OLTP design starts by writing down candidate keys and functional dependencies, then decomposes toward 3NF or BCNF while preserving a lossless join and the constraints the database must enforce. Denormalization is justified only for a named, measured read path. Every duplicate needs an authoritative source, freshness contract, complete update path, failure behavior, and reconciliation query.

# Questions

<!-- qard-id: 490485e5-5ecc-4738-8ff1-c06c00b82234 -->
> [!qard]- What problem does normalization solve in a relational schema?
> Normalization prevents insertion, update and deletion anomalies. These arise when one fact is stored redundantly in rows that exist for other reasons. Normalization decomposes tables according to their dependencies, so each fact is stored once, with the key that actually determines it.
>
> For example, an `Orders` table that is the only place storing customer addresses repeats a customer's address on every order row. It has all three anomalies:
>
> - **Update anomaly:** changing the address means updating every order row for that customer. Missing one row leaves two contradictory addresses.
> - **Insertion anomaly:** a new customer's address cannot be recorded until the customer places an order.
> - **Deletion anomaly:** deleting a customer's last order also deletes the only record of the address.
> 
> Storing the address in a `Customers` table keyed by customer ID, with each order referring to that ID, removes all three. The goal is not to remove every repeated value: the customer ID repeated on each order is a reference, not a duplicated fact. The address an order was shipped to is a different, historical fact, and it belongs on the order.
>
> A valid decomposition is lossless: joining the smaller tables reproduces exactly the original rows, without losing any or inventing new ones. The constraints the business needs must also remain enforceable after the split.
>
> [Codd: Further Normalization of the Data Base Relational Model](https://apollo.inf.upol.cz/~urbanec/teaching/2021/data2/files/codd2.pdf)

<!-- qard-id: 0655df3d-3076-45b4-b318-fe908c8ee76d -->
> [!qard]- When does a relational schema need 4NF or 5NF rather than stopping at BCNF?
> A schema needs 4NF or 5NF when redundancy remains that no functional dependency explains. 3NF and BCNF are built on functional dependencies, where one set of attributes determines a single value of another attribute. Fourth and fifth normal form handle two other kinds of dependency.
>
> | Aspect | 4NF | 5NF (project-join normal form) |
> |---|---|---|
> | Dependency removed | A multivalued dependency: one value determines a set of values that is independent of the table's other attributes. | A join dependency: the full fact is exactly the join of three or more smaller projections, and this is not implied by the candidate keys. |
> | Example | A `{Restaurant, PizzaType, DeliveryArea}` table where `Restaurant ↠ PizzaType` and `Restaurant ↠ DeliveryArea` are independent. Every pizza type repeats for every area. Adding one type needs one row per area, and a missing row falsely says the pizza is unavailable there. | A `{Supplier, Product, Customer}` table under the rule that a supplier supplies a product to a customer exactly when the supplier offers the product, serves the customer, and the customer buys the product. |
> | Decomposition | `{Restaurant, PizzaType}` and `{Restaurant, DeliveryArea}`. | `SupplierProduct`, `SupplierCustomer` and `ProductCustomer`. |
>
> Both decompositions are valid only when the dependency really holds in the domain. If pizza availability differs by delivery area, the two sets are not independent, and the three-column table is the correct fact. If a supplier offers a product only to some of its customers, joining the three pairwise tables produces combinations that never existed, so the decomposition loses information. The design follows from the dependencies that actually hold, not from a target normal-form number.
>
> [Codd: Further Normalization of the Data Base Relational Model](https://apollo.inf.upol.cz/~urbanec/teaching/2021/data2/files/codd2.pdf) · [Fagin: Multivalued Dependencies and a New Normal Form for Relational Databases](https://www.comp.nus.edu.sg/~lingtw/papers/fagin.pdf) · [Fagin: Project-Join Normal Form](https://citeseerx.ist.psu.edu/document?doi=4735fc168eb72ef96817384aa5d40d5b6016d713&repid=rep1&type=pdf)

<!-- qard-id: 61f5acfa-1113-408f-9deb-acd3b5e6b958 -->
> [!qard]- What conditions justify denormalizing a table, and what risks does it introduce?
> Denormalization is justified when three conditions hold:
>
> - A specific read path has a measured latency or resource problem.
> - Cheaper fixes, such as an index or a corrected query plan, do not meet its target.
> - Keeping a stored copy up to date costs less than recomputing the result on every read.
> 
> High read volume alone does not justify it.
>
> The risk is that the same fact now lives in two places, and every change must reach both:
>
> - **Drift:** a write path that updates the source but misses the copy leaves them silently inconsistent.
> - **Staleness:** a copy updated asynchronously or on a schedule serves old data between updates. A PostgreSQL materialized view, for example, changes only when `REFRESH MATERIALIZED VIEW` runs.
> - **Write cost and contention:** each source change also updates the copy. A stored `TotalOrderAmount` on `Customers` adds an update to every order write, and concurrent orders for the same customer contend on that one row.
> 
> A safe design therefore names four things:
>
> - the authoritative source;
> - the acceptable freshness;
> - how the copy is updated, either in the same transaction or by an asynchronous projection;
> - a reconciliation check that detects and repairs drift.
> 
> [PostgreSQL: Materialized views](https://www.postgresql.org/docs/current/rules-materializedviews.html)

<!-- qard-id: 5b6ce553-cc6a-41a8-a22d-da5fc5fb740c -->
> [!qard]- How do 2NF and 3NF differ?
> 2NF removes facts that depend on only part of a composite key. 3NF also removes facts that depend on another non-key attribute instead of on a key. Every relation in 3NF is also in 2NF.
>
> A *non-prime* attribute is one that is not part of any candidate key.
>
> | Aspect | 2NF | 3NF |
> |---|---|---|
> | Problem removed | Partial dependency: a non-prime attribute depends on only part of a composite candidate key. | Transitive dependency: a non-prime attribute depends on another non-key attribute, which in turn depends on the key. |
> | Formal condition | The relation is in 1NF, and every non-prime attribute depends on the whole of every candidate key. | For every nontrivial functional dependency `X → A`, `X` is a superkey or `A` is prime. |
> | When it can be violated | For a table already in 1NF, only when a candidate key has several attributes; such a table whose candidate keys are all single attributes is automatically in 2NF. | Also when the key is a single attribute. |
> | Example violation | Key `{Make, Model}`: `Discount` depends only on `Make`, so the same discount repeats on every model row for that make. | Key `Model`: `Model → Store` and `Store → Phone`, so each store's phone number repeats on every model row for that store. |
> | Fix | A separate `{Make, Discount}` table holds each make's discount. | A separate `{Store, Phone}` table holds each store's phone number. |
>
> Each fix is a lossless decomposition: joining the new tables on the shared attribute reproduces the original rows exactly. Whether every original dependency can still be enforced within a single table is a separate design concern.
>
> [Codd: Further Normalization of the Data Base Relational Model](https://apollo.inf.upol.cz/~urbanec/teaching/2021/data2/files/codd2.pdf)

# References

- [Further Normalization of the Data Base Relational Model](https://apollo.inf.upol.cz/~urbanec/teaching/2021/data2/files/codd2.pdf)
