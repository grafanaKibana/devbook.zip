---
publish: true
created: 2026-10-28T12:27:03.084Z
modified: 2026-10-28T12:33:02.661Z
published: 2026-10-28T12:33:02.661Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: Adds new operations to an object hierarchy without modifying its classes, using double dispatch via Accept and Visit.
level:
  - "3"
priority: High
status: Ready to Repeat
qard-deck: Software Architecture
qard-topic: Patterns/Design Patterns/Behavioral/Visitor
flashcard_uid: ff80b76c
---

A museum can keep the same exhibits while offering a new audio tour. Each tour performs a different operation over the fixed exhibit set. Adding a tour is cheap. Adding an exhibit forces every tour to decide what to do with it.

Visitor moves operations out of a stable object hierarchy. Each element implements `Accept(IVisitor)`, then calls the overload for its concrete type with `visitor.Visit(this)`. That second call supplies the concrete element type that ordinary interface dispatch would otherwise lose. A visitor can also accumulate state while traversing several elements. The tradeoff is structural: new operations become new visitors, while a new element type changes the visitor contract and every implementation.

```mermaid
classDiagram
    class ICartItem {
        +Accept(visitor ICartItemVisitor)
    }
    class PhysicalProduct {
        +Accept(visitor)
    }
    class DigitalProduct {
        +Accept(visitor)
    }
    class SubscriptionProduct {
        +Accept(visitor)
    }
    class ICartItemVisitor {
        +Visit(PhysicalProduct)
        +Visit(DigitalProduct)
        +Visit(SubscriptionProduct)
    }
    class TaxVisitor
    class ShippingVisitor
    class DiscountVisitor
    ICartItem <|.. PhysicalProduct
    ICartItem <|.. DigitalProduct
    ICartItem <|.. SubscriptionProduct
    ICartItemVisitor <|.. TaxVisitor
    ICartItemVisitor <|.. ShippingVisitor
    ICartItemVisitor <|.. DiscountVisitor
    ICartItem ..> ICartItemVisitor : accepts
```

Modern C# pattern matching handles small type-dispatch problems with less machinery. Visitor becomes useful when the hierarchy is deliberately closed or stable, operations are added more often than element types, and traversal state belongs with the operation.

# Problem

`CartService` has switch/if on item type for every calculation — adding a new item type means editing every calculation:

```csharp
public class CartService
{
    // ⚠️ Type-checking duplicated in every calculation method
    public decimal CalculateTax(ICartItem item)
    {
        if (item is PhysicalProduct physical)
            return physical.Price * 0.20m; // 20% VAT
        else if (item is DigitalProduct digital)
            return digital.Price * 0.05m; // 5% digital tax
        else if (item is SubscriptionProduct subscription)
            return 0m; // subscriptions are tax-exempt
        // ⚠️ Adding GiftCard item type requires editing CalculateTax, CalculateShipping, CalculateDiscount
        throw new NotSupportedException(item.GetType().Name);
    }

    public decimal CalculateShipping(ICartItem item)
    {
        if (item is PhysicalProduct physical)
            return physical.WeightKg * 2.50m;
        else if (item is DigitalProduct)
            return 0m; // no shipping for digital
        else if (item is SubscriptionProduct)
            return 0m;
        throw new NotSupportedException(item.GetType().Name);
    }

    // ⚠️ CalculateDiscount has the same switch — 3 methods × N item types = N×3 combinations
}
```

A new `GiftCard` type must be handled in every calculation. The compiler cannot prove that separate switches remain aligned when the hierarchy is open and each switch has a fallback.

# Solution

**Pattern matching approach** for a small hierarchy:

```csharp
// ✅ Pattern matching — no Visitor ceremony for simple type dispatch
public static class CartCalculations
{
    public static decimal CalculateTax(ICartItem item) => item switch
    {
        PhysicalProduct p => p.Price * 0.20m,
        DigitalProduct d => d.Price * 0.05m,
        SubscriptionProduct => 0m,
        GiftCard => 0m, // ✅ adding GiftCard = one new case per switch
        _ => throw new NotSupportedException(item.GetType().Name)
    };

    public static decimal CalculateShipping(ICartItem item) => item switch
    {
        PhysicalProduct p => p.WeightKg * 2.50m,
        DigitalProduct or SubscriptionProduct or GiftCard => 0m,
        _ => throw new NotSupportedException(item.GetType().Name)
    };
}
```

**Visitor approach** for a stable hierarchy with frequent new operations:

