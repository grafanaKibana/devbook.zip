---
publish: true
created: 2026-10-28T12:27:03.095Z
modified: 2026-10-28T12:33:02.663Z
published: 2026-10-28T12:33:02.663Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: Bridge decouples an abstraction from its implementation so the two hierarchies can evolve independently instead of exploding combinatorially.
level:
  - "3"
priority: High
status: Ready to Repeat
qard-deck: Software Architecture
qard-topic: Patterns/Design Patterns/Structural/Bridge
flashcard_uid: 71628ab5
---

A remote control defines operations such as power and volume. A television brand supplies the hardware-specific implementation. Connecting the two through a stable device interface allows either side to change without rebuilding the other hierarchy.

The Bridge pattern separates an abstraction from its implementation so both can evolve independently. The abstraction holds an implementation interface instead of inheriting from a concrete implementation. For payments, operation types such as charges or refunds form one dimension, while providers form another. Combining both dimensions through inheritance produces classes such as `StripeCharge` and `PayPalRefund`. A bridge keeps the two sets separate and joins them through delegation.

```mermaid
classDiagram
    class PaymentAbstraction {

        #implementor IPaymentImplementor
        +Execute()
    }
    class SingleCharge {
        +Execute()
    }
    class SubscriptionPayment {
        +Execute()
    }
    class IPaymentImplementor {

        +ProcessAmount()
        +Refund()
    }
    class StripeImplementor
    class PayPalImplementor
    class BankTransferImplementor
    PaymentAbstraction <|-- SingleCharge
    PaymentAbstraction <|-- SubscriptionPayment
    PaymentAbstraction o--> IPaymentImplementor : bridge
    IPaymentImplementor <|.. StripeImplementor
    IPaymentImplementor <|.. PayPalImplementor
    IPaymentImplementor <|.. BankTransferImplementor
```

> [!NOTE] Bridge vs Adapter
> [[Software Architecture/Patterns/Design Patterns/Structural/Adapter]] retrofits an interface that cannot be changed. Bridge is designed around two independent dimensions from the start. Legacy integration points toward Adapter. A new model with independently growing abstractions and implementations points toward Bridge.

# Problem

`PaymentService` has methods per provider. Adding a new payment type (subscription) AND a new provider (BankTransfer) causes a combinatorial explosion:

```csharp
// ⚠️ 3 providers × 3 payment types = 9 methods, growing to N×M
public class PaymentService
{
    public Task<Payment> ProcessStripeChargeAsync(Order order) { /* Stripe API */ return null!; }
    public Task<Payment> ProcessStripeSubscriptionAsync(Customer customer, Product plan) { /* Stripe */ return null!; }
    public Task<bool> ProcessStripeRefundAsync(Payment payment) { /* Stripe */ return null!; }

    public Task<Payment> ProcessPayPalChargeAsync(Order order) { /* PayPal API */ return null!; }
    public Task<Payment> ProcessPayPalSubscriptionAsync(Customer customer, Product plan) { /* PayPal */ return null!; }
    public Task<bool> ProcessPayPalRefundAsync(Payment payment) { /* PayPal */ return null!; }

    // ⚠️ Adding BankTransfer requires 3 more methods
    // ⚠️ Adding "partial refund" payment type requires 2 more methods (one per provider)
    // ⚠️ Shared logic (retry, logging, idempotency) duplicated across all methods
}
```

A partial refund must be implemented once per provider, and every new provider needs its own version of every payment operation. The two dimensions are locked together.

# Solution

The solution separates payment operations from provider implementations:

