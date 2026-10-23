---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Defines a grammar for a language and an interpreter that evaluates sentences, composing complex expressions from simpler ones."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Behavioral/Interpreter"
flashcard_uid: "ea266703"
---

A calculator interprets `2 + 3 * 4` by parsing the expression into a tree and walking that tree according to precedence rules. Each node represents a grammar construct. LINQ providers use the same broad mechanism: a lambda supplied as an expression tree becomes data that a provider can inspect and translate.

The Interpreter pattern gives a small language an executable representation. Grammar rules become expression types, and an interpreter evaluates those expressions against a context. Composite expressions build larger rules from smaller nodes: `AndExpression` contains two children, while `ComparisonExpression` evaluates one condition. In .NET, expression trees and `IQueryable<T>` are the production form most engineers meet. A provider walks the tree and translates the nodes into its target query language.

```mermaid
flowchart TD
    Rule["order.total > 100 AND customer.tier == Gold"]
    Rule --> AndExpr["AndExpression"]
    AndExpr --> Left["ComparisonExpression: total > 100"]
    AndExpr --> Right["ComparisonExpression: tier == Gold"]
    Left --> LVal["ValueExpression: order.total"]
    Left --> LConst["ConstantExpression: 100"]
    Right --> RVal["ValueExpression: customer.tier"]
    Right --> RConst["ConstantExpression: Gold"]
```

# Problem

`DiscountService` hardcodes every promotion rule. Even a new combination of existing conditions requires code and deployment:

```csharp
public class DiscountService
{
    // ⚠️ Every new promotion rule requires a code change and deployment
    public decimal CalculateDiscount(Order order)
    {
        decimal discount = 0m;

        // ⚠️ "10% off orders over $100" — hardcoded
        if (order.Total > 100m)
            discount += order.Total * 0.10m;

        // ⚠️ "Free shipping for Gold members" — hardcoded
        if (order.Customer.Tier == CustomerTier.Gold)
            discount += order.ShippingCost;

        // ⚠️ "Buy 2 get 1 free on Electronics" — hardcoded
        var electronicsItems = order.Items.Where(i => i.Product.Category == "Electronics").ToList();
        if (electronicsItems.Count >= 3)
        {
            var cheapest = electronicsItems.MinBy(i => i.UnitPrice);
            if (cheapest is not null) discount += cheapest.UnitPrice;
        }

        // ⚠️ Marketing wants "20% off for Silver members on orders over $200 placed on weekends"
        // That's a new deployment just to add a rule
        return discount;
    }
}
```

Marketing cannot configure a promotion because the rules exist only as branches in compiled code.

# Solution

A small discount language moves conditions into expression objects evaluated at runtime:

```csharp
// Evaluation context — the data available to expressions
public class DiscountContext
{
    public Order Order { get; init; } = null!;
    public Customer Customer { get; init; } = null!;
}

// Expression interface
public interface IDiscountExpression
{
    bool Evaluate(DiscountContext context);
}

// Terminal expressions — leaf nodes
public class OrderTotalGreaterThan(decimal threshold) : IDiscountExpression
{
    public bool Evaluate(DiscountContext ctx) => ctx.Order.Total > threshold;
}

public class CustomerTierEquals(CustomerTier tier) : IDiscountExpression
{
    public bool Evaluate(DiscountContext ctx) => ctx.Customer.Tier == tier;
}

public class OrderDayOfWeek(DayOfWeek day) : IDiscountExpression
{
    public bool Evaluate(DiscountContext ctx) => ctx.Order.CreatedAt.DayOfWeek == day;
}

// Non-terminal expressions — composite nodes
public class AndExpression(IDiscountExpression left, IDiscountExpression right) : IDiscountExpression
{
    public bool Evaluate(DiscountContext ctx) =>
        left.Evaluate(ctx) && right.Evaluate(ctx); // ✅ recursive evaluation
}

public class OrExpression(IDiscountExpression left, IDiscountExpression right) : IDiscountExpression
{
    public bool Evaluate(DiscountContext ctx) =>
        left.Evaluate(ctx) || right.Evaluate(ctx);
}

public class NotExpression(IDiscountExpression operand) : IDiscountExpression
{
    public bool Evaluate(DiscountContext ctx) => !operand.Evaluate(ctx);
}

// Discount rule — pairs a condition expression with a discount action
public class DiscountRule
{
    public string Name { get; init; } = "";
    public IDiscountExpression Condition { get; init; } = null!;
    public Func<DiscountContext, decimal> CalculateDiscount { get; init; } = null!;
}

// Rule engine — evaluates rules against a context
public class DiscountRuleEngine(IEnumerable<DiscountRule> rules)
{
    public decimal CalculateTotalDiscount(Order order, Customer customer)
    {
        var context = new DiscountContext { Order = order, Customer = customer };
        return rules
            .Where(r => r.Condition.Evaluate(context)) // ✅ interpret each rule
            .Sum(r => r.CalculateDiscount(context));
    }
}

// Developers compose the rule set in startup code
var rules = new[]
{
    new DiscountRule
    {
        Name = "10% off orders over $100",
        Condition = new OrderTotalGreaterThan(100m),
        CalculateDiscount = ctx => ctx.Order.Total * 0.10m
    },
    new DiscountRule
    {
        Name = "20% off for Silver members on weekend orders over $200",
        // ✅ Compose existing expression types into a new rule
        Condition = new AndExpression(
            new AndExpression(
                new CustomerTierEquals(CustomerTier.Silver),
                new OrderTotalGreaterThan(200m)),
            new OrExpression(
                new OrderDayOfWeek(DayOfWeek.Saturday),
                new OrderDayOfWeek(DayOfWeek.Sunday))),
        CalculateDiscount = ctx => ctx.Order.Total * 0.20m
    }
};

// Deployment-free rules require a serializable AST or parser plus allowlisted actions
```

As written, developers compose these expression objects in startup code, so changing the rule set still requires deployment. Deployment-free rules need a serializable AST or parser plus an allowlist of available fields and discount actions. The example demonstrates interpretation and composition only.

# Expression Trees and Runtime Expression Engines

**LINQ Expression Trees with EF Core `IQueryable<T>`** provide a familiar .NET example. `dbContext.Orders.Where(o => o.Total > 100 && o.Customer.Tier == CustomerTier.Gold)` records the predicate as an expression tree. EF Core visits the supported nodes and emits SQL such as `WHERE Total > 100 AND CustomerTier = 2`. A custom method fails translation when the provider has no rule for that node.

**`Regex`** evaluates a regular-expression language against an input string. `Regex.IsMatch(input, pattern)` supplies the sentence and the evaluation context in one call.

**Roslyn scripting (`CSharpScript.EvaluateAsync`)** accepts C# text at runtime, compiles it, and executes it against supplied globals. Its language and attack surface are far broader than a purpose-built rule DSL.

**NCalc / DynamicExpresso** evaluate mathematical or C#-like expressions from strings. They remove parser work but still require a deliberate policy for which operations and values are exposed.

# Pitfalls

**Repeated tree walking.** Interpreting the same deep expression for every request adds per-call overhead. When profiling shows it matters, the tree can be compiled to a delegate and that delegate cached. Compilation moves cost to setup and uses more memory.

**Grammar growth.** A few boolean and comparison rules stay manageable. Once precedence, diagnostics, and richer syntax appear, the grammar needs a parser that produces an AST. A hand-written chain of string splits will collapse under edge cases.

**Untrusted expressions.** General-purpose scripting turns configuration into code execution. User-authored rules should use a restricted grammar with an allowlist of operations and fields. Input sanitization alone is not a security boundary.

# Tradeoffs

| Concern | Interpreter | Hardcoded rules | External rules engine (NCalc, Drools) |
|---|---|---|---|
| Adding a new rule | Developer composes existing expression types | Code change + deployment | Configure through the engine's supported format |
| Performance | Slower (tree traversal) | Fastest (compiled) | Depends on engine |
| Rule complexity | Limited by grammar | Unlimited | Depends on engine |
| Debugging | Hard (runtime evaluation) | Easy (debugger) | Engine-specific tooling |
| Dependencies | None | None | External library/service |