```csharp
// Element interface — accepts a visitor
public interface ICartItem
{
    decimal Price { get; }
    void Accept(ICartItemVisitor visitor); // ✅ double dispatch hook
}

// Visitor interface — one Visit overload per element type
public interface ICartItemVisitor
{
    void Visit(PhysicalProduct item);
    void Visit(DigitalProduct item);
    void Visit(SubscriptionProduct item);
}

// Concrete elements — each calls the correct Visit overload
public class PhysicalProduct : ICartItem
{
    public decimal Price { get; init; }
    public decimal WeightKg { get; init; }
    public void Accept(ICartItemVisitor visitor) => visitor.Visit(this); // ✅ double dispatch
}

public class DigitalProduct : ICartItem
{
    public decimal Price { get; init; }
    public string DownloadUrl { get; init; } = "";
    public void Accept(ICartItemVisitor visitor) => visitor.Visit(this);
}

public class SubscriptionProduct : ICartItem
{
    public decimal Price { get; init; }
    public int MonthsDuration { get; init; }
    public void Accept(ICartItemVisitor visitor) => visitor.Visit(this);
}

// Concrete visitors — each encapsulates one operation across all element types
public class TaxCalculatorVisitor : ICartItemVisitor
{
    public decimal TotalTax { get; private set; }

    public void Visit(PhysicalProduct item) => TotalTax += item.Price * 0.20m;
    public void Visit(DigitalProduct item) => TotalTax += item.Price * 0.05m;
    public void Visit(SubscriptionProduct item) { } // tax-exempt
}

public class ShippingCalculatorVisitor : ICartItemVisitor
{
    public decimal TotalShipping { get; private set; }

    public void Visit(PhysicalProduct item) => TotalShipping += item.WeightKg * 2.50m;
    public void Visit(DigitalProduct item) { } // no shipping
    public void Visit(SubscriptionProduct item) { } // no shipping
}

// ✅ Adding DiscountCalculatorVisitor = new class, zero changes to element classes
public class DiscountCalculatorVisitor(Customer customer) : ICartItemVisitor
{
    public decimal TotalDiscount { get; private set; }

    public void Visit(PhysicalProduct item) =>
        TotalDiscount += customer.Tier == CustomerTier.Gold ? item.Price * 0.10m : 0m;
    public void Visit(DigitalProduct item) =>
        TotalDiscount += customer.Tier == CustomerTier.Gold ? item.Price * 0.05m : 0m;
    public void Visit(SubscriptionProduct item) { } // no discount on subscriptions
}

// Usage
var taxVisitor = new TaxCalculatorVisitor();
foreach (var item in cart.Items)
    item.Accept(taxVisitor);
Console.WriteLine($"Total tax: {taxVisitor.TotalTax:C}");
```

The new discount operation is isolated in one visitor. Adding an element type would have the opposite cost: the visitor interface and every visitor would change.

# Framework examples

**`ExpressionVisitor`** traverses or rewrites expression trees through node-specific visit methods. LINQ providers, including EF Core, use several expression visitors during query preprocessing and translation rather than one visitor that simply emits SQL node by node.

**Roslyn `CSharpSyntaxWalker` and `CSharpSyntaxRewriter`** walk syntax trees with type-specific callbacks. The rewriter can return replacement nodes, which makes the traversal operation reusable without adding methods to Roslyn syntax node classes.

`JsonConverter<T>` is better classified as a serialization strategy than a Visitor: it replaces conversion for one target type and does not provide double dispatch over a stable hierarchy.

# Pitfalls

**New element types touch every visitor.** Adding `GiftCard` requires a new visit method and an implementation in each visitor. A frequently changing hierarchy points toward pattern matching, virtual methods, or another design where element changes remain local.

**Double dispatch is easy to obscure.** The `Accept` call exists solely to reach the overload for the concrete element type. If that mechanism does not buy meaningful operation extensibility, a switch is clearer.

# Tradeoffs

| Concern | Visitor | Pattern matching | Polymorphism (virtual methods) |
|---|---|---|---|
| Adding a new operation | New visitor class | New switch expression | Add method to interface + all classes |
| Adding a new element type | Add to interface + all visitors | Add case to each switch | New class only |
| Element hierarchy stability | Required (stable) | Flexible | Flexible |
| Carrying state across elements | Natural (visitor fields) | Awkward | Awkward |
| Readability | Double dispatch is non-obvious | Explicit and readable | Natural OOP |

Visitor fits a stable element set that receives new cross-cutting operations. Pattern matching keeps a small or changing hierarchy visible in one function. Virtual methods fit behavior that belongs naturally to each element rather than to an external operation.

# Questions

<!-- qard-id: 2203e8b7-3c85-4898-a81c-24b8a34892c5 -->