```csharp
// Implementation interface — the "bridge"
public interface IPaymentGateway
{
    Task<string> AuthorizeAsync(decimal amount, string currency, PaymentMethod method);
    Task<string> CaptureAsync(string authorizationId);
    Task<bool> RefundAsync(string transactionId, decimal amount);
    Task<string> CreateSubscriptionAsync(string customerId, string planId, decimal amount);
}

// Concrete implementations — one per provider
public class StripeGateway(StripeOptions options) : IPaymentGateway
{
    public async Task<string> AuthorizeAsync(decimal amount, string currency, PaymentMethod method)
    {
        // Stripe-specific API call
        var intent = await StripeClient.CreatePaymentIntentAsync(amount, currency, method.Token);
        return intent.Id;
    }
    public Task<string> CaptureAsync(string authorizationId) =>
        StripeClient.CapturePaymentIntentAsync(authorizationId);
    public Task<bool> RefundAsync(string transactionId, decimal amount) =>
        StripeClient.CreateRefundAsync(transactionId, amount);
    public Task<string> CreateSubscriptionAsync(string customerId, string planId, decimal amount) =>
        StripeClient.CreateSubscriptionAsync(customerId, planId);
}

public class PayPalGateway(PayPalOptions options) : IPaymentGateway
{
    public Task<string> AuthorizeAsync(decimal amount, string currency, PaymentMethod method) =>
        PayPalClient.CreateOrderAsync(amount, currency, method.PayPalToken);
    public Task<string> CaptureAsync(string authorizationId) =>
        PayPalClient.CaptureOrderAsync(authorizationId);
    public Task<bool> RefundAsync(string transactionId, decimal amount) =>
        PayPalClient.RefundCaptureAsync(transactionId, amount);
    public Task<string> CreateSubscriptionAsync(string customerId, string planId, decimal amount) =>
        PayPalClient.CreateSubscriptionAsync(customerId, planId);
}

// Abstraction — payment types, each using the gateway bridge
public abstract class PaymentOperation(IPaymentGateway gateway)
{
    protected readonly IPaymentGateway Gateway = gateway;
    public abstract Task<Payment> ExecuteAsync(Order order);
}

// ✅ Concrete abstractions — payment types vary independently of providers
public class SingleChargePayment(IPaymentGateway gateway) : PaymentOperation(gateway)
{
    public override async Task<Payment> ExecuteAsync(Order order)
    {
        var authId = await Gateway.AuthorizeAsync(order.Total, "USD", order.Customer.PaymentMethod);
        var captureId = await Gateway.CaptureAsync(authId);
        return new Payment(captureId, order.Total, PaymentStatus.Captured);
    }
}

public class SubscriptionPayment(IPaymentGateway gateway, string planId) : PaymentOperation(gateway)
{
    public override async Task<Payment> ExecuteAsync(Order order)
    {
        var subscriptionId = await Gateway.CreateSubscriptionAsync(
            order.Customer.Id.ToString(), planId, order.Total);
        return new Payment(subscriptionId, order.Total, PaymentStatus.Subscribed);
    }
}

// ✅ Adding PartialRefundPayment = one new class, works with ALL providers
public class PartialRefundPayment(IPaymentGateway gateway, string originalTransactionId, decimal refundAmount)
    : PaymentOperation(gateway)
{
    public override async Task<Payment> ExecuteAsync(Order order)
    {
        var success = await Gateway.RefundAsync(originalTransactionId, refundAmount);
        return new Payment(originalTransactionId, refundAmount,
            success ? PaymentStatus.Refunded : PaymentStatus.Failed);
    }
}

// ✅ Adding BankTransferGateway = one new class, works with ALL payment types
public class BankTransferGateway(BankOptions options) : IPaymentGateway { /* ... */ }

// Usage: combine any abstraction with any implementation
var stripeGateway = new StripeGateway(stripeOptions);
var singleCharge = new SingleChargePayment(stripeGateway);
var payment = await singleCharge.ExecuteAsync(order);

// Switch to PayPal: change the gateway, keep the payment type
var paypalGateway = new PayPalGateway(paypalOptions);
var paypalCharge = new SingleChargePayment(paypalGateway);
```

A new payment-operation variant expressible through the existing gateway primitives needs one `PaymentOperation` subclass. A new provider needs one `IPaymentGateway` implementation. Adding a genuinely new primitive changes `IPaymentGateway` and every provider implementation; Bridge prevents a provider-by-operation subclass cross-product, not evolution of the shared implementor contract.

# Related .NET Abstractions

**ADO.NET `DbConnection` / `DbCommand`** provide base types for database-specific implementations such as `SqlConnection`. This is provider polymorphism, not a clear Bridge by itself: application code still varies along one provider dimension unless a separate abstraction hierarchy composes with it.

**`ILogger<T>` and logging providers** separate logging calls from destinations. That boundary is closer to Strategy or ordinary interface polymorphism because the consumer has no second abstraction hierarchy that varies independently.

**`IDistributedCache`** follows the same shape. DI selects one cache implementation behind one application-facing interface. It becomes Bridge-like only when another independently changing abstraction composes with that provider contract.

# Pitfalls

**Premature abstraction.** One implementation and one operation do not need two class hierarchies. A direct implementation is easier to trace. Bridge earns its extra indirection when the second independent dimension appears.

**Implementation details in the bridge.** A gateway that exposes `PaymentIntentId` has embedded a Stripe concept in the shared contract. Provider-neutral terms such as `transactionId` keep other implementations from pretending to support a foreign model.

**False independence.** Bridge assumes the combinations are meaningful. If subscriptions only work with Stripe, provider and payment type are coupled, and the abstraction advertises flexibility the system does not have.

# Tradeoffs

| Concern | Bridge | Monolithic class hierarchy |
|---|---|---|
| Adding a new provider | One new implementation class | N new methods (one per payment type) |
| Adding an operation variant from existing gateway primitives | One new abstraction class | M new methods (one per provider) |
| Shared logic (retry, logging) | In the abstraction base class | Duplicated across all methods |
| Complexity | Two class hierarchies, indirection | Single hierarchy, direct calls |
| Testability | Mock `IPaymentGateway` for abstraction tests | Must mock entire service |

Bridge becomes useful when both dimensions already vary or are about to vary. A 2×2 = 4 combination is a useful prompt to inspect the design, though repeated methods that differ only by provider are stronger evidence. With one dimension, Strategy or a direct implementation is usually enough.

