# Senior AI Engineer — Hiring Manager Final Round Prep (DraftKings AIP DevEx)

## Context

- **Format**: 30-minute Zoom with hiring manager
- **What passed**: System Design, OOD, Technical Deep Dive — feedback was "very positive"
- **What this round tests**: Depth behind your previous answers, practical judgment, cost awareness, mentorship ability, engineering discipline
- **Key shift**: Previous rounds tested *can you design it*. This round tests *have you actually done it and what did you learn*.

> [!warning] Critical mindset shift
> The hiring manager has likely read feedback from the previous rounds. She knows you can design RAG, agents, and OOD. Now she is probing: are you the person who actually shipped these things and made hard judgment calls — or did you study well? Every answer must include a **specific decision**, **why you made it**, and **what the cost was**.

---

## Know Your Interviewer — Nehal Odedra

**Title**: Engineering Manager, AI Platform — DraftKings

### Career Timeline

| Period | Role | What it tells you |
|---|---|---|
| Pre-DraftKings | Software Dev Manager + Senior MTS at **Blue Cedar** (mobile app security startup) | Security-first engineering mindset. Small-company builder mentality. |
| Mar 2022 – Nov 2025 | Engineering Manager, **Marketing Platform** at DraftKings | 3.5 years running a platform team that handles promotions, gamification, and traffic-spike-resilient marketing capabilities. She knows platform reliability under 10x spikes (Super Bowl, NFL Sunday). |
| **Nov 2025 – Present** | Engineering Manager, **AI Platform** | **Only ~4 months in this role.** She is actively building this team and defining its charter. |

**Skills**: Java, Python, REST, SQL, containerization. Master's in Computer Engineering (Boston University).

> [!warning] Critical insight
> **Nehal is 4 months into building a new team.** She is not interviewing for a seat on a mature team — she is hiring someone to help her build the AI Platform from scratch. This changes your framing: demonstrate that you can help define direction, not just execute tasks. Show you can build a platform, not just build tools.

### What This Means for Your Answers

| Her background | How to adapt |
|---|---|
| **4 months into new AI Platform role** | She needs builders, not joiners. Frame yourself as someone who can help define the team's charter, establish patterns, and ship the first platform capabilities. Ask questions that show you are thinking about what to build first. |
| **3.5 years on Marketing Platform** | She understands platform engineering deeply — reliability under load, serving multiple consumer teams, traffic spikes (1M+ ops/min during Super Bowl on Aurora). Connect your async pipelines and queue-based architectures to this reality. |
| **Java/Python, not .NET** | Lead with language-agnostic engineering principles. Use .NET as illustrative examples, not the primary framework. She should be nodding "yes, same in Java" — not translating mentally. |
| **Security background (Blue Cedar)** | She will notice and appreciate security awareness in AI systems. Mention prompt injection defense, PII stripping, audit trails, and scoped credentials naturally — do not wait for her to ask. |
| **Not an ML specialist** | She moved from Marketing Platform to AI Platform. She values engineering rigor and developer experience over ML theory. Do not talk about model architectures or training — talk about reliable, cost-effective, secure AI systems that serve engineers. |

### DraftKings AI Tools You Should Know About

These are real internal tools at DK. Referencing them shows you did homework.

| Tool | What it does | Why it matters |
|---|---|---|
| **DraftCode** | Internal AI-powered code review assistant. Accelerates PR review. Published on DK Engineering blog (Aug 2025). | Directly relevant to your Dexter/AmendA experience. Ask: "Is the AI Platform team the owner of DraftCode, or more the underlying infrastructure?" |
| **NELLY** | Internal ChatGPT-powered analytics tool. Launched Apr 2025. 4,000+ conversations by Feb 2026. RAG over internal docs, SQL generation, code review, slide generation. Has an "Agentic NELLY" prototype. | Shows DK is serious about internal AI tools. Reference it to show you follow their work. |
| **MongoDB Atlas + Vector Search** | AI infrastructure layer. Used for hybrid retrieval at their Nov 2025 hackathon. | DK uses MongoDB Atlas for vector search, not pgvector. Keep your answers technology-agnostic or mention MongoDB if natural. |

### DK Tech Stack (Confirmed)

| Layer | Technology |
|---|---|
| **Cloud** | AWS (primary — Aurora, re:Invent presenter) |
| **Database** | Amazon Aurora MySQL, MongoDB Atlas (vector search, AI workloads) |
| **Architecture** | Microservices (migrated from monolith) |
| **AI/LLM** | ChatGPT (NELLY), internal tooling (DraftCode), MongoDB vector search |
| **Scale** | 1M+ operations/minute on Aurora during Super Bowl |
| **Legacy** | .NET, ASP.NET, NGINX |

> [!tip] Stack awareness
> DK uses **AWS + MongoDB Atlas** for AI, not Azure or Postgres. Keep your answers stack-agnostic or reference AWS/MongoDB when natural. Your .NET background is still relevant — DK has .NET in their legacy and current stack.

### Corporate AI Framing

From DK's March 2026 investor communication:
> **"Increases Deployment of AI Across Platform to Drive Efficiency and Operating Leverage"**

AI at DK is framed as **cost efficiency and operating leverage** — not innovation for innovation's sake. This means the AI Platform team has direct executive visibility. Connect your work to measurable business outcomes.

### Interview Style Prediction

Based on her background, the question list, and her being 4 months into building a team:

She is looking for **a builder with engineering judgment, not an AI theorist.** She wants evidence that you:
1. Can help her build a platform from scratch (not just join one)
2. Make practical trade-off decisions (her platform reliability background)
3. Think about security and governance (her Blue Cedar background)
4. Can operate AI at platform scale across many engineering teams
5. Can mentor and uplevel others (the junior guidance question)
6. Have engineering discipline independent of AI (the code review question)

---

## Conversation Flow Model (30 Minutes)

Understanding the timing prevents you from over-investing in one answer.

