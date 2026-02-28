---
topic:
  - "Data Persistence"
subtopic:
  - "SQL"
level:
  - "4"
priority: High
status: Ready To Repeat

dg-publish: true
---

# Intro

Normalization is the process of structuring a relational database to eliminate redundancy and ensure data integrity. It works by decomposing tables so each fact is stored exactly once, which prevents update anomalies: if a customer's address lives in one place, you can't accidentally update it in three rows and miss a fourth. The tradeoff is read performance: fully normalized schemas require joins, and joins cost CPU and I/O. That's why most production OLTP systems stop at 3NF or BCNF. Higher normal forms (4NF, 5NF, 6NF) address increasingly rare anomalies involving multivalued or join dependencies, and the decomposition overhead rarely pays off outside temporal or analytical databases.

## First Normal Form

A relation is in 1NF if all its attributes are simple and all domains used contain only atomic values. Each cell must hold a single value, not a list or set (no repeating groups).

For example, consider the "Cars" table:

| Make | Models |
| --- | --- |
| Audi | A4, S5, RS6, TT |
| Infiniti | Q50 |

The 1NF violation occurs for the Audi row because a single cell contains a comma-separated list of 4 values: A4, S5, RS6, TT (not atomic). Convert the table to 1NF:

| Make | Models |
| --- | --- |
| Audi | A4 |
| Audi | S5 |
| Audi | RS6 |
| Audi | TT |
| Infiniti | Q50 |

## Second Normal Form

A relation is in 2NF if it is in 1NF and every non-key attribute depends irreducibly on every attribute of the Primary Key (PK).

Irreducibility means you cannot remove part of a candidate key (attributes) and still preserve the same relationship between the data.

For example, consider the table:

| Make | Model | Price | Discount |
| --- | --- | --- | --- |
| Audi | S5 | 5500000 | 5% |
| Audi | RS6 | 6000000 | 5% |
| Audi | TT | 2500000 | 5% |
| Infiniti | Q50 | 5000000 | 10% |

The table is in 1NF but not in 2NF. The car price depends on both model and make. The discount depends **only on** the make, meaning the dependency on the primary key is partial. This is fixed by decomposing into two relations in which non-key attributes depend on the PK.

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

## Third Normal Form

A relation is in 3NF when it is in 2NF and every non-key attribute depends on the primary key non-transitively.

### What are transitive functional dependencies?

A transitive functional dependency means changing one non-key column can imply a change in another non-key column.

Put simply, the rule requires moving all non-key fields whose contents can apply to multiple table rows into separate tables.

Consider the table:

| Model | Store | Phone |
| --- | --- | --- |
| BMW | Real Auto | 87-33-98 |
| Audi | Real Auto | 87-33-98 |
| Nissan | Next Auto | 94-54-12 |

The table is in 2NF but not in 3NF.

In this relation, the "Model" attribute is the primary key. Cars do not have personal phone numbers, and the phone depends only on the store.

Therefore, the following functional dependencies exist in the relation: Model → Store, Store → Phone, Model → Phone.

The dependency Model → Phone is transitive; therefore, the relation is not in 3NF.

As a result of decomposing the original relation, we get two relations that are in 3NF:

| Store | Phone |
| --- | --- |
| Real Auto | 87-33-98 |
| Next Auto | 94-54-12 |

| Model | Store |
| --- | --- |
| BMW | Real Auto |
| Audi | Real Auto |
| Nissan | Next Auto |

## Boyce-Codd Normal Form (BCNF)

*(A stricter variant of 3NF.)*

The definition of 3NF is not fully suitable for the following relations:

1) the relation has two or more candidate keys;

2) two or more candidate keys are composite;

3) they overlap, i.e., they share at least one common attribute.

For relations that have one candidate key (primary), BCNF is equivalent to 3NF.

A relation is in BCNF when every non-trivial functional dependency with an irreducible left-hand side has a candidate key as its determinant.

Suppose we consider a relation representing data about parking reservations for a day:

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

Thus, the following composite primary keys are possible: {Parking spot number, Start time}, {Parking spot number, End time}, {Rate, Start time}, {Rate, End time}.

The relation is in 3NF. The requirements of 2NF are satisfied because all attributes are part of some candidate key, and there are no non-key attributes in the relation. There are also no transitive dependencies, which meets the requirements of 3NF. Nevertheless, there is a functional dependency Rate → Parking spot number, where the left side (determinant) is not a candidate key of the relation, meaning the relation is not in Boyce-Codd Normal Form.

