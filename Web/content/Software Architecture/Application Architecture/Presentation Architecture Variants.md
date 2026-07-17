---
publish: true
created: 2026-07-16T16:55:26.602Z
modified: 2026-07-16T16:55:26.602Z
published: 2026-07-16T16:55:26.602Z
topic:
  - Software Architecture
subtopic:
  - Application Architecture
summary: How MVP, MVU, coordinators, and VIPER divide presentation state, rendering, interaction, and navigation.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

Presentation patterns differ mainly in who owns screen state, who converts user input into actions, and who controls navigation. [[MVC MVVM]] covers the two common baselines. MVP, MVU, MVVM-C, and VIPER are useful when a UI framework or navigation graph needs a more explicit seam. Pick the smallest pattern that keeps domain behavior outside the UI framework.

## Responsibility map

| Pattern | State and decisions | View update | Navigation | Good fit |
| --- | --- | --- | --- | --- |
| MVP | Presenter | Presenter calls a passive view interface | Presenter or injected navigator | WinForms or UI toolkits without strong binding |
| MVU | Immutable model plus `update(message, model)` | Render function derives the next view | Message interpreted by update/runtime | Elm, Redux-style front ends, and unidirectional component UIs |
| MVVM-C | View-model owns presentation state; coordinator owns flow | Binding | Coordinator | Stateful client apps with non-trivial navigation |
| VIPER | Presenter maps display state; interactor owns use cases | Presenter calls a view interface | Router | Large client modules where separate navigation and use-case seams pay for themselves |

Blazor supports binding, but its component state, event callbacks, and render cycle are closer to a component model with unidirectional-flow options than to classic WPF MVVM. A Blazor component can use a view-model, but the framework does not require MVVM.

## Concrete example: checkout navigation

In MVVM-C, `CheckoutViewModel` exposes `SubmitCommand` and observable validation state. It reports `CheckoutCompleted(orderId)` to `CheckoutCoordinator`, which decides whether to open confirmation, authentication, or payment-recovery screens. The view-model stays testable without knowing routes or constructing views.

In MVU, the same flow is explicit data transformation:

```text
update(Submit, Editing) -> Submitting
update(PaymentDeclined, Submitting) -> Declined(reason)
update(PaymentCaptured(orderId), Submitting) -> Completed(orderId)
```

The render function maps each state to UI. This makes transitions easy to inspect, but copying immutable state and routing every interaction through messages can be too much ceremony for a small form.

## Decision rule

Use MVP when a passive view interface is the natural test seam. Use MVU when deterministic state transitions and one-way flow matter more than binding convenience. Add a coordinator when navigation has its own branching logic. Use VIPER only when a large client module benefits from independently testable view, presentation, use-case, and routing boundaries; a three-screen form rarely does.

## References

- [The Model-View-Update pattern](https://guide.elm-lang.org/architecture/) — Elm's primary guide to immutable model, messages, update, and view functions.
- [Model-View-Presenter](https://martinfowler.com/eaaDev/ModelViewPresenter.html) — Martin Fowler's definition of presenter-mediated interaction with a view.
- [Blazor components](https://learn.microsoft.com/aspnet/core/blazor/components/) — official component, state, event, and rendering model for Blazor.
- [Redux fundamentals](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow) — official explanation of actions, reducers, immutable state, and one-way data flow.