> [!qard]- What is double dispatch, and why does the Visitor pattern need it?
> Double dispatch chooses the code to run from the runtime types of two objects, here the element and the visitor. Visitor needs it because an ordinary virtual call dispatches on only one runtime type, and ordinary C# overload resolution picks a `Visit` overload at compile time from the argument's static type. Through an `ICartItem` reference, the concrete element type is not available for that choice.
>
> Visitor recovers it in two dispatches:
>
> 1. The caller invokes `item.Accept(visitor)`. Virtual dispatch on `item` runs the concrete element's `Accept`, such as `PhysicalProduct.Accept`.
> 2. Inside that method, `this` has the static type `PhysicalProduct`, so `visitor.Visit(this)` binds to the `Visit(PhysicalProduct)` overload at compile time.
> 3. That call is virtual on the visitor, so it runs the concrete visitor's implementation, such as `TaxCalculatorVisitor.Visit(PhysicalProduct)`.
>
> The first dispatch fixes the element type and the second fixes the operation. New operations can therefore be added as new visitor classes without changing the element classes.
>
> [[Software Architecture/Patterns/Design Patterns/Behavioral/Visitor#Solution|Visitor implementation]] · [[Software Architecture/Patterns/Design Patterns/Behavioral/Visitor#Pitfalls|Visitor pitfalls]]

<!-- qard-id: 60362454-c9c3-4efc-aef1-35553bd028bb -->

> [!qard]- When does EF Core use `ExpressionVisitor`, and what does it do?
> EF Core uses expression visitors when it translates a LINQ query for execution. A series of visitor passes walks the query's expression tree, reshapes it into a form the provider can handle, and translates the supported parts into the provider's query, such as SQL.
>
> - **Traversal:** `ExpressionVisitor` provides node-specific visit methods, so a pass can handle method calls, member access or constants differently.
> - **Rewriting:** a visit method can return a replacement node, so each pass hands a reshaped tree to the next. No single visitor simply emits SQL node by node.
> - **Phases:** preprocessing passes reshape the query, and translation passes then convert it into the provider's representation.
>
> Each pass is a separate operation over the same tree structure, which is the kind of variation Visitor is designed for.
>
> A translation error does not by itself show that a visit method or overload is missing. It can occur when the active provider lacks a server-side translation for that expression in that query context, but the error alone does not establish a single cause.
>
> [[Software Architecture/Patterns/Design Patterns/Behavioral/Visitor#Framework examples|Visitor framework examples]] · [EF Core: client vs. server evaluation](https://learn.microsoft.com/en-us/ef/core/querying/client-eval) · [EF Core source: QueryTranslationPreprocessor](https://github.com/dotnet/efcore/blob/main/src/EFCore/Query/QueryTranslationPreprocessor.cs)

<!-- qard-id: 66e5c82b-2a1f-4c67-b188-2c409f153b90 -->

> [!qard]- When is pattern matching a better fit than Visitor?
> Pattern matching is a better fit when the type set is small or when there are only a few short operations. A `switch` expression keeps the type dispatch visible in one function, without `Accept` methods or a visitor interface. A closed type set does not decide the choice by itself, because Visitor also depends on a stable element set. Visitor earns its ceremony when element types are stable, new operations are added often, and those operations benefit from carrying state across elements.
>
> | Aspect | Pattern matching | Visitor |
> |---|---|---|
> | Adding an operation | Another function with a `switch` over the types. | Another visitor class; element classes do not change. |
> | Adding an element type | A new case in each relevant `switch`. | A new `Visit` method on the visitor interface, implemented in every visitor. |
> | Detecting a missed case | Over an open hierarchy with a discard `_` arm, the compiler cannot report a forgotten type; the value reaches the discard, which may throw at run time. | Adding the method to the visitor interface makes every visitor that lacks it fail to compile. |
> | State across elements | Awkward; a `switch` holds no state between elements, so an accumulator lives in surrounding code that the arms or the caller update. | Natural; a visitor accumulates results in its own fields during traversal. |
> | Readability | Dispatch is explicit in one place. | Double dispatch through `Accept` is harder to follow. |
>
> [C#: pattern matching](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/patterns/pattern-matching) · [[Software Architecture/Patterns/Design Patterns/Behavioral/Visitor#Tradeoffs|Visitor tradeoffs]] · [[Software Architecture/Patterns/Design Patterns/Behavioral/Visitor#Problem|Visitor problem]]

# References

- [Visitor pattern](https://refactoring.guru/design-patterns/visitor)
- [ExpressionVisitor — .NET's built-in Visitor for LINQ expression trees](https://learn.microsoft.com/en-us/dotnet/api/system.linq.expressions.expressionvisitor)
- [CSharpSyntaxWalker — Roslyn's Visitor for C# syntax trees](https://learn.microsoft.com/en-us/dotnet/api/microsoft.codeanalysis.csharp.csharpsyntaxwalker)
- [Pattern matching — modern C# alternative to Visitor for type dispatch](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns)
