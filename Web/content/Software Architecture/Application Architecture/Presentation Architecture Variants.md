---
publish: true
created: 2026-08-20T20:41:15.675Z
modified: 2026-08-20T20:41:15.676Z
published: 2026-08-20T20:41:15.676Z
topic:
  - Software Architecture
subtopic:
  - Application Architecture
summary: How MVC, MVVM, MVP, MVU, coordinators, and VIPER divide presentation state, rendering, interaction, and navigation.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

Presentation patterns separate a UI from the state and decisions behind it. Their real differences are ownership: who receives input, where screen state lives, what causes a render, and who chooses the next screen. The patterns fit different interaction models. They are not a maturity ladder, and the smallest boundary that keeps domain behavior out of the UI framework is usually enough.

![[Assets/Software Architecture/Software Architecture-Presentation Architecture Variants-18120000.png]]

# Who Owns State, Rendering, and Navigation

| Pattern | State and decisions | View update | Navigation | Good fit |
| --- | --- | --- | --- | --- |
| MVC | Controller handles a request and selects a response view. Domain state stays in the model | Controller passes data to the view | Routing and controller result | Server-rendered request/response applications |
| MVVM | View-model exposes observable presentation state and commands | Binding updates the view | View, service, or coordinator | Stateful desktop/mobile UI with strong binding infrastructure |
| MVP | Presenter coordinates a passive view interface | Presenter calls the view | Presenter or injected navigator | UI toolkits without strong binding |
| MVU | Immutable model plus `update(message, model)` | Render function derives the view | Message interpreted by update/runtime | Unidirectional component UIs and deterministic state transitions |
| MVVM-C | View-model owns screen state. Coordinator owns flow | Binding | Coordinator | Stateful clients with non-trivial navigation graphs |
| VIPER | Interactor owns use cases. Presenter maps display state | Presenter calls a view interface | Router | Large client modules where independent seams repay the ceremony |

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

The controller translates the request and result. Pricing rules belong in the domain, while retries and side effects sit behind application boundaries. Once a controller makes those decisions itself, HTTP has become the accidental business boundary.

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

Small control adapters can remain in code-behind. Presentation state belongs behind the binding boundary, and business decisions stay in application or domain services. View-model tests then run without constructing controls.

# MVC and MVVM Compared

| Dimension | MVC | MVVM |
| --- | --- | --- |
| Communication | The controller receives input, pulls or changes model data, and pushes a response model to a selected view | The view sends actions through commands and observes state exposed by the view-model |
| Binding | Usually explicit: the controller constructs data for each rendered response | Usually automatic: bindings react to property-change notifications and can write values back |
| Test seam | Controller actions can be tested without rendering the view, although HTTP result types and routing remain part of the boundary | View-model commands and state transitions can be tested as plain objects without constructing controls |
| Primary platform | Server-rendered request/response applications such as ASP.NET Core MVC | Long-lived desktop and mobile clients with binding infrastructure such as WPF and .NET MAUI |
| Boilerplate | Lower for stateless flows. Request mapping and response selection are explicit | Higher because observable properties, commands, validation, and binding diagnostics need infrastructure |

MVVM's binding convenience has a cost. Two-way bindings can hide control flow, and a missed notification leaves stale UI without a compile-time failure. MVC keeps the request path explicit. A controller still becomes a hard-to-test transaction script when it takes over business decisions or external calls. In either pattern, the useful seam surrounds presentation behavior. The label does not create that seam.

# When MVC and MVVM Are Not Enough

MVP suits UI toolkits where a passive view interface is the clearest test seam. MVU makes state transitions explicit and keeps updates one-way. Navigation can move into a coordinator once route selection becomes policy rather than a simple view action. VIPER goes farther by separating view, presentation, use-case, and routing roles. That amount of ceremony only pays back in a large client module.

For checkout, MVU makes the transition table explicit:

```text
update(Submit, Editing) -> Submitting
update(PaymentDeclined, Submitting) -> Declined(reason)
update(PaymentCaptured(orderId), Submitting) -> Completed(orderId)
```

MVVM-C keeps bound screen state in `CheckoutViewModel`. On completion, it reports `CheckoutCompleted(orderId)` to a coordinator, which selects confirmation, authentication, or recovery. The view-model stays testable without knowing route details.

Blazor supports binding, but its native unit is a component with state, event callbacks, and a render cycle. That model is closer to component architecture with optional one-way flow than classic WPF MVVM. A component may use a view-model. The framework does not require one.

# Choosing the Smallest Useful Boundary

MVC fits server-rendered request/response applications. MVVM fits a stateful client when the framework already provides binding, observable state, and commands. MVP is useful with a passive view, while MVU favors explicit state transitions. A coordinator earns its place when navigation has branching policy. A small form with legible state and flow does not need VIPER-sized separation.

Change patterns when a boundary fails, not when a file crosses a size threshold. In WPF or .NET MAUI, code-behind should move when it duplicates presentation state or coordinates asynchronous work. Business decisions move farther inward. Event wiring that only adapts a control can stay in the view. A growing ASP.NET Core controller usually needs application behavior extracted before it needs a new presentation pattern. Razor Pages or another UI shape becomes relevant when controller-and-view routing itself is the ceremony in a page-focused flow.

# Pitfalls

## Massive Controllers

A controller becomes difficult to test once it owns provider calls, retry policy, or notification side effects. Keep the HTTP path to transport validation, one application operation, result mapping, and response selection.

## Fat View-models

A view-model becomes a second controller when it owns data access or domain rules. Keep observable screen state and commands there. Application services provide business behavior, and a coordinator or navigation service owns any non-trivial flow.

# Questions

> [!QUESTION]- What is the key difference between MVC and MVVM?
> MVC uses a controller to handle a request and select a response view. MVVM exposes observable state and commands to a long-lived bound view. MVC keeps a stateless request path explicit. MVVM accepts binding and notification machinery in exchange for persistent screen state without direct view manipulation.

# References

- [MVVM in .NET MAUI](https://learn.microsoft.com/en-us/dotnet/maui/xaml/fundamentals/mvvm)
- [Model-View-Presenter](https://martinfowler.com/eaaDev/ModelViewPresenter.html)
- [The Elm Architecture](https://guide.elm-lang.org/architecture/)
- [Redux fundamentals](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow)