# Questions

<!-- qard-id: f98e706c-1721-4045-a5cf-9699a6a299a6 -->

> [!qard]- When does the Bridge pattern add value beyond choosing one implementation behind an interface?
> Bridge adds value when a design has two dimensions that vary independently, such as payment operations and payment providers, and operations must combine freely with providers. Choosing one implementation behind one interface varies only one dimension. That is ordinary polymorphism or a dependency-injection registration, or Strategy when the implementations are interchangeable algorithms for one behavior.
>
> Signals that a second dimension is real:
>
> - **Both sides change:** new operation variants and new providers are both being added, or are about to be.
> - **Code multiplies by combination:** methods differ only by provider, such as `ProcessStripeRefundAsync` and `ProcessPayPalRefundAsync`. Each new operation is then written once per provider, and each new provider repeats every operation.
> - **Combinations are meaningful:** every operation genuinely works with every provider. If subscriptions work with only one provider, the dimensions are coupled, and a Bridge advertises flexibility the system does not have.
>
> With one operation and one implementation, two hierarchies add indirection without a payoff, and a direct implementation is easier to trace.
>
> [[Software Architecture/Patterns/Design Patterns/Structural/Bridge#Problem|Bridge: Problem]] · [[Software Architecture/Patterns/Design Patterns/Structural/Bridge#Pitfalls|Bridge: Pitfalls]] · [[Software Architecture/Patterns/Design Patterns/Structural/Bridge#Tradeoffs|Bridge: Tradeoffs]]

> [!qard]- What is the Bridge pattern?
> Bridge separates an abstraction from its implementation into two class hierarchies joined by composition, so each hierarchy can be extended independently. The abstraction holds a reference to an implementation interface and delegates low-level work to it, instead of inheriting from a concrete implementation.
>
> Payment example:
>
> - **Abstraction hierarchy:** `PaymentOperation`, with variants such as `SingleChargePayment`, `SubscriptionPayment` and `PartialRefundPayment`. Each variant defines what the operation does.
> - **Implementation interface (the bridge):** `IPaymentGateway`, with primitives such as authorize, capture, refund and create subscription.
> - **Concrete implementations:** `StripeGateway`, `PayPalGateway` and `BankTransferGateway`. Each maps those primitives to one provider's API.
>
> An operation receives a gateway and calls its primitives. For example, a single charge authorizes and then captures. Any operation can therefore run on any provider:
>
> - A new provider is one new `IPaymentGateway` implementation, and it works with every existing operation.
> - A new operation built from existing primitives is one new `PaymentOperation` subclass, and it works with every provider.
>
> Without the bridge, methods such as `ProcessStripeChargeAsync` and `ProcessPayPalRefundAsync` cover every provider-and-operation pair, and their number grows as providers × operations. If only the provider side varied, one interface with several implementations would be ordinary polymorphism. The second, abstraction-side hierarchy is what makes the design a Bridge.
>
> **Limit:** Bridge prevents the cross-product, not change to the shared contract. An operation that needs a genuinely new primitive changes `IPaymentGateway` and every provider implementation.
>
> [[Software Architecture/Patterns/Design Patterns/Structural/Bridge#Problem|Bridge: Problem]] · [[Software Architecture/Patterns/Design Patterns/Structural/Bridge#Solution|Bridge: Solution]]

<!-- qard-id: 18451d39-42a6-43e9-bf28-df49b2470a9b -->

> [!qard]- How does Bridge differ from dependency injection?
> Dependency injection and Bridge answer different questions. DI is an inversion-of-control technique: a class receives its dependencies from outside instead of creating them itself. Bridge is a class structure: an abstraction hierarchy and an implementation hierarchy are separated so that each can vary independently.
>
> - **What each decides:** DI decides how an object obtains a collaborator. Bridge decides how a design is split into two hierarchies and where they connect.
> - **What each requires:** DI applies to any dependency, even a single one. Bridge requires two dimensions that vary independently, such as payment operations and payment providers.
> - **How they combine:** DI can supply the bridge, for example by injecting an `IPaymentGateway` into a `PaymentOperation`. A Bridge can also be wired by hand, as in `new SingleChargePayment(stripeGateway)`.
>
> When DI selects one implementation behind one interface, such as one `IDistributedCache` provider, the result is ordinary polymorphism. It becomes Bridge-like only when a separate, independently changing abstraction composes with that implementation contract.
>
> [Dependency injection in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/overview) · [[Software Architecture/Patterns/Design Patterns/Structural/Bridge#Solution|Bridge: Solution]] · [[Software Architecture/Patterns/Design Patterns/Structural/Bridge#Related .NET Abstractions|Bridge: Related .NET Abstractions]]

# References

- [Bridge pattern](https://refactoring.guru/design-patterns/bridge)
- [Bridge Pattern — Christopher Okhravi](https://www.youtube.com/watch?v=F1YQ7YRjttI\&list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc\&index=11)
- [IDistributedCache — distributed cache abstraction](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.distributed.idistributedcache)
