---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Composite arranges objects into tree structures and lets clients treat individual objects and compositions uniformly through one interface."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Structural/Composite"
flashcard_uid: "dfa91e71"
---

A military command tree illustrates Composite. An order sent to a division flows through its child units until it reaches individual soldiers. The caller uses the same command operation at every level and leaves recursion to the hierarchy.

The Composite pattern represents part-whole trees through one component interface. A leaf performs an operation directly. A composite implements the same operation by delegating to its children, which may be leaves or more composites. In a catalog, both `SingleProduct` and `ProductBundle` can expose `GetPrice()`. A bundle calculates its price from the components below it, while the caller works with either object in the same way.

```mermaid
classDiagram
    class IOrderComponent {

        +GetPrice() decimal
        +GetDescription() string
    }
    class SingleProduct {
        -price decimal
        +GetPrice() decimal
    }
    class ProductBundle {
        -children List of IOrderComponent
        +GetPrice() decimal
        +Add(component)
    }
    IOrderComponent <|.. SingleProduct
    IOrderComponent <|.. ProductBundle
    ProductBundle o--> IOrderComponent : contains children
```

# Problem

`PricingService` has separate logic for individual products, simple bundles, and nested bundles. Three code paths, recursive logic scattered in the service:

```csharp
public class PricingService
{
    // ⚠️ Three separate methods for what is conceptually one operation
    public decimal GetProductPrice(Product product) => product.Price;

    public decimal GetBundlePrice(ProductBundle bundle)
    {
        decimal total = 0;
        foreach (var item in bundle.Items)
        {
            // ⚠️ Type-checking — breaks when a new item type is added
            if (item is Product p)
                total += p.Price;
            else if (item is ProductBundle subBundle)
                total += GetBundlePrice(subBundle); // ⚠️ manual recursion in the service
            else
                throw new NotSupportedException($"Unknown item type: {item.GetType().Name}");
        }
        return total * (1 - bundle.DiscountPercent / 100m);
    }

    // ⚠️ Cart pricing duplicates the same type-checking logic
    public decimal GetCartTotal(ShoppingCart cart)
    {
        decimal total = 0;
        foreach (var item in cart.Items)
        {
            if (item is Product p) total += p.Price * item.Quantity;
            else if (item is ProductBundle b) total += GetBundlePrice(b) * item.Quantity;
            // ⚠️ Adding SubscriptionProduct requires editing this AND GetBundlePrice
        }
        return total;
    }
}
```

Adding `SubscriptionProduct` requires editing every method that branches on concrete item types. That list grows with each new pricing operation.

# Solution

`SingleProduct` and `ProductBundle` both implement `IOrderComponent`. Pricing then follows the tree through ordinary polymorphic calls:

```csharp
// Component interface — the uniform contract
public interface IOrderComponent
{
    string Name { get; }
    decimal GetPrice();
    int GetItemCount(); // works for both leaf and composite
}

// Leaf — individual product
public class SingleProduct(Product product) : IOrderComponent
{
    public string Name => product.Name;
    public decimal GetPrice() => product.Price;
    public int GetItemCount() => 1;
}

// Composite — bundle containing other components (products or sub-bundles)
public class ProductBundle : IOrderComponent
{
    private readonly List<IOrderComponent> _components = [];
    private readonly decimal _discountPercent;

    public ProductBundle(string name, decimal discountPercent = 0)
    {
        Name = name;
        _discountPercent = discountPercent;
    }

    public string Name { get; }

    public void Add(IOrderComponent component) => _components.Add(component);
    public void Remove(IOrderComponent component) => _components.Remove(component);

    // ✅ Recursive — delegates to children, which may themselves be composites
    public decimal GetPrice()
    {
        var subtotal = _components.Sum(c => c.GetPrice());
        return subtotal * (1 - _discountPercent / 100m);
    }

    public int GetItemCount() => _components.Sum(c => c.GetItemCount()); // ✅ recursive count
}

// ✅ Adding SubscriptionProduct = new leaf class, zero changes to bundle or pricing logic
public class SubscriptionProduct(Product plan, int months) : IOrderComponent
{
    public string Name => $"{plan.Name} ({months}mo)";
    public decimal GetPrice() => plan.Price * months;
    public int GetItemCount() => 1;
}

// PricingService works against IOrderComponent — no type-checking
public class PricingService
{
    // ✅ One method handles products, bundles, nested bundles, subscriptions — uniformly
    public decimal GetPrice(IOrderComponent component) => component.GetPrice();

    public decimal GetCartTotal(IReadOnlyList<(IOrderComponent Component, int Quantity)> items) =>
        items.Sum(i => i.Component.GetPrice() * i.Quantity);
}

// Building a nested bundle tree
var laptop = new SingleProduct(new Product { Name = "Laptop Pro", Price = 1299m });
var mouse = new SingleProduct(new Product { Name = "Wireless Mouse", Price = 49m });
var keyboard = new SingleProduct(new Product { Name = "Mechanical Keyboard", Price = 129m });

var peripheralsBundle = new ProductBundle("Peripherals Bundle", discountPercent: 10);
peripheralsBundle.Add(mouse);
peripheralsBundle.Add(keyboard);

var workstationBundle = new ProductBundle("Workstation Bundle", discountPercent: 15);
workstationBundle.Add(laptop);
workstationBundle.Add(peripheralsBundle); // ✅ bundle-of-bundles — same interface

// ✅ Client doesn't know or care about the tree structure
Console.WriteLine($"Total: {workstationBundle.GetPrice():C}");
Console.WriteLine($"Items: {workstationBundle.GetItemCount()}");
```