Interpreter fits a small language represented as data. Stable rules are clearer as ordinary code. Rules can change independently of application releases only when their AST and allowed actions can be stored and loaded safely. Otherwise developers still compose them in code.

# Questions

<!-- qard-id: 6cc8dca5-c8e6-48fc-b88a-d16195df8f1d -->
> [!qard]- How does EF Core use LINQ expression trees as an Interpreter?
> EF Core treats a query's lambda as a sentence in a small language. The lambda arrives as an expression tree, and EF Core walks its nodes and translates them into a query that its database provider can run, instead of running the lambda as compiled code. With a relational provider, that query is SQL.
> 
> 1. `Queryable.Where` accepts an `Expression<Func<T, bool>>`, so the compiler builds a tree that describes the predicate. `Enumerable.Where` accepts a `Func<T, bool>`, which can only be executed.
> 2. When the query runs, EF Core visits the supported nodes, such as member access, comparisons and `&&`, and the provider produces an equivalent query in its own language, which is SQL for a relational database.
> 3. Captured variables, such as `minTotal` in `o => o.Total > minTotal`, can become query parameters instead of literals, which are SQL parameters with a relational provider.
> 4. A node with no translation, such as a call to an ordinary C# method that the provider does not map, makes EF Core 3.0 and later throw when it appears in a filter or another server-evaluated part of the query. Only the top-level projection can be partly evaluated on the client.
> 
> The tree plays the role of the Interpreter pattern's abstract syntax tree. In the classic pattern each node evaluates itself; EF Core instead translates the tree into the provider's query language, such as SQL, which the database then executes.
> 
> [C# expression trees](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/expression-trees/) · [EF Core: client vs. server evaluation](https://learn.microsoft.com/en-us/ef/core/querying/client-eval) · [EF Core: how queries work](https://learn.microsoft.com/en-us/ef/core/querying/how-query-works)

<!-- qard-id: 11ee9711-6130-40ef-9fe2-d513d49ba91a -->
> [!qard]- How does the Interpreter pattern differ from the Strategy pattern when rules are chosen at runtime?
> Both let behavior vary at runtime, but they vary different things. Strategy chooses which already-written implementation runs. Interpreter represents the rule itself as data, such as an expression tree, and an evaluator walks that data to produce the result. Choosing an implementation at runtime is therefore not enough to make a design an Interpreter.
> 
> | Aspect | Strategy | Interpreter |
> |---|---|---|
> | What varies | The implementation selected, such as a flat-rate or a weight-based shipping calculator. | The rule's structure, built from expression nodes such as `And(TierEquals(Silver), TotalGreaterThan(200))`. |
> | New behavior | Selecting or configuring an existing implementation needs no new code; behavior that none of them provides needs a new implementation. | Can often be composed from existing expression types without new classes, within what the grammar can express. |
> | Where the logic lives | In each strategy's code, which the caller simply invokes. | Split across node types that an evaluator applies to a context, such as an order and its customer. |
> | Main costs | Variation is limited to the implementations that exist, so uncovered behavior means new code to write, test and ship. Running a strategy is ordinary compiled code. | A grammar to design and maintain, slower tree evaluation and harder debugging. Rules from untrusted users also need a restricted grammar with allowlisted fields and operations. |
> 
> Composing rules from data avoids new code only when the rule representation can be stored and loaded safely. Rule objects built in startup code still change only with a deployment.
> 
> [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Interpreter#Solution|Interpreter: solution]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Interpreter#Pitfalls|Interpreter: pitfalls]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Interpreter#Tradeoffs|Interpreter: tradeoffs]]

# References

- [Interpreter — original pattern definition](https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612)
- [Expression trees](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/expression-trees/)
- [How EF Core translates LINQ to SQL — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/querying/how-query-works)
