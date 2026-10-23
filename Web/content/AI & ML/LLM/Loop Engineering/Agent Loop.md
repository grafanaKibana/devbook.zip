---
publish: true
created: 2026-10-21T13:29:32.428Z
modified: 2026-10-21T13:29:32.428Z
published: 2026-10-21T13:29:32.428Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: The execution cycle, ReAct's think-act-observe, that turns an LLM into an autonomous tool-using problem solver.
level:
  - "3"
priority: Medium
status: Done
qard-deck: AI & ML
qard-topic: LLM/Loop Engineering/Agent Loop
flashcard_uid: d747e381
---

An agent loop gives an LLM another move after each result. Within one run, the harness builds the context, asks the model what to do next, performs the chosen action, appends the result, and repeats until a termination check ends the run. That repeated decision is what separates a tool-using agent from a single model call.

The model and harness own different parts of the cycle. The model chooses the next response or tool call. The harness prepares context, validates and executes tools, enforces operational limits, and persists selected state. A failure in tool execution, permissions, termination, or state handling therefore belongs to harness engineering rather than model reasoning.

ReAct (Reasoning + Acting), introduced by Yao et al., is the familiar form of this loop. Frameworks package it differently, but the runtime still alternates model decisions with external actions and observations.

The loop works in four steps:

1. **Think.** The model receives the conversation history, including earlier tool results, and decides what is missing.
2. **Act.** It emits a structured tool call: a function name and arguments chosen from the available [[Tool Design|tools]].
3. **Observe.** The runtime executes the tool and appends its result as a tool message.
4. **Repeat or stop.** The updated history returns to the model. Another tool call continues the loop. A final response ends it.

```mermaid
stateDiagram-v2
    [*] --> Think: User message arrives
    Think --> Act: Model emits tool call
    Think --> Done: Model returns text
    Act --> Observe: Runtime executes tool
    Observe --> Think: Result appended to history
    Done --> [*]
```

ReAct joins two capabilities that are weak in isolation. Reasoning can choose the next useful action, while tool results give that reasoning evidence outside the model's parameters. In the paper's ALFWorld evaluation, ReAct improved the absolute success rate by 34 percentage points over the cited imitation- and reinforcement-learning baselines.

The fixed [[AI & ML/LLM/Agents/Agents|workflow patterns]] are still the better fit when every step is known in advance. The loop earns its cost when the next step depends on what the previous action discovered.

# How It Works in Practice

The loop follows the chat API contract closely.

**Think.** The runtime sends the conversation history and the JSON schemas for available tools. The model returns either text or one or more tool calls.

**Act.** For each tool call, the runtime extracts the function name and arguments. The model has requested data or a side effect. It has not performed the action itself.

**Observe.** The runtime validates and invokes the function, serializes the result, and appends it as a `tool` message. The model only sees that serialized result.

**Repeat.** A response with more tool calls starts another iteration. Plain text with no tool calls normally ends the current turn, but it does not prove that the user's goal is satisfied. Long-running tasks need a separate completion predicate, such as passing tests or a schema-valid artifact.

In Microsoft Agent Framework for .NET, `AIAgent.RunAsync` drives this cycle:

```csharp
// A tool the agent can call — any method, described for the model
[Description("Get the weather forecast for a city.")]
static string GetWeather([Description("City name, e.g. 'Seattle'")] string city)
    => $"{city}: light rain, 12°C, 80% chance of showers today.";

// Build a chat client over Azure OpenAI, then wrap it in an agent
IChatClient chatClient = new AzureOpenAIClient(new Uri(endpoint), new ApiKeyCredential(apiKey))
    .GetChatClient(deploymentName)
    .AsIChatClient();

AIAgent agent = new ChatClientAgent(chatClient, new ChatClientAgentOptions
{
    Name = "WeatherAssistant",
    ChatOptions = new ChatOptions
    {
        Instructions = "You help users plan around the weather.",
        Tools = [AIFunctionFactory.Create(GetWeather)],
    },
});

// This single call runs the full Think-Act-Observe-Repeat loop internally
var response = await agent.RunAsync("Should I bring an umbrella to Seattle today?");
```

Behind `RunAsync`, `FunctionInvokingChatClient` exposes each `AIFunction` as a tool schema, invokes requested functions, appends their results, and keeps going until the model answers or the iteration limit is reached.

The equivalent raw loop without framework abstraction:

```python
messages = [{"role": "user", "content": "Should I bring an umbrella to Seattle today?"}]
max_iterations = 12

for _ in range(max_iterations):
    response = client.chat.completions.create(
        model="gpt-4.1", messages=messages, tools=tools
    )
    choice = response.choices[0]

    if choice.finish_reason == "stop":
        print(choice.message.content)  # Final answer — loop ends
        break

    tool_calls = choice.message.tool_calls or []
    if not tool_calls:
        raise RuntimeError(f"Agent stopped without an answer or tool call: {choice.finish_reason}")

    messages.append(choice.message)
    for tool_call in tool_calls:
        name, arguments = validate_tool_call(tool_call)  # allowlist, schema, authorization
        result = execute_tool(name, arguments)
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result),
        })
else:
    raise RuntimeError("Agent exceeded its iteration limit")
```