`SubscriptionProduct` now needs only an `IOrderComponent` implementation. Neither `ProductBundle` nor `PricingService` changes.

# Common .NET Examples

**`IConfiguration`** exposes hierarchical configuration through `IConfigurationSection` nodes. Callers traverse the merged tree without handling each provider separately.

**`CompositeFileProvider`** presents several `IFileProvider` instances as one provider. `GetFileInfo()` searches the composed sources through a single contract.

**`CancellationTokenSource.CreateLinkedTokenSource()`** creates one cancellation source driven by any linked token. Callers observe a single token.

**A Blazor component tree** lets the renderer traverse leaf components and components with `RenderFragment` children through the same rendering model.

# Pitfalls

**Composite-only operations in the shared interface.** `Add()` and `Remove()` do not make sense for leaves. Putting them on `IOrderComponent` forces leaf implementations to reject valid-looking calls. The shared contract should therefore contain only operations supported by every node, with child management exposed on `ProductBundle`.

**Cycles.** A bundle that contains itself, directly or through descendants, makes recursive operations overflow the stack. Acyclic structure must therefore be enforced when children are attached.

**Repeated traversal.** `GetPrice()` walks the tree on every call. Large or frequently read trees may need cached aggregates with explicit invalidation. That optimization also makes mutation harder, so it belongs behind measurements.

# Tradeoffs

| Concern | Composite | Type-checking in service |
|---|---|---|
| Adding a new item type | New leaf class, zero changes to service | Edit every method that type-checks |
| Recursive operations | Automatic via delegation | Manual recursion in service |
| Type safety | Uniform interface, no casting | Explicit type checks, runtime errors |
| Leaf-only operations | Must be excluded from interface | Can be called directly on concrete type |
| Complexity | Tree structure, recursive calls | Flat logic, easier to trace |

Composite fits a genuine part-whole tree when callers need the same operation on leaves and groups. Repeated `if (item is X)` branches across several operations are a useful signal. A fixed two-type model may be clearer without the extra abstraction.

# Questions

> [!qard]- What is the Composite pattern?
> Composite represents a part-whole tree so that clients treat a single object and a group of objects through the same interface. A leaf implements an operation directly. A composite implements the same operation by delegating to its children, which may be leaves or other composites, and combining their results.
> 
> Example: in a product catalog, `SingleProduct` and `ProductBundle` both implement `IOrderComponent.GetPrice()`. A product returns its own price. A bundle sums `GetPrice()` over its children and applies its discount, so a bundle of bundles is priced by the same call. A caller prices any item without checking whether it is a product or a bundle.
> 
> This removes repeated type checks such as `item is ProductBundle` from client code. A new leaf type, such as a subscription product, needs no changes to bundles or callers.
> 
> Limits:
> 
> - Child management such as `Add` and `Remove` makes sense only for composites. Putting it on the shared interface forces leaves to reject those calls.
> - The tree must stay acyclic. A bundle that contains itself makes recursive operations overflow the stack.
> - Composite fits a genuine part-whole hierarchy. A fixed model with two types may be clearer without it.
> 
> [[Home/Software Architecture/Patterns/Design Patterns/Structural/Composite#Solution|Composite: Solution]] · [[Home/Software Architecture/Patterns/Design Patterns/Structural/Composite#Pitfalls|Composite: Pitfalls]] · [[Home/Software Architecture/Patterns/Design Patterns/Structural/Composite#Tradeoffs|Composite: Tradeoffs]]

<!-- qard-id: 8f4307a0-4159-4ab4-8545-5ebb68edea67 -->
> [!qard]- How does Composite relate to the Visitor pattern?
> Composite and Visitor are complementary. Composite defines the structure of a part-whole tree, and Visitor defines operations over the node types in that tree, so the two can be combined.
> 
> - **Composite:** leaves and groups share one component interface. A group implements each operation by delegating to its children, so callers treat any node the same way.
> - **Visitor:** each operation lives in a separate visitor that handles every node type, instead of being a method on every node class.
> 
> In a plain Composite, operations such as `GetPrice()` and `GetItemCount()` are members of the shared interface, so every node class must implement each new operation. Adding Visitor moves operations out of the nodes. That combination fits when the set of node types is stable and new operations are added more often than new node types.
> 
> [[Home/Software Architecture/Patterns/Design Patterns/Structural/Composite#Solution|Composite: Solution]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Visitor#Solution|Visitor: Solution]]

<!-- qard-id: f0a1848f-dec9-4f37-b624-65917ba18bca -->
> [!qard]- When does a Composite tree become a performance problem?
> A Composite tree becomes a performance problem when recursive operations walk a large tree, or walk it very often, and measurements show that the repeated traversal is a significant cost. A call such as `GetPrice()` on a bundle visits every node below it each time it runs, so its work grows with the size of the traversed subtree.
> 
> One remedy is to cache an aggregate, such as a bundle's subtotal, or to keep it updated as the tree changes. That moves cost and risk to mutation: every change below a cached value must invalidate or update it, or reads return stale results. Because the optimization adds this consistency rule and makes mutation harder, measurements of the real workload justify it, not tree size alone.
> 
> [[Home/Software Architecture/Patterns/Design Patterns/Structural/Composite#Solution|Composite: Solution]] · [[Home/Software Architecture/Patterns/Design Patterns/Structural/Composite#Pitfalls|Composite: Pitfalls]]

# References

- [Composite pattern](https://refactoring.guru/design-patterns/composite)
- [Composite Pattern — Christopher Okhravi](https://www.youtube.com/watch?v=EWDmWbJ4wRA&list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc&index=14)
- [IConfiguration — .NET's built-in Composite for layered configuration](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.configuration.iconfiguration)