A drawback of this structure is that, for example, by mistake you can assign the "Economy" rate to a reservation for parking spot 2, even though it can only apply to parking spot 1.

You can improve the structure by decomposing the relation into two and adding the **Has discounts** attribute, obtaining relations that satisfy BCNF (attributes that are part of the primary key are underlined):

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

## Fourth Normal Form

A relation is in 4NF if it is in BCNF and all non-trivial multivalued dependencies are in fact functional dependencies on its candidate keys.

In a relation R (A, B, C), a **multivalued dependency** R.A -> -> R.B exists if and only if the set of B values corresponding to a pair of values A and C depends only on A and does not depend on C.

Suppose restaurants make different kinds of pizza, and each restaurant's delivery service operates only in certain areas of the city. The composite primary key of the corresponding relation variable includes three attributes: {Restaurant, Pizza type, Delivery area}.

Such a relation variable is not in 4NF because the following multivalued dependencies exist:

{Restaurant} → {Pizza type}

{Restaurant} → {Delivery area}

That is, for example, when adding a new pizza type you would need to insert one new tuple for each delivery area. A logical anomaly is possible where a given pizza type is associated with only some of the delivery areas served by the restaurant.

To prevent the anomaly, you need to decompose the relation by placing independent facts into different relations. In this example, you should decompose into {Restaurant, Pizza type} and {Restaurant, Delivery area}.

However, if you add an attribute that functionally depends on the full candidate key, for example a delivery-inclusive price ({Restaurant, Pizza type, Delivery area} -> Price), the new attribute does not remove the independent multivalued dependencies. Whether the resulting relation satisfies 4NF depends on whether those MVDs are still non-trivial. In practice, the safe approach is to decompose first (eliminating the MVDs) and add the price-dependent attribute to the appropriate decomposed relation.

## Fifth Normal Form

A relation is in 5NF (also called PJ/NF, Projection-Join Normal Form) if it is in 4NF and every join dependency is implied by its candidate keys. In other words, the relation cannot be losslessly decomposed into smaller projections unless those projections are defined by candidate keys.

The classic example involves three entities: Supplier, Product, and Customer, where the business rule is "a supplier supplies a product to a customer only if the supplier supplies that product AND the supplier serves that customer AND the customer buys that product." This creates a join dependency across three binary relations: {Supplier, Product}, {Supplier, Customer}, and {Product, Customer}. Joining any two of the three produces spurious tuples; only joining all three reconstructs the original valid data. Because this join dependency is not implied by any candidate key, the original three-attribute relation is not in 5NF and must be decomposed into those three binary relations.

This is a very strict requirement that can be satisfied only under additional conditions. In practice, it is difficult to find a clean real-world example of this requirement.

The decomposition produces three binary relations: `SupplierProduct(Supplier, Product)`, `SupplierCustomer(Supplier, Customer)`, and `ProductCustomer(Product, Customer)`. Joining any two of these produces spurious tuples; only joining all three reconstructs the original valid data. The general recommendation is to design schemas to avoid the need for 4NF and 5NF, as these anomalies are rare in practice.

Fifth Normal Form focuses on join dependencies. Such join dependencies among three attributes are very rare. Join dependencies among four, five, or more attributes are practically impossible to specify.

## Domain-key normal form

A relation variable is in DKNF if and only if every constraint on it is a logical consequence of domain constraints and key constraints imposed on that relation variable.

A domain constraint is a constraint that requires a particular attribute to take values only from a specified domain. In essence, it defines the set (or a logical equivalent of a set) of allowable values for a type and declares that the attribute has that type.

A key constraint is a constraint stating that some attribute or combination of attributes is a candidate key.

Any relation variable in DKNF is necessarily in 5NF. However, not every relation variable can be transformed into DKNF.

## Sixth Normal Form

A relation variable is in Sixth Normal Form if and only if it satisfies all non-trivial join dependencies. From the definition it follows that a relation variable is in 6NF if and only if it is irreducible, i.e., it cannot be further decomposed losslessly. Every relation variable that is in 6NF is also in 5NF.

The idea of "decomposing all the way" was proposed before research into temporal data began, but it did not gain support. However, for temporal databases, maximal decomposition helps combat redundancy and simplifies maintaining database integrity.

For temporal databases, U operators are defined that unpack relations on the specified attributes, perform the corresponding operation, and pack the result back. In this example, the join of relation projections should be performed using the U_JOIN operator.

**Employees**

