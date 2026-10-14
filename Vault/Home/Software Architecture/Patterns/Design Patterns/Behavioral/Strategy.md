---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Defines a family of algorithms behind a common interface and makes them interchangeable at runtime, selected by the client."
level:
  - "2"
priority: High
status: Done
publish: true
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Behavioral/Strategy"
flashcard_uid: "1335da26"
---

A route planner can optimize the same trip for time, distance, or toll cost. The navigation workflow stays put while the routing algorithm changes.

Strategy puts replaceable algorithms behind one contract. A context delegates the variable step to that contract, and a client or selection policy supplies the implementation. The context knows how to use an `IShippingCostStrategy`. It does not need the pricing rules for flat-rate or zone-based shipping. This boundary is useful when algorithms change independently of the workflow around them.

```mermaid
classDiagram
    class ShippingContext {
        -strategy IShippingCostStrategy
        +CalculateCost(order) decimal
    }
    class IShippingCostStrategy {

        +Calculate(order) decimal
    }
    class FlatRateStrategy {
        +Calculate(order) decimal
    }
    class WeightBasedStrategy {
        +Calculate(order) decimal
    }
    class ZoneBasedStrategy {
        +Calculate(order) decimal
    }
    ShippingContext o--> IShippingCostStrategy
    IShippingCostStrategy <|.. FlatRateStrategy
    IShippingCostStrategy <|.. WeightBasedStrategy
    IShippingCostStrategy <|.. ZoneBasedStrategy
```

> [!NOTE] Strategy vs State vs Command
> Strategy varies an algorithm chosen for a context. [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/State]] models behavior that follows an internal mode and transition rules. [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Command]] packages a request so it can be queued, logged, or invoked later.

# Problem

`ShippingService.CalculateCost()` has an if/else chain — adding a new strategy means editing the method:

```csharp
public class ShippingService
{
    // ⚠️ Adding "same-day delivery" requires editing this method
    public decimal CalculateCost(Order order, string strategy)
    {
        if (strategy == "flat_rate")
        {
            return 9.99m;
        }
        else if (strategy == "weight_based")
        {
            var weightKg = order.Items.Sum(i => i.Product.WeightKg * i.Quantity);
            return weightKg * 2.50m;
        }
        else if (strategy == "zone_based")
        {
            var zone = GetShippingZone(order.ShippingAddress);
            return zone switch { 1 => 5.99m, 2 => 9.99m, 3 => 14.99m, _ => 19.99m };
        }
        else if (strategy == "free" && order.Customer.Tier == CustomerTier.Gold)
        {
            return 0m;
        }
        // ⚠️ String comparison — typos compile and fail only at runtime
        throw new ArgumentException($"Unknown strategy: {strategy}");
    }
}
```

Adding same-day delivery changes the same branch that already carries every other pricing rule. Each new variant raises the chance of disturbing an existing one.

# Solution

Each algorithm becomes a strategy class. The context selects the strategy via DI or a registry:

```csharp
// Strategy interface
public interface IShippingCostStrategy
{
    int Priority { get; }
    decimal Calculate(Order order);
    bool AppliesTo(Order order); // ✅ strategy knows when it's applicable
}

// Concrete strategies
public class FlatRateStrategy : IShippingCostStrategy
{
    public int Priority => 0;
    public decimal Calculate(Order order) => 9.99m;
    public bool AppliesTo(Order order) => true; // always applicable as fallback
}

public class WeightBasedStrategy : IShippingCostStrategy
{
    private const decimal RatePerKg = 2.50m;
    public int Priority => 100;

    public decimal Calculate(Order order)
    {
        var totalWeightKg = order.Items.Sum(i => i.Product.WeightKg * i.Quantity);
        return Math.Max(totalWeightKg * RatePerKg, 4.99m); // minimum charge
    }

    public bool AppliesTo(Order order) =>
        order.Items.Any(i => i.Product.WeightKg > 0);
}

public class ZoneBasedStrategy(IZoneCalculator zoneCalc) : IShippingCostStrategy
{
    private static readonly Dictionary<int, decimal> ZoneRates = new()
        { [1] = 5.99m, [2] = 9.99m, [3] = 14.99m };
    public int Priority => 200;

    public decimal Calculate(Order order)
    {
        var zone = zoneCalc.GetZone(order.ShippingAddress);
        return ZoneRates.GetValueOrDefault(zone, 19.99m);
    }

    public bool AppliesTo(Order order) => order.ShippingAddress is not null;
}

public class FreeShippingStrategy : IShippingCostStrategy
{
    public int Priority => 400;
    public decimal Calculate(Order order) => 0m;
    public bool AppliesTo(Order order) =>
        order.Customer.Tier == CustomerTier.Gold || order.Total >= 100m;
}

// ✅ Adding same-day delivery = new class, zero changes to existing strategies
public class SameDayDeliveryStrategy : IShippingCostStrategy
{
    public int Priority => 300;
    public decimal Calculate(Order order) => 24.99m;
    public bool AppliesTo(Order order) =>
        order.ShippingAddress is { } address &&
        address.City == order.WarehouseCity &&
        DateTime.UtcNow.Hour < 14;
}

// Context — selects and applies the strategy
public class ShippingService(IEnumerable<IShippingCostStrategy> strategies)
{
    public decimal CalculateCost(Order order)
    {
        // ✅ Strategy selection via priority — no if/else
        var candidates = strategies
            .Where(s => s.AppliesTo(order))
            .OrderByDescending(s => s.Priority)
            .ToArray();

        var strategy = candidates.FirstOrDefault()
            ?? throw new InvalidOperationException("No shipping strategy applies");

        if (candidates.Skip(1).FirstOrDefault()?.Priority == strategy.Priority)
            throw new InvalidOperationException($"Multiple shipping strategies have priority {strategy.Priority}");

        return strategy.Calculate(order);
    }
}

// DI registration — adding a strategy = one new registration
builder.Services.AddScoped<IShippingCostStrategy, FreeShippingStrategy>();
builder.Services.AddScoped<IShippingCostStrategy, SameDayDeliveryStrategy>();
builder.Services.AddScoped<IShippingCostStrategy, ZoneBasedStrategy>();
builder.Services.AddScoped<IShippingCostStrategy, WeightBasedStrategy>();
builder.Services.AddScoped<IShippingCostStrategy, FlatRateStrategy>(); // fallback
```

