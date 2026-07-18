---
topic:
  - Software Architecture
subtopic:
  - Application Architecture
summary: "How MVC, MVVM, MVP, MVU, coordinators, and VIPER divide presentation state, rendering, interaction, and navigation."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

Presentation patterns separate rendering from the state and decisions that drive it. They differ in who receives input, who owns presentation state, how the view is updated, and where navigation lives. Pick the smallest pattern that keeps domain behavior outside the UI framework; the patterns are alternatives for different interaction models, not a maturity ladder.

![[Software Architecture/Software Architecture-Presentation Architecture Variants-18120000.png]]

# Responsibility map

| Pattern | State and decisions | View update | Navigation | Good fit |
| --- | --- | --- | --- | --- |
| MVC | Controller handles a request and selects a response view; domain state stays in the model | Controller passes data to the view | Routing and controller result | Server-rendered request/response applications |
| MVVM | View-model exposes observable presentation state and commands | Binding updates the view | View, service, or coordinator | Stateful desktop/mobile UI with strong binding infrastructure |
| MVP | Presenter coordinates a passive view interface | Presenter calls the view | Presenter or injected navigator | UI toolkits without strong binding |
| MVU | Immutable model plus `update(message, model)` | Render function derives the view | Message interpreted by update/runtime | Unidirectional component UIs and deterministic state transitions |
| MVVM-C | View-model owns screen state; coordinator owns flow | Binding | Coordinator | Stateful clients with non-trivial navigation graphs |
| VIPER | Interactor owns use cases; presenter maps display state | Presenter calls a view interface | Router | Large client modules where independent seams repay the ceremony |

# MVC

MVC maps naturally to a server request: the controller accepts input, invokes application behavior, and selects a view. The model remains independent of HTTP and rendering.

```csharp
public sealed class ProductsController(IProductService service) : Controller
{
    public async Task<IActionResult> Details(int id)
    {
        var product = await service.GetByIdAsync(id);
        if (product is null)
        {
            return NotFound();
        }

        var model = new ProductDetailsVm(
            product.Id,
            product.Name,
            product.Price);

        return View(model);
    }
}
```

The controller translates the request and result. Pricing rules, retries, and side effects belong in application or domain services; putting them in the controller makes HTTP concerns the accidental business boundary.

# MVVM

MVVM fits a long-lived view whose controls bind to observable state and commands. The view-model exposes presentation behavior without referencing the view.

```csharp
public sealed class ProductDetailsViewModel : INotifyPropertyChanged
{
    private string _name = string.Empty;
    private string? _error;

    public ProductDetailsViewModel(IProductService service)
    {
        LoadCommand = new AsyncRelayCommand(async () =>
        {
            var product = await service.GetByIdAsync(42);
            if (product is null)
            {
                Name = string.Empty;
                Error = "Product not found.";
                return;
            }

            Error = null;
            Name = product.Name;
        });
    }

    public string? Error
    {
        get => _error;
        private set
        {
            _error = value;
            PropertyChanged?.Invoke(
                this,
                new PropertyChangedEventArgs(nameof(Error)));
        }
    }

    public string Name
    {
        get => _name;
        private set
        {
            _name = value;
            PropertyChanged?.Invoke(
                this,
                new PropertyChangedEventArgs(nameof(Name)));
        }
    }

    public ICommand LoadCommand { get; }

    public event PropertyChangedEventHandler? PropertyChanged;
}
```

Small view-only adapters can remain in code-behind. Presentation state and business decisions stay behind the binding boundary so they can be tested without constructing the UI.

# MVC and MVVM compared

| Dimension | MVC | MVVM |
| --- | --- | --- |
| Communication | The controller receives input, pulls or changes model data, and pushes a response model to a selected view | The view sends actions through commands and observes state exposed by the view-model |
| Binding | Usually explicit: the controller constructs data for each rendered response | Usually automatic: bindings react to property-change notifications and can write values back |
| Test seam | Controller actions can be tested without rendering the view, although HTTP result types and routing remain part of the boundary | View-model commands and state transitions can be tested as plain objects without constructing controls |
| Primary platform | Server-rendered request/response applications such as ASP.NET Core MVC | Long-lived desktop and mobile clients with binding infrastructure such as WPF and .NET MAUI |
| Boilerplate | Lower for stateless flows; request mapping and response selection are explicit | Higher because observable properties, commands, validation, and binding diagnostics need infrastructure |