| Emp No. | Time | Position | Home address |
| --- | --- | --- | --- |
| 6575 | 01-01-2000:10-02-2003 | mechanic | Lenin St, 10 |
| 6575 | 11-02-2003:15-06-2006 | mechanic | Soviet St, 22 |
| 6575 | 16-06-2006:05-03-2009 | foreman | Soviet St, 22 |

The "Employees" relation variable is not in 6NF and can be decomposed into the relation variables "Employee positions" and "Home addresses".

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

## Denormalization

Denormalization is the deliberate introduction of redundancy to speed up reads. Where normalization splits data across tables to eliminate duplication, denormalization collapses it back together to avoid expensive joins at query time.

**When to denormalize:** read-heavy workloads where joins dominate query cost, reporting and analytics queries that aggregate large datasets, and cases where latency requirements can't be met by indexes alone.

**Common techniques:**
- Duplicate a column from a related table to avoid a join (e.g., storing `CustomerName` on the `Orders` table)
- Pre-compute aggregates and store them as columns
- Materialized views that cache the result of a complex query
- Flatten a hierarchy into a single wide table for analytics

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

The tradeoff is real: reads get faster, but every write to `Orders` must also update `TotalOrderAmount` on `Customers`. Miss one update and the data is inconsistent. Denormalization shifts complexity from reads to writes and requires explicit consistency management.

## Pitfalls

**Over-normalizing** splits data into too many tables, forcing multi-way joins for simple queries. A schema in 5NF or 6NF is theoretically clean but practically painful for OLTP workloads. Most production systems stop at 3NF or BCNF because the anomalies addressed by higher forms are rare enough that the join overhead isn't worth it.

**Under-normalizing** stores the same fact in multiple places. When that fact changes, every copy must be updated atomically. Miss one and you have a data corruption bug. This is the classic update anomaly normalization was designed to prevent.

**Premature denormalization** adds write complexity before you've measured whether reads are actually slow. Profile first. Denormalize only when a specific query is a proven bottleneck and indexes can't fix it. Denormalizing speculatively creates maintenance burden with no guaranteed payoff.

## Questions

> [!QUESTION]- What is normalization and why do most systems stop at 3NF/BCNF?
> Normalization eliminates redundancy by decomposing tables so each fact is stored once, preventing update anomalies. Most production OLTP systems stop at 3NF or BCNF because higher forms (4NF, 5NF) address rare anomalies (multivalued and join dependencies) at the cost of more tables and more joins. The decomposition overhead rarely pays off outside temporal or analytical databases.

> [!QUESTION]- When would you denormalize a table, and what risks does it introduce?
> Denormalize when a read-heavy workload has expensive joins that indexes can't fix: common in reporting, analytics, or high-throughput APIs. Risks: update anomalies (copies get out of sync), data inconsistency if writes don't update all copies atomically, and increased write complexity. Always measure before denormalizing; premature denormalization adds maintenance cost for no proven benefit.

> [!QUESTION]- What is the difference between 2NF and 3NF, and how would you recognize a violation of each?
> 2NF eliminates partial dependencies: every non-key attribute must depend on the entire composite primary key, not just part of it. A violation looks like a column that depends on only one column of a multi-column PK. 3NF eliminates transitive dependencies: non-key attributes must depend directly on the PK, not through another non-key attribute. A violation looks like column A depending on the PK, column B depending on A (not on the PK directly). Fixing both involves decomposing the offending columns into separate tables.

## Links

For a deeper study of the topic, the book ["Introduction to Database Systems" by Chris J. Date](https://www.oreilly.com/library/view/an-introduction-to/9780132874281/) is recommended.

- [Database normalization (Wikipedia)](https://en.wikipedia.org/wiki/Database_normalization)
- [Denormalization (Wikipedia)](https://en.wikipedia.org/wiki/Denormalization)
- [Data partitioning strategies - Microsoft Azure Architecture](https://learn.microsoft.com/azure/architecture/best-practices/data-partitioning-strategies)
- [Designing Data-Intensive Applications - Martin Kleppmann (O'Reilly)](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) - covers denormalization, replication, and consistency tradeoffs in production systems
- [Description of the database normalization basics (Microsoft Learn)](https://learn.microsoft.com/troubleshoot/microsoft-365-apps/access/database-normalization-description)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/03 Data Persistence/03 Data Persistence|03 Data Persistence]]
>
> **Pages**
> - [[Software Engineering/03 Data Persistence/SQL/Indexes|Indexes]]
> - [[Software Engineering/03 Data Persistence/SQL/Replication|Replication]]
> - [[Software Engineering/03 Data Persistence/SQL/Sharding|Sharding]]
<!-- whats-next:end -->