The algorithm now lives in its own class. The selection policy still needs a deterministic precedence rule when several strategies apply. Extracting the calculations does not make that product decision disappear.

# Familiar strategies

**`IComparer<T>`** supplies ordering behavior to sorting APIs. `IComparable<T>` is different: it places the default comparison on the value itself rather than injecting a separate strategy.

**LINQ predicates** pass filtering behavior as a delegate. A one-method strategy often needs no class at all.

**`JsonConverter<T>`** replaces the serialization behavior for a type while `JsonSerializer` keeps the surrounding pipeline.

**`IPasswordHasher<T>`** lets ASP.NET Core Identity depend on a password-hashing contract instead of one implementation.

# Questions

> [!qard]- What is the Strategy pattern?
> Strategy puts interchangeable algorithms for one step of a workflow behind a common contract. The code that runs the workflow calls the contract without knowing which algorithm it is using, so algorithms can be added or replaced independently of that workflow.
> 
> - **Context:** owns the workflow and delegates the variable step. For example, a shipping service calls `IShippingCostStrategy.Calculate(order)` without containing any pricing rules.
> - **Strategy contract:** the interface, or a delegate for a single operation, that every algorithm implements.
> - **Concrete strategies:** the algorithms themselves, such as flat-rate, weight-based or zone-based pricing.
> - **Selection:** a client, configuration or selection policy decides which strategy the context uses.
> 
> **Problem it solves:** without Strategy, one conditional chain holds every variant. Adding same-day delivery then means editing the method that already carries all the other pricing rules, with a risk of disturbing them. With Strategy, a new variant is a new implementation plus its registration, and existing strategies stay unchanged.
> 
> Separating the algorithms does not choose between them. When several could apply, the selection rule remains its own design decision.
> 
> In .NET, `IComparer<T>` is a familiar example: it supplies the ordering that sorting methods use.
> 
> [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Strategy#Problem|Strategy: Problem]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Strategy#Solution|Strategy: Solution]] · [Microsoft: `IComparer<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.icomparer-1)

<!-- qard-id: 1a2ec437-ae29-4464-8e69-1600cc732671 -->
> [!qard]- What determines whether a strategy should use an interface or a `Func<T, TResult>` delegate?
> The shape of the collaboration decides, not whether the strategy holds state. A `Func<T, TResult>` fits when the strategy is a single operation whose parameters and captured variables supply everything it needs. An interface is clearer when the strategy has several related members, its own dependencies, or a lifetime that must be managed.
> 
> - **Delegate:** any lambda or method group with a matching signature can be passed without declaring a type. LINQ predicates and key selectors are strategies of this kind.
> - **Interface:** a named contract keeps related members together. Each implementation can declare constructor dependencies, which a DI container supplies with a chosen lifetime. For example, a shipping-cost strategy that exposes `Priority`, `AppliesTo` and `Calculate` and needs an `IZoneCalculator` is clearer as an interface than as three separate delegates.
> 
> State alone does not decide the choice. A lambda can capture outer variables, and a captured variable is not collected while the delegate that references it is still reachable. A delegate can therefore carry state too.
> 
> [Microsoft: Lambda capture of outer variables](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-expressions#capture-of-outer-variables-and-variable-scope-in-lambda-expressions) · [Microsoft: .NET dependency injection](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/overview)

<!-- qard-id: 687474e2-5f50-417a-9c13-360e0261a9f1 -->
> [!qard]- How should strategy selection work when several strategies can handle the same request?
> Overlaps need an explicit rule owned by the domain: a unique key, a documented precedence, or deliberate composition. The order in which a DI container returns registrations is not such a rule.
> 
> - **Explicit key:** the request carries an identifier, such as the chosen shipping method, that maps to exactly one strategy. Overlaps cannot occur, and an unknown key fails visibly.
> - **Documented precedence:** each strategy reports whether it applies and declares a priority. The highest-priority applicable strategy wins. A tie at the top priority is a configuration error, and it is detected rather than resolved arbitrarily.
> - **Composition:** when combining is the intended behavior, such as applying several eligible discounts, every matching strategy runs under a defined combination rule.
> 
> In .NET's built-in container, resolving a single service returns the last registration, and resolving `IEnumerable<T>` returns all registrations in registration order. That order is deterministic, but it reflects how the application was wired, not a business decision. Reordering registrations would silently change which strategy wins, so any intended order belongs in explicit data such as a priority.
> 
> [Microsoft: Service registration](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/service-registration)

# References

- [Strategy pattern](https://refactoring.guru/design-patterns/strategy)
- [Strategy Pattern — Christopher Okhravi](https://www.youtube.com/watch?v=v9ejT8FO-7I&list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc&index=1)
- [`IComparer<T>` — .NET's built-in Strategy for comparison algorithms](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.icomparer-1)
- [`JsonConverter<T>` — Strategy pattern for JSON serialization](https://learn.microsoft.com/en-us/dotnet/api/system.text.json.serialization.jsonconverter-1)

