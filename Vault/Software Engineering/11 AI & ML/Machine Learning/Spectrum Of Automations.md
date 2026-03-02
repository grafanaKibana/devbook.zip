---
topic:
  - AI & ML
subtopic:
  - Machine Learning
level:
  - "1"
priority: Low
status: Creation
dg-publish: true
---

# Spectrum of Automation

The spectrum of automation describes five levels of AI involvement in a task, from fully human-driven to fully autonomous. It provides a framework for deciding how much to trust an AI system at a given maturity level, and how to deploy it safely as confidence grows.

The spectrum is not a linear progression — different tasks in the same system can sit at different levels simultaneously.

## The Five Levels

### 1. Human Only

No AI involvement. A human performs the task entirely. Baseline for comparison.

**Example**: a support agent manually reads and responds to every customer ticket.

### 2. Shadow Mode

The AI observes and generates predictions, but humans make all decisions. The AI's outputs are logged and evaluated but never acted upon automatically.

**Why it matters**: Shadow Mode is how you validate an AI system before giving it any real authority. You measure accuracy, false positive rate, and edge cases against real production data without any risk.

**Example**: an AI fraud detection model runs on every transaction and logs its predictions. The fraud team reviews flagged transactions manually. After 30 days, the team compares AI predictions to their own decisions to measure accuracy.

### 3. AI Assistance

The AI provides recommendations that a human reviews and approves before action. The human remains in the loop for every decision.

**Example**: the AI flags suspicious transactions and surfaces them to the fraud team with an explanation. The analyst approves or dismisses each flag.

### 4. Partial Automation

The AI acts autonomously on high-confidence cases. Low-confidence or edge cases are escalated to humans.

**Example**: the AI automatically blocks transactions with confidence > 95%. Transactions with confidence 70–95% are queued for human review. Below 70%, the transaction proceeds normally.

### 5. Full Automation

The AI acts autonomously on all cases without human review. Humans monitor aggregate metrics and intervene only when anomalies are detected.

**Example**: the fraud model blocks transactions automatically. The team monitors false positive rate and precision/recall dashboards. Alerts fire if metrics degrade.

## Decision Framework

| Level | When to use | Risk |
|---|---|---|
| Shadow Mode | New model, no production validation yet | Zero — no automated actions |
| AI Assistance | Model validated in shadow mode, but stakes are high | Low — human catches errors |
| Partial Automation | Model has high precision on confident cases | Medium — errors on automated cases |
| Full Automation | Model is mature, well-monitored, low-stakes errors | High — errors propagate at scale |

**Decision rule**: start every new AI feature in Shadow Mode. Move to AI Assistance after validating accuracy on production data. Move to Partial Automation when precision on high-confidence cases is consistently above your acceptable error threshold. Move to Full Automation only when the cost of errors is low or the monitoring is robust enough to catch degradation quickly.

## References

- [ML deployment strategies (Chip Huyen, Designing Machine Learning Systems)](https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/) — Chapter 9 covers deployment patterns including shadow mode, canary deployment, and A/B testing for ML systems.
- [Human-in-the-loop ML (Hugging Face)](https://huggingface.co/blog/human-in-the-loop) — practical discussion of when and how to keep humans in the loop for AI-assisted workflows.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
>
> **Topics**
> - [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Types|Types]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Data Drift|Data Drift]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Natural Language Processing|Natural Language Processing]]
<!-- whats-next:end -->
