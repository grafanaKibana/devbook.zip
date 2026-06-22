namespace DevBook.Evaluations.Common.Evaluation;

using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Standard rating curves mapping a raw value onto an <see cref="EvaluationRating"/>. Centralises the
/// thresholds that judges previously each re-declared. Scenarios with a bespoke curve (e.g. AskAgent's
/// demo severity scale) keep their own; everyone else uses these.
/// </summary>
public static class Ratings
{
    /// <summary>Rates a 0–1 fraction (higher is better).</summary>
    public static EvaluationRating ForFraction(double value) => value switch
    {
        >= 0.9 => EvaluationRating.Exceptional,
        >= 0.75 => EvaluationRating.Good,
        >= 0.5 => EvaluationRating.Average,
        >= 0.3 => EvaluationRating.Poor,
        _ => EvaluationRating.Unacceptable,
    };

    /// <summary>Rates a 1–5 quality score (higher is better).</summary>
    public static EvaluationRating ForScore(double value) => value switch
    {
        >= 4.5 => EvaluationRating.Exceptional,
        >= 3.5 => EvaluationRating.Good,
        >= 2.5 => EvaluationRating.Average,
        >= 1.5 => EvaluationRating.Poor,
        _ => EvaluationRating.Unacceptable,
    };

    /// <summary>True when a rating is below the pass threshold and should gate the scenario.</summary>
    public static bool IsFailing(EvaluationRating rating)
        => rating is EvaluationRating.Poor or EvaluationRating.Unacceptable;
}