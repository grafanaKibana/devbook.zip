---
{"dg-publish":true,"permalink":"/software-engineering/03-data-persistence/sql/normalization-denormalization/","noteIcon":"1"}
---


# Intro

Normalization is the process of structuring a relational database to eliminate data redundancy and ensure data integrity. It progresses through normal forms (1NF through 6NF), each imposing stricter rules on how attributes depend on keys. The goal is to store each fact exactly once, making updates safer and queries more predictable.

## Deeper Explanation

Normalization is the process of organizing data in a database. It involves creating tables and establishing relationships between them according to rules designed both to protect data and to increase the database's flexibility by eliminating redundancy and inconsistent dependencies.
Data redundancy leads to wasted disk space and makes database maintenance harder. For example, if data stored in multiple places needs to be changed, the same change must be applied everywhere. Changing a customer's address is easier when that data is stored only in the Customers table and nowhere else in the database.

## First Normal Form

A relation is in 1NF if all its attributes are simple and all domains used contain only atomic values. There must be no repeating rows in the table.

For example, consider the "Cars" table:

| Make | Models |
| --- | --- |
| Audi | A4, S5, RS6, TT |
| Infiniti | Q50 |

The 1NF violation occurs for the Audi models because a single cell contains a list of 3 elements: M5, X5M, M1, which is not atomic. Convert the table to 1NF:

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

(a special case of Third Normal Form)**

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

However, if you add to the original relation variable an attribute that functionally depends on the candidate key, for example a price including delivery cost ({Restaurant, Pizza type, Delivery area} → Price), then the resulting relation will be in 4NF and it can no longer be decomposed losslessly.

## Fifth Normal Form

Relations are in 5NF if they are in 4NF and there are no complex join dependencies between attributes.

If "Attribute_1" depends on "Attribute_2", and "Attribute_2" in turn depends on "Attribute_3", and "Attribute_3" depends on "Attribute_1", then all three attributes must appear in a single tuple.

This is a very strict requirement that can be satisfied only under additional conditions. In practice, it is difficult to find a clean real-world example of this requirement.

For example, suppose a table has three attributes: "Supplier", "Product", and "Customer". Customer_1 buys several Products from Supplier_1. Customer_1 buys a new Product from Supplier_2. Then, under the requirement described above, Supplier_1 would be forced to supply that same new Product to Customer_1, and Supplier_2 would be forced to supply Customer_1 not only the new Product but also the entire product catalog of Supplier_1. This does not happen in practice. Customers are free to choose products. Therefore, to eliminate this difficulty, all three attributes are split into separate relations (tables). After creating the three new relations (Supplier, Product, and Customer), it is important to remember that when retrieving information (for example, about customers and products), the query must join all three relations. Any combination of joining only two of the three relations will inevitably lead to incorrect results. Some DBMSs provide special mechanisms to prevent retrieving inconsistent data. Nevertheless, the general recommendation is to design the database schema to avoid the need for 4NF and 5NF.

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

## Questions

> [!QUESTION]- What is normalization?
> Normalization is organizing relational data to reduce redundancy and avoid update anomalies by decomposing tables and defining keys/relationships (e.g., 1NF, 2NF, 3NF). The goal is consistency and maintainability, not always maximum read performance.

> [!QUESTION]- What is denormalization?
> Denormalization is intentionally introducing redundancy (e.g., duplicating fields, adding aggregates/materialized views) to speed up reads and simplify queries. It shifts complexity to writes and requires extra care to keep data consistent.

## Links

For a deeper and more thorough study of the topic, the book "Introduction to Database Systems" by Chris J. Date is recommended; the materials from that book were used as the basis for this article.

- [Database normalization (Wikipedia)](https://en.wikipedia.org/wiki/Database_normalization)
- [Denormalization (Wikipedia)](https://en.wikipedia.org/wiki/Denormalization)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/03 Data Persistence/03 Data Persistence\|03 Data Persistence]]
>
> **Pages**
> - [[Software Engineering/03 Data Persistence/SQL/Indexes\|Indexes]]
<!-- whats-next:end -->
