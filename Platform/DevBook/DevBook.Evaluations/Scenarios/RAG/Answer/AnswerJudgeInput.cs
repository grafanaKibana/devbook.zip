namespace DevBook.Evaluations.Scenarios.RAG.Answer;

/// <summary>The unit the answer judge scores: a golden case plus the answer the agent produced for it.</summary>
/// <param name="Case">The case, carrying the question and the gold evidence the answer was given.</param>
/// <param name="Answer">The answer the agent generated from that evidence.</param>
public sealed record AnswerJudgeInput(RagGoldenCase Case, string Answer);