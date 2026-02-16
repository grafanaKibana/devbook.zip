---
topic:
  - "Architecture"
subtopic:
  - "Application Architecture"
level:
  - "4"
priority: Medium
status: Ready To Repeat

dg-publish: true
---

# Intro

Model-View-Controller (MVC) is a UI/application architecture pattern that splits responsibilities into:

- Model: domain/data and business rules
- View: presentation (rendered UI)
- Controller: request handling and orchestration between model and view

The goal is testable, maintainable code by keeping UI concerns separate from domain logic.

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

## Links

- [Overview of ASP.NET Core MVC](https://learn.microsoft.com/en-us/aspnet/core/mvc/overview)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Application Architecture/Layered Architecture|Layered Architecture]]
> - [[Software Engineering/05 Architecture/Application Architecture/MVC MVVM|MVC MVVM]]
> - [[Software Engineering/05 Architecture/Application Architecture/Plug-in Architecture (MicroKernel)|Plug-in Architecture (MicroKernel)]]
<!-- whats-next:end -->