The binding convenience in MVVM is not free. Two-way bindings can hide control flow, and notification mistakes leave the screen stale without a compile-time failure. MVC keeps the request path explicit, but a controller that performs business decisions, provider calls, and response composition becomes a hard-to-test transaction script. In both patterns, the useful seam is the boundary around presentation behavior, not the pattern name.

# Additional variants

Use MVP when a passive view interface is the natural test seam. Use MVU when explicit state transitions and one-way flow matter more than binding convenience. Add a coordinator when navigation has branching logic that should not live in a view-model. Use VIPER only when a large client module benefits from independently testable view, presentation, use-case, and routing boundaries.

For checkout, MVU makes the transition table explicit:

```text
update(Submit, Editing) -> Submitting
update(PaymentDeclined, Submitting) -> Declined(reason)
update(PaymentCaptured(orderId), Submitting) -> Completed(orderId)
```

MVVM-C keeps the bound screen state in `CheckoutViewModel` but reports `CheckoutCompleted(orderId)` to a coordinator, which chooses confirmation, authentication, or recovery. The view-model remains testable without knowing routes.

Blazor supports binding, but its component state, event callbacks, and render cycle are closer to a component model with unidirectional-flow options than to classic WPF MVVM. A component can use a view-model without making MVVM the framework's required architecture.

# Decision rule

Use MVC for server-rendered request/response applications. Use MVVM for stateful clients whose binding infrastructure already supplies observable state and commands. Use MVP for a passive-view seam, MVU for deterministic state transitions, and a coordinator for navigation with its own branching policy. Do not add VIPER-sized separation to a small form whose state and navigation are already legible.

Switch because a boundary has failed, not because a file crossed a size threshold. In WPF or .NET MAUI, move code-behind behavior into a view-model when it starts duplicating presentation state, coordinating asynchronous operations, or making business decisions; event wiring that only adapts a control can stay in the view. In ASP.NET Core MVC, a growing controller usually does not require a new presentation pattern: move application behavior and domain rules into services first. Consider Razor Pages or a different UI shape when controller-and-view routing itself adds ceremony to page-focused interactions.

# Pitfalls

## Massive controllers

A controller becomes difficult to test when it accumulates provider calls, retry policy, and notification side effects. Keep it to input validation, one application operation, result mapping, and response selection.

## Fat view-models

A view-model becomes a second controller when it owns data access, domain rules, and navigation. Keep observable state and commands there; inject application services for business behavior and a coordinator or navigation service for flow.

# Questions

> [!QUESTION]- What is the key difference between MVC and MVVM?
> MVC uses a controller to handle a request and select a view. MVVM exposes observable state and commands that a long-lived view binds to. MVVM pays for binding infrastructure; MVC fits stateless request/response rendering with less ceremony.

> [!QUESTION]- When does a coordinator earn its place?
> Add one when navigation has branching policy that must be tested independently of screen state, such as checkout flows that can continue to confirmation, authentication, or payment recovery.

# References

- [ASP.NET Core MVC overview](https://learn.microsoft.com/en-us/aspnet/core/mvc/overview) — official controller, view, and model responsibilities in ASP.NET Core MVC.
- [Data binding in WPF](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/data/) — official binding, notification, and command infrastructure used by MVVM.
- [MVVM in .NET MAUI](https://learn.microsoft.com/en-us/dotnet/maui/xaml/fundamentals/mvvm) — official MVVM application in .NET MAUI.
- [Presentation Model](https://martinfowler.com/eaaDev/PresentationModel.html) — Fowler's UI-independent presentation state and behavior model.
- [Model-View-Presenter](https://martinfowler.com/eaaDev/ModelViewPresenter.html) — Fowler's presenter-mediated interaction with a passive view.
- [The Model-View-Update pattern](https://guide.elm-lang.org/architecture/) — Elm's primary guide to model, messages, update, and view functions.
- [Redux fundamentals](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow) — official one-way data-flow and reducer model.
- [Blazor components](https://learn.microsoft.com/aspnet/core/blazor/components/) — official component state, event, and rendering model.
- [Model-View-Controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) — pattern history and major variants.
- [Model-View-ViewModel](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel) — MVVM origin, binding mechanics, and comparison with MVC.
- [MVC, MVP, MVVM, and VIPER patterns](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/mvc-mvp-mvvm-viper-patterns.md) — provenance for the responsibility visual, treated as a comparison rather than a progression.
