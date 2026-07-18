---
topic:
  - Programming
subtopic: []
summary: "Separating locale-sensitive presentation from language, time, money, addresses, and jurisdictional business rules."
level:
  - "3"
priority: High
status: Creation
publish: true
---

# Intro

Internationalization makes one system capable of serving different languages, scripts, regions, time zones, currencies, address conventions, and legal regimes without forking the core application. Localization supplies the resources and configuration for a particular market. The design boundary matters: a locale can choose how to display `1234.50 CAD`, but it must not decide which currency was charged or which tax rule applies.

## Separate the Axes

| Concern | Store or transmit | Presentation or policy decision |
| --- | --- | --- |
| Language and script | BCP 47 language tag such as `sr-Latn` | Resource lookup, line breaking, font, and fallback |
| Messages and plurals | Stable message key plus typed arguments | Locale-specific complete message and plural category |
| Text direction | Script and resolved locale | RTL layout, mirroring, cursor order, and icon review |
| Time | Instant; time-zone identifier when local intent matters | Calendar, offset, zone name, and daylight-saving transition |
| Numbers | Numeric value | Digits, grouping, decimal separator, and percent pattern |
| Money | Decimal amount plus ISO currency code | Currency symbol and display pattern; settlement remains a business operation |
| Address | Country code plus country-appropriate fields | Field order, labels, validation, and postal formatting |
| Business rules | Explicit jurisdiction and effective date | Tax, accounting, entity, compliance, and product eligibility policy |

Do not build messages by concatenating translated fragments. Translators need the complete sentence because word order, agreement, and plural forms vary. English has `one` and `other`; other languages select more categories, and the category is not a direct synonym for the number.

![[System Design 101/7d47f45928b641724dbc4adf2513cdaa5aaa92df5a51cc65803eb2fa5087b943.jpg]]

The diagram usefully separates localized frontends from core and market-specific services, but “UTC time” is not a sufficient data model. Store an instant for when something happened. Also store an IANA time-zone identifier when the user means a recurring local time such as “09:00 Europe/Kyiv,” because future offsets can change. Keep translation, formatting, foreign exchange, settlement, accounting, and legal-entity rules as different responsibilities.

## .NET Boundary

```csharp
static string FormatMoney(
    Money money,
    CultureInfo displayCulture,
    int minorUnitDigits)
{
    string numericFormat = $"N{minorUnitDigits}";
    return $"{money.Amount.ToString(numericFormat, displayCulture)} {money.Currency}";
}

CultureInfo displayCulture = CultureInfo.GetCultureInfo("fr-CA");
Money charged = new(1234.50m, "CAD");
DateTimeOffset paidAt = DateTimeOffset.FromUnixTimeSeconds(1_735_732_800);
TimeZoneInfo customerZone = TimeZoneInfo.FindSystemTimeZoneById("America/Toronto");

string displayedAmount = FormatMoney(charged, displayCulture, minorUnitDigits: 2);
DateTimeOffset localPaidAt = TimeZoneInfo.ConvertTime(paidAt, customerZone);

public sealed record Money(decimal Amount, string Currency);
```

`displayedAmount` is UI text such as `1 234,50 CAD`: the culture selects separators and grouping, while `Money.Currency` supplies the currency that was actually charged. The example passes two minor-unit digits because CAD uses two; production code should obtain that value from maintained ISO 4217 currency metadata keyed by `Money.Currency`, not from the display culture. The standard `"C"` format alone uses the culture's default currency symbol and decimal digits, so it cannot faithfully render an arbitrary ISO currency code. Parsing the formatted string back into settlement data would couple correctness to a locale. `DateTimeOffset` preserves an instant and offset, while the separate zone supplies daylight-saving rules for conversion. For localized messages, .NET resource lookup follows culture fallback (`fr-CA` → `fr` → neutral resource), but the application still needs a message-formatting strategy that implements the relevant CLDR plural rules.

Test with structurally different cases, not only translated English: Arabic RTL layout, Serbian script variants, a daylight-saving gap and overlap, currencies with different minor units, long German labels, and an address that lacks the fields your home-country form assumes.

## References

- [Unicode Locale Data Markup Language (UTS #35)](https://www.unicode.org/reports/tr35/) — primary locale identifiers, plural categories, number/currency patterns, dates, and time-zone formatting data.
- [Localization in .NET (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/extensions/localization) — resource separation, culture fallback, and `.resx` naming behavior.
- [.NET globalization and ICU (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/extensions/globalization-icu) — the culture-data engine behind modern .NET formatting, comparison, and normalization.
- [Designing a system for internationalization (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-design-a-system-for-internationalization.md) — provenance for the architecture map; the note separates its combined presentation and business concerns.