| Phase | Time | What happens | Your goal |
|---|---|---|---|
| **Intro / Rapport** | 2-3 min | "Tell me about yourself" or "What interests you about this role?" | Warm, concise — 60 seconds max. See [[Sr. AI Engineer - Hiring Manager Final Round Prep#Why DraftKings Quick Answer]] |
| **Core Questions** | 18-22 min | She asks 4-6 questions from the list | 2-2.5 min per answer. Dense, specific. Leave room for follow-ups. |
| **Your Questions** | 3-5 min | "Do you have questions for me?" | Ask 2 prepared questions. See [[Sr. AI Engineer - Hiring Manager Final Round Prep#Follow-Up Questions to Ask]] |
| **Close** | 1-2 min | Wrap-up, next steps | Deliver closing statement or let it flow naturally. |

**Realistic expectation**: She will cover 4-5 of the 6 categories, not all 6. Some questions will be combined.

### Question Priority (Most Likely to Least Likely)

| Priority | Category | Why this order |
|---|---|---|
| **1 — Near certain** | Depth / trade-offs | This is the "go deep" filter — she listed it first. Likely her opener after intro. |
| **2 — Very likely** | AI tooling challenging scenario | Most differentiating question. Separates real practitioners from theorists. |
| **3 — Very likely** | Prompt engineering + model selection | These may be asked as one combined question: "How do you approach using AI tools — prompts, model selection, cost?" |
| **4 — Likely** | Junior developer guidance | Tests mentorship ability. Platform eng managers need people who uplevel the whole org. |
| **5 — Likely if time** | Code review | Tests engineering discipline independent of AI. May be shortened to just the follow-up ("concrete criteria"). |

**Preparation priority**: Nail categories 1-3 cold. Have 4-5 ready but expect shorter answers.

### 0. "Tell me about yourself" (45-60 seconds max) > 
 > "I'm a AI engineer, with deep focus on the AI features engineering. I've been involved across the full AI stack at my company — I designed and built a .NET microservice that serves AI workflows to the product, I working on the adopting AI in another microserviceservice, participated in architectural decisions for a Python-based chat agent microservice, and extended core system components like introducing vector-based indexing in Elasticsearch for semantic search. I own the full lifecycle of the features I build — from prompt engineering and evaluation pipelines to production monitoring. 
 > Beyond building, I've also become the go-to person for AI across the team and the broader .NET office. I've run trainings on AI tooling adoption, transferred knowledge on everything from prompt engineering to evaluation practices to the team, and I help colleagues integrate AI into their day-to-day workflows on an ongoing basis.
 > I'm genuinely excited about this role — building AI-powered tooling for developers is exactly the kind of work I want to be doing, and I'd love to bring that experience to the AIP DevEx platform." 
 
 **Why this works:** - Shows breadth (multiple services, cross-stack influence, infrastructure changes) not just one microservice - No years count — leads with seniority level and recent focus instead - The excitement line is natural and short — doesn't over-explain why the role fits - Under 60 seconds — leaves Nehal wanting to ask more
  **What NOT to do:** Don't walk through your resume chronologically. Don't mention ELEKS or outsourcing. Don't over-justify why the role appeals to you — a short genuine statement lands better than a paragraph of reasons.
---

## Preparation Checklist

### Today Session 1 (~60 min) — Build Answer Frameworks

- [x] Read [[Sr. AI Engineer - Hiring Manager Final Round Prep#Know Your Interviewer — Nehal Odedra]] — understand her background, the team's stage, and DK's real AI tools (DraftCode, NELLY) (10 min)
- [x] Read [[Sr. AI Engineer - Hiring Manager Final Round Prep#Quick Reference Card]] and [[Sr. AI Engineer - Hiring Manager Final Round Prep#Conversation Flow Model 30 Minutes]] (10 min)
- [ ] Study [[Sr. AI Engineer - Hiring Manager Final Round Prep#Category 1 — Depth and Trade-offs]] — review your .NET AI Microservice story with the three trade-offs (15 min)
- [ ] Study [[Sr. AI Engineer - Hiring Manager Final Round Prep#Category 2 — AI Tooling Challenging Scenario]] — review your reasoning model latency story end-to-end (15 min)
- [ ] Study [[Sr. AI Engineer - Hiring Manager Final Round Prep#Category 3 — Prompt Engineering Practices]] — internalize the markdown structure + evaluation pipeline + locale detection example (10 min)

### Today Session 2 (~60 min) — Practice Stories Out Loud

- [x] Practice the .NET AI Microservice story from Category 1 out loud, timed at 2.5 minutes — hit all three trade-offs cleanly, cut anything vague (15 min)
- [x] Practice the reasoning model latency story from Category 2 out loud, timed at 2-3 minutes — diagnosis, deeper optimization, failure handling, result (15 min)
- [x] Practice prompt engineering answer from Category 3 — markdown structure, iteration process, locale detection example, eval pipeline with metric types (10 min)
- [x] Practice model selection answer from Category 4 — latency vs accuracy axis, "does it even need an LLM?", speed-to-market decision (10 min)
- [x] Practice junior guidance answer from Category 5 out loud — deliver all 3 rules naturally, not as a numbered list (5 min)
- [ ] Practice code review answer from Category 6 out loud — name all 5 focus areas, especially PII and "actually running it" (5 min)

### Today Session 3 (~45 min) — Pressure Test and Traps

- [ ] Review [[Sr. AI Engineer - Hiring Manager Final Round Prep#Hiring Manager Interview Traps]] — all 8 traps (10 min)
- [ ] Review [[Sr. AI Engineer - Hiring Manager Final Round Prep#Handling Depth Follow-Ups The Real Test]] — practice the 4 follow-up patterns (10 min)
- [ ] Run through the top 4 priority categories as a rapid-fire drill: 2 minutes per answer, switch immediately. Record and listen for vague spots (15 min)
- [ ] Practice [[Sr. AI Engineer - Hiring Manager Final Round Prep#2-Minute Closing Script]] out loud — 3 times minimum (5 min)
- [ ] Practice [[Sr. AI Engineer - Hiring Manager Final Round Prep#Why DraftKings Quick Answer]] out loud until it feels natural, not rehearsed (5 min)

### Tomorrow Morning (~60 min) — Final Review

- [ ] Re-read [[Sr. AI Engineer - Hiring Manager Final Round Prep#Know Your Interviewer — Nehal Odedra]] — internalize: she is building a new team, she is platform/security, not ML. She knows DraftCode and NELLY (5 min)
- [ ] Read [[Sr. AI Engineer - Hiring Manager Final Round Prep#Quick Reference Card]] out loud (5 min)
- [ ] Practice [[Sr. AI Engineer - Hiring Manager Final Round Prep#Why DraftKings Quick Answer]] + Categories 1, 2, and 3 out loud, timed (20 min)
- [ ] Practice [[Sr. AI Engineer - Hiring Manager Final Round Prep#2-Minute Closing Script]] out loud — 3 times (10 min)
- [ ] Review [[Sr. AI Engineer - Hiring Manager Final Round Prep#Hiring Manager Interview Traps]] — focus on Traps 1, 3, and 5 (10 min)
- [ ] Review [[Sr. AI Engineer - Hiring Manager Final Round Prep#Follow-Up Questions to Ask]] — your #1 question references DraftCode/NELLY and the team being new. Have #2 ready as backup (5 min)
- [ ] Final confidence check: for the top 4 priority categories, can you deliver a concrete answer in under 2.5 minutes? If any feels weak, spend remaining time on that one (5 min)

---

## Quick Reference Card

> [!tip] How to use this card
> Read this out loud before each practice session. These are the anchoring phrases and frameworks you should have at instant recall.

### The One Rule for Every Answer

**Specific > General. Always.**

- Don't say "I consider trade-offs." Say "I chose .NET over Python because our team would maintain it long-term. The trade-off is ecosystem lag — we wait a month or two when LangChain ships something new, but our quarterly release cadence gives us a buffer."
- Don't say "I think about cost." Say "My first question is: does this even need an LLM? For high-volume narrow tasks, I compare projected monthly token spend against hosting an open-source model. We chose speed-to-market over perfect accuracy at 3x the timeline."
- Don't say "I review AI output." Say "I pull the branch, run tests locally, and do a happy-path dev test. Surprisingly, this catches things that passed CI more often than you would expect."

### STAR-T Answer Framework (for every behavioral question)

| Step | What to say | Time |
|---|---|---|
| **Situation** | One sentence: what project, what problem | 10 sec |
| **Task** | What was your specific responsibility/decision | 10 sec |
| **Action** | The specific thing you did and WHY | 60-90 sec |
| **Result** | Measurable outcome — numbers if possible | 15 sec |
| **Trade-off** | What you gave up, what you would change | 15 sec |

Total: ~2 to 2.5 minutes per answer. Leave room for follow-ups.

### Top 5 Anchoring Phrases

1. "The trade-off was [X] vs [Y]. I chose [X] because [constraint], accepting [downside]."
2. "I validated this by [metric/test], not by intuition."
3. "The failure mode I discovered was [specific thing], which I detected via [method] and mitigated with [fix]."
4. "For a junior developer, I would make this concrete: [specific actionable instruction]."
5. "The cost breakdown is roughly [$ per operation], which we monitor via [dashboard/alert]."

### DraftKings Numbers to Anchor

- **20%** tickets via AI — use-case signal
- **15%** throughput increase — org-level outcome target
- **100%** 101-level completion — enablement target
- **Cost per PR** (Dexter): ~$0.15-0.50 depending on ticket complexity
- **Model tiering**: classification at ~$0.001/call, code generation at ~$0.03-0.05/call

### Top 3 Signals for This Round

1. I make **specific** judgment calls and can explain the alternatives I rejected
2. I think about **cost as a first-class constraint**, not an afterthought
3. I can give **actionable guidance** to others, not just vague principles

---

## Category 1 — Depth and Trade-offs

### What They Are Testing

> "Can you go beyond the high-level summary and walk me through a concrete example?"
> "What were the trade-offs and why did you choose that approach?"
> "What practical judgment calls did you make, and what alternatives did you consider?"

The hiring manager wants to know: when you described RAG or agents in previous rounds, was that depth or breadth? She will pick one thing you said and go deeper. Prepare to be three levels deep on any project.

### The "Go-Deep" Framework

Pick ONE project. Know it at three levels of depth:

| Level | What you explain | Example (.NET AI Microservice) |
|---|---|---|
| **L1 — Architecture** | Boxes and arrows, data flow | .NET microservice → NLP workflows + vector search → product API |
| **L2 — Decision** | A specific choice you made and why | .NET vs Python, ML vs LLM, SK → MAF migration |
| **L3 — Failure + Recovery** | What broke, how you found it, how you fixed it | Reasoning model latency 200ms → 2s → reasoning level + parallel agents |

**The trick**: L1 is what everyone says. L2 separates prepared candidates. L3 separates people who shipped.

### Model Answer — .NET AI Microservice for AI Workflows (Primary Story)

> [!question] "Walk me through a concrete example of trade-offs you made"
> **Model answer (STAR-T, ~2.5 min):**
>
> **Situation**: "I designed and developed a .NET microservice that serves AI workflows to the product. It handles several independent features — most are NLP tasks like converting natural language into product entities, detecting user language and dialect, and one feature that is not LLM-based at all but uses vector-based semantic search for predictions on historical data."
>
> **Task**: "I made three key architecture decisions, each with real trade-offs."
>
> **Action**:
> "**Trade-off #1 — .NET vs Python for an AI-first service.** We chose .NET because our team was predominantly .NET developers who would be maintaining and extending the AI features long-term. The trade-off we accepted was a slight delay — when a breaking feature ships in the Python ecosystem like LangChain, we wait a month or two for the .NET equivalent. But given our quarterly release cadence, we always have time to evaluate alternatives and prepare other system parts while the .NET framework catches up. We accepted that risk with eyes open.
>
> **Trade-off #2 — ML models vs LLM-based approach.** Early on we had a Data Scientist building traditional ML solutions. The ML approach was somewhat more accurate in prototyping, but the iteration cycle was weeks vs days with LLMs. We needed fast customer feedback to validate whether features were even solving the right problem. The LLM approach let us ship, collect real usage data, and iterate. We later introduced proper evaluation metrics, which I can talk about in detail.
>
> **Trade-off #3 — Framework migration.** We started with Microsoft Semantic Kernel, then migrated to Microsoft Agent Framework when Microsoft decided to rewrite SK from scratch in collaboration with AutoGen. This was a significant pivot mid-project, but the new framework aligned better with our multi-agent architecture needs."
>
> **Result**: "We shipped features faster than competitors, built a proper evaluation pipeline with per-prompt synthetic datasets, and the architecture handles both simple NLP tasks and complex multi-agent workflows."
>
> **Trade-off**: "The main ongoing cost is the .NET ecosystem lag. If something game-changing lands in LangChain tomorrow, we are waiting a month or two. Our quarterly release cycle gives us a buffer, but it is not guaranteed — and that is a risk we consciously accepted."

### Model Answer — Retrieval Trade-off (Backup Story)

> [!question] "What practical judgment call did you make?"
> **Backup answer (~2 min) — use if she asks for a second example or a different project:**
>
> "When building retrieval for one of our AI developer tools, I had to choose between dense-only vector search and hybrid (dense + BM25 with RRF).
>
> Dense-only was faster to implement, but our codebase is full of acronyms — `MCP`, `DLQ`, `CQRS`, `YARP` — that have no semantic meaning in embedding space. Dense retrieval returned 0 relevant hits for queries containing these terms.
>
> I added BM25 as a sparse component with Reciprocal Rank Fusion to combine results. The cost was preprocessing time (building the BM25 index) and slightly higher retrieval latency (+15ms). The benefit: context precision went from 0.61 to 0.78 on our eval golden set.
>
> The judgment was: 15ms extra latency is invisible in a pipeline that already takes 10+ seconds for codegen. But missing the right context because of a term mismatch means the entire codegen output is wrong. I would make the same choice every time."

### Follow-Up Probes to Expect

- "What did you give up with .NET?" → "The main cost is ecosystem lag. If something game-changing lands in LangChain tomorrow, we are waiting a month or two. But our quarterly release cycle gives us a buffer — we evaluate, prepare dependent system parts, and by the time we ship, the .NET framework is typically ready. It is not guaranteed though, and that is a risk we consciously accepted."
- "How accurate was the ML approach compared to LLMs?" → "ML models never reached real production data, while LLM solutions were much easier to implement and deliver to customers. Later we introduced proper evaluation metrics for the LLM solution — per-prompt synthetic datasets of ~300 items with task-specific metrics. By that time the ML approach was no longer in play."
- "What would you change with hindsight?" → "I would have instrumented evaluation metrics from day one instead of adding them after the first quality concerns. Diagnosing 'bad output' is painful when you cannot measure where the problem is — retrieval, prompt, or model."

---

## Category 2 — AI Tooling Challenging Scenario

### What They Are Testing

> "Can you describe a specific challenging scenario where you used AI tooling, and how you handled it end-to-end?"

They want the full loop: problem → diagnosis → where it got tricky → how you solved it → outcome. The best stories have multiple layers of problem-solving, not just "I found the bug and fixed it."

### Model Answer — Reasoning Model Latency Crisis (Primary Story)

> [!question] "Describe a specific challenging scenario where you used AI tooling end-to-end"
> **Model answer (~2.5 min):**
>
> "A recent challenge was a latency problem after we upgraded to GPT-5-mini, a reasoning model. Our previous model, GPT-4.1, gave us 100-200ms response times. After the switch, we were seeing 1-2 seconds even on simple prompts — completely unacceptable for a user-facing feature where the delay would be visible in the UI.
>
> **Diagnosing the root cause:** The reasoning model defaults to deep chain-of-thought reasoning on every request, which we simply did not need for straightforward NLP tasks. Lowering the reasoning level from medium to none resolved most of the problem immediately.
>
> **Going deeper:** But I was already thinking about latency optimization more broadly, so I took it further. I analyzed our input data and realized it naturally splits into two categories based on our data model: simple rules — just a single description field — and complex rules that have description, instructions, and examples. Simple rules get processed in a single prompt. Complex rules get split into parallel agents, one per data item, which run faster because each has a smaller input/output scope.
>
> **Handling failures:** We chose graceful degradation — if one parallel agent fails, the completed results still return in the final response. The user sees which validations completed vs which did not. A full fallback mechanism to alternative models is in our roadmap for the next release.
>
> **Result:** We got latency back under acceptable thresholds while actually improving throughput for complex requests through parallelization."

### Follow-Up Probes to Expect

- "How did you decide simple vs complex?" → "The criteria maps directly to the data model. We validate entities against user-defined rules written in natural language. A rule with just a single description field — that is simple, one prompt handles it. A rule with description plus separate instruction plus examples — that is complex, it gets the multi-agent treatment. The schema itself is the classifier."
- "What about the fallback mechanism?" → "For now, graceful degradation — returning partial results is better than failing the entire request. Full model fallback is in tech debt for the next release. We chose to ship the parallel architecture first because that solved the immediate latency problem."
- "What would you do differently?" → "I would have built latency monitoring with per-model breakdowns from the start. When the reasoning model first deployed, we only had aggregate latency metrics — it took longer than it should have to isolate that the model switch was the cause, not our code."

### Alternative Story — AI-Assisted Web Debugging (Backup)

> [!question] Follow-up: "Can you give me another example?"
> **Backup answer (~1.5 min):**
>
> "During a release crunch, a teammate needed help fixing UI bugs related to our AI features on the web — and I have limited web development experience. Instead of spending days learning the codebase, I set up an iterative debugging pipeline using Cursor with Playwright MCP and Chrome DevTools automation. The AI agents could inspect the page, identify the visual issues described in the tickets, propose fixes, and verify them in the browser — all in a loop.
>
> We hit the release deadline with time to spare. During some free time I taught the setup to another developer, and we finished earlier than expected.
>
> The lesson: AI tooling is most powerful when it covers your weak spots. I did not become a frontend expert — I used AI to bridge that gap under time pressure, and then made the knowledge transferable to the team."

---

## Category 3 — Prompt Engineering Practices

### What They Are Testing

> "What prompt engineering practices do you use?"
> "How do you structure prompts, iterate, and validate the output?"

They want a repeatable methodology, not a list of techniques. Show that you have a system — and that you can prove when a prompt change is an improvement.

### Model Answer — Structure, Iterate, Validate

> [!question] "What prompt engineering practices do you use?"
> **Model answer (~2.5 min):**
>
> "I structure my prompts in markdown — headers, sections, highlighting. Not only is it more human-readable for the team, but models perform measurably better with structured input, and it is much more token-efficient than JSON-based prompt formats.
>
> **My iteration process:** I start simple — define the task clearly, maybe clarify the wording to remove ambiguity. Then I add basic happy-path examples, ground the prompt with data using prompt variables, and start the improvement loop: run evaluation, do manual testing, identify pain points, then fix them — sometimes through better prompting, sometimes by reducing noise in the input data, sometimes by adding more relevant context.
>
> **Concrete example of a prompt fix:** Our language detection prompt needed to return locale codes like en-US, en-GB, fr-FR. Evaluation showed it was consistently misclassifying British English as en-US. Root cause turned out to be simple — the prompt's list of available locale codes was missing en-GB entirely. Easy fix once diagnosed, but would have been hard to catch without systematic evaluation across 300 test cases.
>
> **Validation approach:** Every prompt gets evaluated against its own synthetic dataset of approximately 300 items using the Microsoft.Extensions.AI evaluation framework. Classification prompts get precision, recall, F1. NLP tasks like word suggestions get semantic similarity plus LLM-as-a-Judge for groundedness and fluency. Text generation prompts use purely LLM-as-a-Judge metrics — coherence, fluency, groundedness. Each metric has its own threshold — a fluency score of 3/5 is far less critical than a 4/5 on language detection classification. We baselined our metrics against a known-good production state and use that as our regression floor — no metric should drop below the previous release.
>
> **Security layer** (important for platform-scale prompts): Every production prompt includes defensive constraints against prompt injection — system prompt isolation so user-provided content cannot override instructions, and PII stripping before content enters the context. At platform scale, these defenses are part of the prompt architecture, not optional additions.
>
> **Platform perspective**: This evaluation loop is not just for my own prompts. At platform scale, it becomes a prompt development lifecycle that any team can follow — version control, per-prompt eval sets, and metric gates are what turn individual prompt craftsmanship into an organizational capability."

### Follow-Up Probes to Expect

- "How do you build the evaluation dataset?" → "We start with synthetic data, but we learned the hard way that synthetic cases do not always represent real-world edge cases. So we started collaborating directly with the product manager, who provides real examples of user requests. Those real-world examples seed the next iteration of synthetic cases — it is a feedback loop between production reality and our test data."
- "You mentioned LLM-as-a-Judge — any issues with that?" → "Yes — we initially used the framework's built-in Fluency judge, but it was not grounded to our system prompt. The LLM response was doing exactly what our prompt asked, but the judge had completely isolated requirements and was scoring fluency by its own generic standards. We fixed it by building a custom Fluency judge that takes our prompt's specific requirements into account when evaluating."
- "How do you decide when a prompt change is ready to ship?" → "No metric drops below the previous release baseline. If there is a specific improvement target, the PM defines the threshold. Every change goes through the eval pipeline before deployment — same rigor as a code change."

---

## Category 4 — Model Selection Tokens Cost Efficiency

### What They Are Testing

> "How do you decide which model/tool to use?"
> "How do you think about token usage?"
> "How do you manage cost efficiency when using AI tools?"

They want to hear that you treat cost as an engineering constraint, not a finance concern. The best answer shows you have a decision framework, not just a model preference.

### Model Answer — Latency vs Accuracy with Cost Awareness

> [!question] "How do you decide which model to use and manage cost?"
> **Model answer (~2 min):**
>
> "We are currently on OpenAI's infrastructure, so my decisions are within that ecosystem. My primary axis is latency vs accuracy:
>
> - **Fast pipeline needed?** GPT-5-mini with reasoning set to none — it is our fastest option.
> - **Accuracy over latency?** GPT-5.3 with configurable reasoning level — we dial it up or down based on the task.
>
> But the most important question I ask first is: **does this even need an LLM?** For high-volume, narrow tasks, I compare the projected monthly token spend against hosting an open-source ML model. If the approximate token cost exceeds what it would cost to rent a VM and run a smaller model, the math favors the self-hosted approach.
>
> **Why we have not done that yet in practice:** We evaluated this trade-off and the accuracy was comparable, but the infrastructure cost was the killer. We would need a full deployment pipeline — fine-tuning, evaluation, multi-tenant environment support — involving multiple teams. Given we were racing competitors to ship features, the development time outweighed the token cost savings. We chose speed-to-market with good-enough quality over perfect accuracy at 3x the timeline.
>
> **Platform-scale cost thinking**: When you are running AI capabilities for an entire engineering org, cost governance becomes critical infrastructure. Every team needs visibility into their own usage, and the platform team needs aggregate monitoring — total spend by model, by team, by use case. Rate limiting and quota management per team prevents one experiment from blowing the budget. This is why tools like LiteLLM matter — they give you a proxy layer for cost tracking, rate limiting, and model routing across the entire org."

### Follow-Up Probes to Expect

- "Have you done that open-source vs LLM calculation in practice?" → "Yes — we evaluated open-source models for several features currently running on LLMs. The accuracy was comparable, but the infrastructure cost was the killer — deployment pipeline with fine-tuning, evaluation, multi-tenant support, involving multiple teams. Given our competitive timeline, the development time outweighed the token cost savings."
- "How do you monitor cost?" → "Cost-per-operation on a dashboard, segmented by feature. Alert fires if cost per operation exceeds 2x the rolling average. This catches regressions — like a prompt change that accidentally removes a context length constraint, tripling the input tokens per call."
- "What about prompt caching?" → "For system prompts that stay constant across calls, I structure prompts so the static preamble is maximized. On high-volume pipelines, this cuts input token costs significantly. The key is designing prompts with caching in mind from the start."

> [!warning] Interview trap
> Never say "we always use the best model." That signals you have never operated at scale. The answer is: "I use the cheapest model that meets the quality threshold for each specific task, and I always ask first whether it even needs an LLM."

---

## Category 5 — Guidance for Junior Developers Using AI Tools

### What They Are Testing

> "What specific guidance would you give a junior developer using AI tools?"
> Expected: actionable steps, not just "review AI output."

The key word in the question is **specific**. The interviewer has heard "always review AI output" from every candidate. They want rules a junior can follow on Monday morning.

### Model Answer — Three Concrete Rules

> [!question] "What guidance would you give a junior developer using AI tools?"
> **Model answer (~2 min):**
>
> "Three concrete things I would tell a junior:
>
> **First — understand every line before you accept it.** If the AI generates a pattern you do not recognize, stop and learn it. Ask the AI to explain why it chose that approach. This turns AI from a crutch into a learning accelerator. The goal is not to produce code faster — it is to grow faster as an engineer while using AI as a tool.
>
> **Second — start simple, add complexity gradually.** Do not jump into multi-agent setups and MCP servers on day one. Start with basic chat-based coding assistance. Get comfortable. Then layer on things like browser DevTools MCP for web debugging, multi-file context, custom instructions. Each new layer should solve a real pain point you have actually experienced, not just be cool technology.
>
> **Third — stay current and compare tools on real tasks.** This field moves weekly. Read the OpenAI and Anthropic engineering blogs — they share genuinely useful insights about how to use their models effectively. When a new model drops, try it side-by-side with your current one on a task you are actually working on. The difference between a junior who is effective with AI and one who is not is often just knowing what is available right now."

---

## Category 6 — Code Review Pre-AI Era

### What They Are Testing

> "What specific things do you look for during code review?"
> Follow-up: "What are the concrete criteria/standards you enforce, beyond general themes like security/performance?"

They explicitly said: beyond general themes. They want to hear specific checks with specific thresholds, not categories.

### Model Answer — Five Focus Areas

> [!note] Nehal's background is Java/Python
> Lead with universal engineering principles she will relate to regardless of language. Use .NET as illustrative examples, not as the framing.

> [!question] "What do you look for in code review?"
> **Model answer (~2 min):**
>
> "My focus areas in order:
>
> **Code quality alignment** — does this follow the patterns established in the project? If we use repository pattern, do not introduce raw DB calls in a new service. Consistency across the codebase matters more than individual perfection.
>
> **Reusability and extensibility** — is this hardcoded to one use case, or structured so it can be extended? I will suggest design patterns when I see something that is going to be copy-pasted in three months.
>
> **PII in logs and metrics** — this is a must-check on every review. Sensitive data must be masked or excluded from telemetry. I have caught cases where raw user input was being logged directly.
>
> **Error handling** — are exceptions caught at the right level? Logged with enough context to debug, but not leaking implementation details to the caller?
>
> **Actually running it** — when I have time, I pull the branch, run the tests locally, and do a basic happy-path dev test. Surprisingly, this catches things that passed CI more often than you would expect — usually environment-specific assumptions or data state issues that unit tests do not cover."

> [!tip] Security signal for Nehal
> The PII-in-logs check naturally demonstrates security awareness. If she pushes for more, mention: "I also check dependency direction — domain logic should never import infrastructure, and configuration must be externalized and rotatable. Hardcoded credentials are an immediate blocker."

---

## Hiring Manager Interview Traps

### Traps Specific to This Round

> [!warning]- Trap 1: Staying at the high level when asked to go deep
> The hiring manager literally said: "go beyond the high-level summary." If you respond with architecture boxes and arrows, you have failed the question.
> **What they want**: A specific technical decision, the alternatives you considered, concrete numbers, and what you learned.
> **Fix**: Pick ONE decision. Name the alternatives. Give the numbers. State the cost. Every time.

> [!warning]- Trap 2: Describing AI tools generically
> "I use Claude and Cursor for coding assistance" is not a story. Every candidate says this.
> **What they want**: A specific hard problem, how you diagnosed it, and multiple layers of problem-solving.
> **Fix**: Your story must have depth. "We upgraded to a reasoning model and latency jumped 10x — I diagnosed the default reasoning level, then went further and split data processing into simple/complex paths with parallel agents" is 10x more credible than "AI made me faster."

> [!warning]- Trap 3: Listing prompt engineering techniques without a system
> Saying "I use chain-of-thought and few-shot examples" is textbook. The hiring manager has heard it from every candidate who read a blog post.
> **What they want**: A repeatable workflow — how you structure, iterate, and validate prompts in production. How do you know when a prompt change is an improvement?
> **Fix**: "Every prompt gets evaluated against its own 300-item synthetic dataset with task-specific metrics. No metric drops below the previous release baseline." That is a system, not a technique list.

> [!warning]- Trap 4: No cost awareness in your model selection answer
> If you describe model selection without mentioning cost trade-offs, you signal that you have never operated AI at production scale. Cost is a first-class architectural constraint.
> **What they want**: Evidence that you think about cost as an engineering decision, not just model quality.
> **Fix**: "My first question is always: does this even need an LLM? We evaluated open-source models vs LLM — accuracy was comparable but infrastructure cost killed it. We chose speed-to-market over perfect accuracy at 3x the timeline."

> [!warning]- Trap 5: Vague junior developer guidance
> "Review AI output carefully" is not actionable guidance. The interviewer explicitly said they expect actionable steps.
> **What they want**: Rules a junior can follow on their first day. Specific, concrete, testable.
> **Fix**: "First: understand every line before you accept it — ask the AI to explain patterns you do not recognize. Second: start simple, add complexity for real pain points, not cool technology. Third: stay current and compare tools on real tasks." Those are actionable.

> [!warning]- Trap 6: Code review answer stays at theme level
> "I look for security and performance issues" is a category, not a criterion. The follow-up question explicitly asks for "concrete criteria beyond general themes."
> **What they want**: Specific checks you actually enforce.
> **Fix**: "Project pattern alignment, reusability, PII in logs, error handling depth, and I actually pull the branch and run it — that catches things CI misses." Those are concrete.

> [!warning]- Trap 7: Not connecting answers to DraftKings
> This is a hiring manager for the AIP DevEx team. Every answer that does not somehow connect to developer experience, AI tooling adoption, or engineering throughput is a missed opportunity.
> **What they want**: Evidence that you understand the role and the mission.
> **Fix**: End at least 2-3 answers with a bridge: "This is directly relevant to [DK goal] because [connection]."

> [!warning]- Trap 8: Talking too long
> This is a 30-minute meeting. If you spend 5 minutes on one answer, you have used 1/6 of the meeting on one question. The hiring manager will not interrupt you — she will just move on with fewer data points.
> **What they want**: Concise, dense answers. 2-2.5 minutes max per answer.
> **Fix**: Practice with a timer. If your answer exceeds 3 minutes, cut the setup and go straight to the decision and trade-off.

---

## Bridge to DraftKings Phrases

Use these to connect your answers to the DK mission. Do not force them — weave naturally into 2-3 answers. The DraftCode/NELLY references show you did homework without being presumptuous.

- "This directly improves developer throughput — which is the 15% target — because [specific mechanism]."
- "This is the same pattern behind DraftCode's code review acceleration — [connect to your answer]."
- "At platform scale — when you are serving 100+ engineering teams, not just one tool — this becomes [infrastructure/governance/measurement] concern, not just a feature."
- "This maps to the DevEx adoption challenge: reducing friction so engineers actually use the tools instead of reverting to manual workflows. NELLY's growth to 4,000+ conversations shows what happens when the tool is frictionless."
- "For a new platform team, I think the first priority is [reliable infrastructure / trust / measurement] — you cannot scale what you cannot monitor."
- "From a cost-efficiency perspective — which is how DK's leadership is framing AI to investors — this approach [reduces cost / creates operating leverage] because [specific mechanism]."

---

## Follow-Up Questions to Ask

> [!note] Pick 1-2 for the end of the meeting. Questions 1 and 2 are what you practiced — lead with those. Questions 3 and 4 are backups if the first two get answered organically during conversation.

1. **"What does success look like for someone in this role at the 3-month and 12-month mark?"** — Shows you are thinking about impact from day one. Direct and confident.

2. **"Beyond engineering, who are the key stakeholders involved in shipping features — product managers, data scientists, other teams?"** — Shows you think about cross-functional collaboration, not just code.

3. **"I know the AI Platform team is relatively new — what are the highest-priority capabilities you are looking to build in the first few quarters? Is it more about infrastructure under tools like DraftCode and NELLY, or more about building new developer-facing tools?"** — Shows you know the team is new, you know the existing tools, and you want to understand the charter. Use if questions 1-2 are already answered organically.

4. **"What is the biggest friction point engineers face when trying to adopt AI tools today? Is it tooling, trust, enablement, or something else?"** — Shows you understand adoption is a behavior change problem. Good backup question.

---

## 2-Minute Closing Script

> [!note] Practice this out loud — 3 times minimum. It should feel conversational, not rehearsed.

> "What excites me about this role is the combination of two things: building reliable AI systems with real engineering discipline, and doing it at the platform level where the impact multiplies across the whole engineering org.
>
> I bring distributed systems thinking to AI problems — async pipelines, circuit breakers, observability, cost monitoring — because an AI feature that is unreliable or expensive is worse than no AI feature. I have built tools end-to-end, from code automation to support bots, and the lesson I keep learning is that the hard part is never the model — it is the retrieval quality, the validation pipeline, and the adoption strategy.
>
> What I find most compelling about the AI Platform team specifically is the stage it is in. Building the foundation of a platform is where I do my best work — defining the patterns, establishing the infrastructure, and making those first capabilities reliable enough that other teams trust and adopt them. I have seen what tools like DraftCode and NELLY can do at DraftKings, and I want to help turn that individual tooling success into a scalable platform capability.
>
> I would be excited to bring that production-minded, cost-aware, adoption-focused approach to help build the AI Platform."

---

## Handling Depth Follow-Ups (The Real Test)

Nehal's #1 question type is "go beyond the high-level summary." Here is how to handle the most common follow-up patterns:

### Pattern: "Can you be more specific?"

This means your answer was too abstract. Immediately pivot to a concrete data point:
- "Specifically, the metric we tracked was [X], and it moved from [A] to [B] after the change."
- "The specific file/component was [X], and the issue was [Y]."

### Pattern: "What alternatives did you consider?"

She wants to hear that you evaluated options, not just picked the obvious one:
- Name at least TWO alternatives
- For each, give ONE reason it was worse for YOUR specific constraints
- Close with: "Given our constraint of [X], option [Y] was the right trade-off."

### Pattern: "What would you do differently?"

This is a maturity test. The right answer is never "nothing":
- Pick one real thing you would change
- Explain what you learned AFTER shipping that made you realize this
- "With hindsight, I would have [X] because [Y]. I learned this when [Z] happened."

### Pattern: "How does this scale?"

Platform engineering manager question. She is thinking about 100+ engineers, not your team:
- Reframe your individual solution as a platform capability
- "For one team, this works as [X]. At org scale, you need [Y] — centralized governance, shared infrastructure, team-level customization."

---

## Backup Topics (If She Goes Off-Script)

Hiring managers sometimes ask questions not on the recruiter's list. Have these ready:

### "How do you handle disagreement with a team member about a technical approach?"

> "I separate the disagreement from the person. I ask: 'What specific concern does your approach address that mine does not?' Usually, we are optimizing for different constraints. I propose: 'Let us write down the decision criteria, score both approaches, and let the criteria decide.' If we still disagree, I defer to whoever owns the outcome — and I commit fully to the chosen approach. Relitigating after the decision is worse than picking the 'wrong' option."

### "What is the hardest technical problem you have solved recently?"

> Reuse the reasoning model latency story from Category 2, but frame it as the PROBLEM being hard, not the tooling. Focus on: what made this complex (production latency regression after model upgrade, multiple layers of optimization needed, graceful degradation design), how you decomposed it (diagnosis → reasoning level → data splitting → parallelization), and what the outcome was.

### "How do you stay current with AI developments?"

> "I distinguish between signal and noise. I follow a small set of primary sources — Anthropic's engineering blog, OpenAI's research updates, and Simon Willison's blog for practical AI engineering. I skip most hype content. When a new capability ships (like prompt caching or tool use improvements), I evaluate it against my current pipeline: does it solve a problem I actually have? If yes, I prototype and measure. If not, I note it and move on. I do not chase every new model release."

---

## Emergency Fallback Answers

If you get a question you did not prepare for, use this framework:

1. **Pause** — "That is a great question, let me think about it for a moment." (Buy 5 seconds.)
2. **Anchor to experience** — "The closest experience I have is [project]. In that context..."
3. **State the trade-off** — "The tension I see is [X] vs [Y]. My instinct is [choice] because [reason]."
4. **Invite follow-up** — "Does that map to what you are seeing on the team, or is there a different angle you are thinking about?"

The key: never give a theoretical answer when you can give an experiential one. "In my experience" beats "In theory" every time in a hiring manager round.

# Interview Answers — Ready to Deliver

## DraftKings Final Stage with Nehal Odedra

_Read these out loud 2-3 times before the call. Each main answer is ~2 minutes. Follow-ups are ~30-60 seconds each._

---

## 0. Tell Me About Yourself

I'm a Senior .NET developer, and for the last year and a half my focus has been AI. I've been involved across the full AI stack at my company — I designed and built a .NET microservice that serves AI workflows to the product, I contributed to another AI service, participated in architectural decisions for a Python-based agent microservice, and extended core system components like introducing vector-based indexing in Elasticsearch for semantic search. I own the full lifecycle of the features I build — from prompt engineering and evaluation pipelines to production monitoring.

Beyond building, I've also become the go-to person for AI across the team and the broader .NET office. I've run trainings on AI tooling adoption, transferred knowledge on everything from prompt engineering to evaluation practices, and I help colleagues integrate AI into their day-to-day workflows on an ongoing basis.

I'm genuinely excited about this role — building AI-powered tooling for developers and driving adoption is exactly the kind of work I want to be doing, and I'd love to bring that experience to the AIP DevEx platform.

---

## 1. Depth / Trade-offs

**"Can you walk me through a concrete example? What were the trade-offs?"**

I designed and developed a .NET microservice that serves AI workflows to the product. It handles several independent features — most are NLP tasks like converting natural language text into product entities, detecting user language and dialect, and one feature that isn't LLM-based at all but uses vector-based semantic search for predictions on historical data.

The first major trade-off was choosing .NET over Python for an AI-first service. We went with .NET because our team was predominantly .NET developers who would be maintaining and extending the AI features long-term. The trade-off we accepted was ecosystem lag — when a breaking feature ships in the Python ecosystem like LangChain, we wait a month or two for the .NET equivalent. But given our quarterly release cadence, we always have time to evaluate alternatives and prepare other system parts while the framework catches up. We accepted that risk with eyes open.

The second trade-off was ML models versus an LLM-based approach. Early on we had a Data Scientist building traditional ML solutions. The ML approach was somewhat more accurate in prototyping, but the iteration cycle was weeks versus days with LLMs. We needed fast customer feedback to validate whether features were even solving the right problem. So we went LLM-based — it let us ship, collect real usage data, and iterate. We later introduced proper evaluation metrics to keep quality measurable.

We also went through a framework migration — from Microsoft Semantic Kernel to Microsoft Agent Framework — when Microsoft decided to rewrite SK from scratch in collaboration with AutoGen. That was a significant pivot mid-project, but the new framework aligned better with our multi-agent architecture needs.

**Follow-up: "What practical judgment calls did you make?"**

The biggest one was choosing speed-to-market over theoretical accuracy. The ML approach might have been more accurate long-term, but we were in a race with competitors to ship features. We chose to be first with good quality, rather than exceptionally accurate but late. The LLM approach gave us a fast feedback loop with real customers, which turned out to be more valuable than optimizing accuracy in isolation.

On the .NET decision — practically, I also had to weigh the cost of retraining the entire team in Python versus accepting some ecosystem delay. The team's productivity in .NET far outweighed the marginal advantage of having every Python library available on day one.

---

## 2. AI Tooling — Specific Challenging Scenario

**"Describe a specific challenging scenario where you used AI tooling end-to-end."**

A recent challenge was a latency problem after we upgraded to GPT-5-mini, a reasoning model. Our previous model, GPT-4.1, gave us around 100 to 200 milliseconds response times. After the switch, we were seeing 1 to 2 seconds even on simple prompts — completely unacceptable for a user-facing feature where the delay is visible in the UI.

The first thing I diagnosed was the reasoning level. Reasoning models default to deep chain-of-thought on every request, which we simply didn't need for straightforward NLP tasks. Lowering the reasoning level from medium to none resolved most of the problem immediately.

But I was already thinking about latency optimization more broadly, so I took it further. I analyzed our input data and realized it naturally splits into two categories based on our data model. We validate entities against user-defined rules written in natural language. A rule with just a single description field — that's simple, one prompt handles it. A rule with description plus separate instructions plus examples — that's complex. Simple rules get processed in a single prompt. Complex rules get split into parallel agents, one per data item, which run faster because each has a smaller input and output scope, and they execute concurrently.

For failure handling, we chose graceful degradation — if one parallel agent fails, the completed results still return in the final response. The user sees which validations completed versus which didn't. Returning partial results is better than failing the entire request. A full fallback mechanism to alternative models is in our roadmap for the next release.

The result was latency back under acceptable thresholds, and we actually improved throughput for complex requests through the parallelization.

---

## 3. Prompt Engineering Practices

**"What prompt engineering practices do you use? How do you structure, iterate, and validate?"**

I structure my prompts in markdown — headers, sections, highlighting. Not only is it more human-readable for the team, but models perform measurably better with structured input, and it's much more token-efficient compared to JSON-based prompt formats.

My iteration process starts simple. I define the task clearly, clarify the wording to remove ambiguity. Then I add basic happy-path examples, ground the prompt with real data using prompt variables, and start the improvement loop — run evaluation, do manual testing, identify pain points, then address them. Sometimes the fix is better prompting. Sometimes it's reducing noise in the input data. Sometimes it's adding more relevant context to the request.

For validation, every prompt gets evaluated against its own synthetic dataset of approximately 300 items, using the Microsoft.Extensions.AI evaluation framework. The metrics depend on the problem type. Classification prompts — like language detection — get precision, recall, and F1 score. NLP tasks like suggesting word alternatives get semantic similarity plus LLM-as-a-Judge for groundedness and fluency. Text generation prompts use purely LLM-as-a-Judge metrics — coherence, fluency, groundedness.

Each metric has its own threshold, and the thresholds aren't equal. A fluency score of 3 out of 5 is far less critical than a classification score dropping below 4 out of 5 on language detection, because misclassifying a user's language directly impacts their experience. We baselined our metrics against a known-good production state and use that as our regression floor — no metric should drop below the previous release.

A concrete example: our language detection prompt needed to return locale codes like en-US, en-GB, fr-FR. Evaluation showed it was consistently misclassifying British English as en-US. The root cause was simple — the prompt's list of available locale codes was missing en-GB entirely. Easy fix once diagnosed, but it would've been very hard to catch without systematic evaluation across those 300 test cases.

**Follow-up: "How do you build the evaluation dataset?"**

We start with synthetic data, but we learned the hard way that synthetic cases don't always represent real-world edge cases. So we started collaborating directly with the product manager, who provides real examples of user requests from production. Those real-world examples then seed the next iteration of synthetic cases — it creates a feedback loop between production reality and our test data that keeps improving over time.

**Follow-up: "Any issues with LLM-as-a-Judge?"**

Yes, actually. We initially used the framework's built-in Fluency judge, but it wasn't grounded to our system prompt. Our LLM response was doing exactly what we asked in the prompt, but the judge had completely isolated requirements — it was scoring fluency by its own generic standards without knowing what we actually asked the model to do. We solved it by building a custom Fluency judge that takes our specific prompt requirements into account when scoring.

---

## 4. Model Selection / Tokens / Cost Efficiency

**"How do you decide which model to use? How do you think about tokens and cost?"**

We're currently on OpenAI's infrastructure, so my decisions are within that ecosystem. My primary axis is latency versus accuracy.

If the pipeline needs to be fast — user-facing, sub-second — GPT-5-mini with reasoning set to none is our fastest option. If we need accuracy over latency — more complex reasoning, higher-stakes output — we use GPT-5.3 with a configurable reasoning level that we dial up or down based on the task complexity.

But the most important question I ask first is: does this even need an LLM at all? For high-volume, narrow tasks, I compare the projected monthly token spend against what it would cost to host an open-source model on a VM. If the token cost exceeds the VM rental, the math favors the self-hosted approach.

In practice, we evaluated this trade-off. The accuracy was comparable with an open-source model, but the infrastructure cost was the killer. We'd need a full deployment pipeline — fine-tuning, evaluation, multi-tenant environment support across multiple environments — and that required involving different teams and multiple approval decisions. Given we were racing competitors to ship features, the development time far outweighed the token cost savings. We chose speed-to-market with good-enough quality over perfect accuracy at three times the timeline.

On token management specifically — I actively minimize input tokens by keeping system prompts concise, stripping unnecessary context, and filtering data before it hits the model. The simple-versus-complex split I mentioned earlier also helps here — simple requests use fewer tokens by design because they only send what's needed.

---

## 5. Guidance for Junior Developers Using AI Tools

**"What specific guidance would you give a junior developer using AI tools?"**

Three concrete things.

First — understand every line before you accept it. If the AI generates a pattern you don't recognize, stop and learn it. Ask the AI to explain why it chose that approach. This turns AI from a crutch into a learning accelerator. The goal isn't to produce code faster — it's to grow faster as an engineer while using AI as a tool. If you can't explain what the code does to a colleague, you don't understand it, and you'll be stuck when it breaks in production.

Second — start simple, add complexity gradually. Don't jump into multi-agent setups and MCP servers on day one. Start with basic chat-based coding assistance — just a conversation with the model about your code. Get comfortable with that. Then layer on tools like browser DevTools MCP for web debugging, multi-file context, custom instructions. Each new layer should solve a real pain point you've actually experienced, not just be cool technology you read about.

Third — stay current and compare tools on real tasks, not tutorials. This field moves weekly. Read the OpenAI and Anthropic engineering blogs — they share genuinely useful insights about how to get the most out of their models. When a new model or tool drops, try it side-by-side with your current setup on something you're actually working on — not a toy example. The difference between a junior who's effective with AI and one who isn't is often just knowing what's available right now and picking the right tool for the job.

---

## 6. Code Review — Concrete Criteria

**"What do you look for during code review? What concrete criteria do you enforce?"**

My focus areas, in the order I check them:

Code quality alignment — does this follow the patterns already established in the project? If we use repository pattern throughout, don't introduce raw database calls in a new service. Consistency across the codebase matters more than individual perfection. When I see something that's going to be copy-pasted in three months, I'll suggest extracting it or applying a design pattern to make it extensible.

PII in logs and metrics — this is a must-check on every single review. Sensitive data must be masked or excluded from telemetry. I've caught cases where raw user input was being logged directly into our monitoring systems. This is non-negotiable.

Error handling — are exceptions caught at the right level? Are they logged with enough context to actually debug the issue at 2 AM, but not leaking implementation details to the caller? I look for swallowed exceptions especially — silent failures are the hardest bugs to track down later.

Reusability — is this hardcoded to one use case, or structured so it can be extended? If I see logic that I know two other features will need, I'll flag it early rather than let three different implementations accumulate.

And finally — actually running it. When I have time, I pull the branch, run the tests locally, and do a basic happy-path dev test manually. Surprisingly, this catches things that passed CI more often than you'd expect — usually environment-specific assumptions or data state issues that unit tests don't cover. It's a small time investment that has saved us from shipping broken features multiple times.

---

## Questions to Ask Nehal (pick 1-2)

1. "What does success look like for someone in this role at the 3-month and 12-month mark?"
    
2. "Beyond engineering, who are the key stakeholders involved in shipping features — product managers, data scientists, other teams?"