Both examples implement the same cycle. The framework owns the bookkeeping. The raw version exposes the iteration limit, terminal-state handling, and validation required before a side-effecting tool executes.

# Pitfalls

## Infinite Loops and Tool Spam

An agent can spend heavily without getting closer to a complete result. In a production case documented by Hugo Nogueira, one run made 369 tool calls, consumed 9.7 million tokens, and produced 30 structured documents. It hit the context limit twice, recovered from a corrupted checkpoint, and nearly published an incomplete analysis before a guardrail caught it.

The model has no reliable sense of diminishing returns. As tool results accumulate, earlier attempts also become easier to miss.

The runtime needs a hard iteration cap. Agent Framework's `FunctionInvokingChatClient` exposes `MaximumIterationsPerRequest`. Outer workflow agents use their own loop controls, such as `LoopAgentOptions.MaxIterations`. LangGraph exposes `recursion_limit`.

Iteration caps alone are not enough. A wall-clock timeout covers slow calls, while a clear error path ends failures the loop cannot recover from. The loop should also stop when the agent repeats the same call or bounces between two states. Per-run tool counts make those patterns visible.

## Token Explosion

Every iteration makes the conversation larger. Full API payloads and long search results are especially expensive because most of their fields rarely affect the next decision. Eventually useful history is displaced or the request exceeds the context window.

The common cause is simple: tool adapters return whatever the underlying API returned instead of the small projection the model needs.

The remedy is compacting tool results at the boundary. Long runs also need token accounting and a deliberate compaction policy so that old evidence is summarized before the platform truncates it.

## Hallucinated Tool Calls

A model may request a missing function, produce schema-invalid arguments, or invent a parameter value. Ambiguous tool names and deeply nested schemas make these failures more likely.

Tool schemas are model input, not an enforcement mechanism. Names such as `process` or `handle` provide little help when several tools look alike.

The runtime validates the function name and arguments before execution and returns a precise error that the next iteration can act on. Clear names, narrow parameters, and shallow schemas reduce recovery work. For tools with side effects, validation belongs in code rather than in the prompt.

# Questions

<!-- qard-id: 379b8dd4-2827-420f-95eb-fd5e010aa7ad -->

> [!qard]- What does ReAct add to language-model reasoning when a task needs external information or computation?
> ReAct adds acting to reasoning. The model interleaves reasoning steps with actions such as a search, an API call or a calculation, and each action's result returns as an observation that informs the next reasoning step.
>
> 1. **Reason:** the model determines what is missing and which action could supply it.
> 2. **Act:** the model requests a tool call, and the runtime executes it.
> 3. **Observe:** the result is added to the model's context.
> 4. **Continue or answer:** the model reasons over the new evidence, then requests another action or gives a final answer.
>
> Reasoning alone draws only on the model's internal knowledge and the initial prompt, so an invented fact early in a reasoning chain can carry through to the answer. Observations ground each next step in external evidence, while reasoning decides which action is worth taking and how to interpret its result.
>
> ReAct does not guarantee a correct answer: a tool can return poor evidence, and the model can misread it. Each sequential cycle also adds a model call and more context, although a runtime can batch or parallelize independent actions.
>
> Sources: [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) · [Claude: How tool use works](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)

<!-- qard-id: 22e7675e-b513-44c7-babb-19e1e8c8e818 -->

> [!qard]- In a tool-using agent loop, which safeguards must be enforced outside the model, and what failure does each contain?
> Hard limits on iterations, time and spending, plus validation of every tool call before it executes, must be enforced by the runtime. The model cannot be relied on to stop itself or to request only valid actions, so these checks live in code the model cannot override.
>
> | Safeguard | Failure it contains |
> |---|---|
> | Iteration cap per request | A loop that keeps calling tools and never reaches a final answer |
> | Time limit | A slow or hanging call that never finishes its iteration, so an iteration cap alone would never trigger |
> | Token and cost budget | Context growth that overflows the window, or spending that exceeds its limit |
> | Repetition detection | The same call repeated, or two states alternating, without progress |
> | Tool-call validation | Unknown tools, schema-invalid arguments or unauthorized requests reaching a side-effecting operation; a precise error lets the next iteration correct the call |
>
> Frameworks expose some of these limits directly; the OpenAI Agents SDK, for example, bounds a run with `max_turns`. Prompt instructions can reinforce the limits but cannot replace them, because none may depend on the model obeying.
>
> Sources: [OpenAI Agents SDK: Running agents](https://openai.github.io/openai-agents-python/running_agents/) · [Claude: How tool use works](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)

# References

- [ReAct: Synergizing Reasoning and Acting in Language Models — Yao et al. ICLR 2023](https://arxiv.org/abs/2210.03629)
- [The 100th Tool Call Problem — production failure analysis (Hugo Nogueira)](https://www.hugo.im/posts/100th-tool-call-problem)
- [ReAct agent from scratch — LangGraph](https://langchain-ai.github.io/langgraph/how-tos/react-agent-from-scratch-functional/)
