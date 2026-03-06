---
topic:
  - Architecture
subtopic:
  - Application Architecture
level:
  - "4"
priority: High
status: Creation
dg-publish: true
---
# Intro

MVC and MVVM are UI architecture patterns that separate data, presentation, and interaction logic to improve testability and maintainability. Both solve the same problem — keeping UI code from tangling with business logic — but they differ in how the View and the logic layer communicate. MVC uses a Controller that handles requests and selects views; MVVM uses a ViewModel that exposes observable state the View binds to directly. In a 120-controller ASP.NET Core API, enforcing thin MVC controllers (under 20 lines per action) that delegate to domain services reduced the average time to add a new endpoint from 2 hours to 30 minutes because developers no longer had to untangle business logic embedded in controller actions.

## MVC — Model-View-Controller

**Roles:**
- **Model** — domain data and business rules. Independent of UI.
- **View** — renders the UI from the model/view-model data.
- **Controller** — handles incoming requests, invokes application logic, selects the response view.

**Flow:** Request → Controller → Model (read/write) → Controller selects View → View renders with data.

**In ASP.NET Core MVC:**

```csharp
public sealed class ProductsController : Controller
{
    private readonly IProductService _service;

    public ProductsController(IProductService service) => _service = service;

    public async Task<IActionResult> Details(int id)
    {
        var product = await _service.GetByIdAsync(id);
        if (product is null) return NotFound();

        var vm = new ProductDetailsVm(product.Id, product.Name, product.Price);
        return View(vm); // Controller selects the view
    }
}
```

The Controller is the entry point. It is thin — it delegates to services and passes data to the view. Business logic lives in the service/domain layer, not the controller.

## MVVM — Model-View-ViewModel

**Roles:**
- **Model** — domain data and business rules. Same as MVC.
- **View** — UI that binds to ViewModel properties and commands. No code-behind logic.
- **ViewModel** — exposes observable state (`INotifyPropertyChanged`) and commands (`ICommand`). The View binds to it; the ViewModel does not reference the View.

**Flow:** User action → View binding → ViewModel command → Model update → ViewModel notifies View via binding.

**In WPF (.NET):**

```csharp
public class ProductDetailsViewModel : INotifyPropertyChanged
{
    private string _name = string.Empty;
    public string Name
    {
        get => _name;
        set { _name = value; OnPropertyChanged(); }
    }

    public ICommand LoadCommand { get; }

    public ProductDetailsViewModel(IProductService service)
    {
        LoadCommand = new AsyncRelayCommand(async () =>
        {
            var product = await service.GetByIdAsync(42);
            Name = product.Name; // binding updates the View automatically
        });
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    private void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

The View (XAML) binds to `Name` and `LoadCommand` — no code-behind. The ViewModel is fully testable without a UI.

## Comparison

| Aspect | MVC | MVVM |
|--------|-----|------|
| Communication | Controller pulls data, pushes to View | View binds to ViewModel; ViewModel notifies View |
| View coupling | Controller selects View (loose) | View binds directly to ViewModel (tight binding) |
| Testability | Controller testable; View requires integration test | ViewModel fully unit-testable without UI |
| Data binding | Manual (controller passes model to view) | Automatic (two-way binding via `INotifyPropertyChanged`) |
| Primary platform | Server-side web (ASP.NET Core MVC) | Desktop/mobile UI (WPF, MAUI, Blazor) |
| Boilerplate | Low | Higher (binding infrastructure, `ICommand`) |

## Decision Rule

**Use MVC** for server-rendered web applications (ASP.NET Core MVC, Razor Pages). The request/response model maps naturally to Controller → View. No persistent UI state between requests.

**Use MVVM** for stateful UI applications (WPF, MAUI, Blazor) where the UI reacts to state changes in real time. Two-way data binding eliminates manual UI update code and makes ViewModels independently testable.

**When to switch:** if you find yourself writing significant code-behind in a WPF/MAUI app to update UI elements manually, switch to MVVM. If your ASP.NET Core controllers are growing large with UI logic, consider Razor Pages (a simplified MVC variant) or move logic to services.

## Pitfalls

### Massive Controllers (MVC)

**What goes wrong**: the Controller accumulates business logic — validation, orchestration, data transformation — instead of delegating to services. A 500-line controller is a sign that the Controller is doing the Model's job. In one production codebase, a `PaymentsController` grew to 1,200 lines with inline Stripe API calls, retry logic, and email sending — a bug in the retry logic caused double charges for 340 customers over a weekend, and it took 3 developers 2 days to trace the issue because the payment flow was spread across 8 controller actions instead of a single `PaymentService`.

**Why it happens**: it is the path of least resistance. The controller already has access to the request, the response, and the DI container.

**Mitigation**: keep controllers thin. A controller action should: validate input, call one service method, map the result to a view model, and return a response. All business logic belongs in the service or domain layer.

### Fat ViewModels (MVVM)

**What goes wrong**: the ViewModel accumulates business logic, data access, and navigation logic. It becomes a second controller.

**Why it happens**: the ViewModel is the natural place to put 'everything the View needs,' and that scope creeps.

**Mitigation**: ViewModels should expose observable state and commands. Business logic belongs in services injected into the ViewModel. Navigation belongs in a navigation service, not the ViewModel itself.


## Questions

> [!QUESTION]- What is the key difference between MVC and MVVM?
> In MVC, the Controller handles requests and explicitly selects which View to render — the View is passive. In MVVM, the View binds to the ViewModel's observable state — the ViewModel does not know about the View. MVVM enables automatic UI updates via data binding; MVC requires the Controller to pass data to the View on each request.
> Cost: MVVM requires binding infrastructure (`INotifyPropertyChanged`, `ICommand`) which adds boilerplate; MVC is simpler for stateless request/response flows.

> [!QUESTION]- Why is the ViewModel more testable than the Controller?
> The ViewModel has no dependency on HTTP context, routing, or view rendering — it is a plain C# class. You can unit-test it by calling commands and asserting property values. The Controller depends on `HttpContext`, `IActionResult`, and the MVC pipeline, requiring more setup or integration tests.

## References

- [Model-View-Controller (Wikipedia)](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) — pattern history, variants, and comparison with MVP and MVVM.
- [ASP.NET Core MVC overview (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/mvc/overview) — official guide to MVC in ASP.NET Core with controller, view, and model responsibilities.
- [Model-View-ViewModel (Wikipedia)](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel) — MVVM pattern origin (Microsoft WPF), data binding mechanics, and comparison with MVC.
- [Data binding in WPF (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/data/) — how `INotifyPropertyChanged` and `ICommand` power MVVM in WPF.
- [MVVM in .NET MAUI (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/maui/xaml/fundamentals/mvvm) — MVVM pattern applied to cross-platform .NET MAUI apps.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Application Architecture/Clean Architecture|Clean Architecture]]
> - [[Software Engineering/05 Architecture/Application Architecture/Layered Architecture|Layered Architecture]]
> - [[Software Engineering/05 Architecture/Application Architecture/Plug-in Architecture (MicroKernel)|Plug-in Architecture (MicroKernel)]]
<!-- whats-next:end -->
