---
topic:
  - "Architecture"
subtopic:
  - "Application Architecture"
level:
  - "4"
priority: High
status: Ready To Repeat

dg-publish: true
---

# Intro

MVC and MVVM are UI/application architecture patterns that split responsibilities to improve maintainability, testability, and separation of concerns.

- **MVC** (Model-View-Controller): the Model holds domain/data and business rules, the View renders the UI, and the Controller handles incoming requests, coordinates work, and selects the response/view.
- **MVVM** (Model-View-ViewModel): the Model holds domain data, the View is the UI binding target, and the ViewModel exposes observable state and commands that the View binds to — eliminating direct view manipulation.

## Example

In ASP.NET Core MVC, an HTTP request is routed to a controller action, which returns a view with a view-model.

```csharp
public sealed class ProductsController : Controller
{
    public IActionResult Details(int id)
    {
        var vm = new ProductDetailsVm(id, name: "Keyboard", price: 49.99m);
        return View(vm);
    }
}
```
## Questions

> [!QUESTION]- What is MVC and why is it used?
> MVC stands for Model-View-Controller. The Model represents the domain/data and business rules, the View is the UI (rendering), and the Controller handles incoming input/requests, coordinates work, and selects the response/view. The separation helps keep UI concerns out of business logic and makes the system easier to test and evolve.

## Links

- [Wikipedia - Model-view-controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)
- [Microsoft Learn - Overview of ASP.NET Core MVC](https://learn.microsoft.com/en-us/aspnet/core/mvc/overview)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Application Architecture/Layered Architecture|Layered Architecture]]
> - [[Software Engineering/05 Architecture/Application Architecture/MVC|MVC]]
> - [[Software Engineering/05 Architecture/Application Architecture/Plug-in Architecture (MicroKernel)|Plug-in Architecture (MicroKernel)]]
<!-- whats-next:end -->
