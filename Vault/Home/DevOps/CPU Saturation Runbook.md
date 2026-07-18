---
topic:
  - DevOps
subtopic:
  - Observability
level:
  - "2"
priority: High
status: Creation
publish: false
summary: "An evidence-first runbook for separating hot code, runnable pressure, I/O wait, throttling, and allocation-driven CPU."
---

# Intro

CPU saturation means demand is competing for available execution time, but a `100%` chart does not identify the cause. The same symptom can come from a hot loop, higher request volume, garbage collection, lock spinning, too many runnable threads, or a container CPU quota. Use this runbook when latency rises with CPU, a container is throttled, or scaling replicas masks a recurring processor bottleneck.

The rule is simple: classify the pressure, capture a bounded profile, make one change, and compare the same measurements. Do not scale or optimize from utilization alone.

## Classify the Pressure

Start with measurements that separate different failure modes:

| Evidence | Likely interpretation | Next check |
| --- | --- | --- |
| High CPU and rising request rate | More useful work or an overload condition | Throughput, queue depth, latency, and per-request CPU |
| High CPU, flat traffic, one hot method | Algorithmic loop or unexpectedly expensive path | Time-bounded CPU profile and recent code changes |
| High CPU with allocation rate and GC time rising | Allocation pressure | Heap allocation profile, object lifetime, and Gen 2 collections |
| High load average with low CPU | Runnable backlog or uninterruptible I/O wait | Thread states, D-state tasks, and storage latency |
| Rising `nr_throttled` and `throttled_usec` | Cgroup CPU quota is delaying runnable work | CPU limit, request, node capacity, and throttling ratio |
| Many runnable threads with lock or spin frames | Contention or busy waiting | Lock profile, thread dump, and critical-section ownership |

CPU utilization says how much processor time was consumed. Load average includes runnable work and tasks in uninterruptible sleep, so it is not a CPU percentage. Container throttling is another separate signal: the workload may have idle node capacity while its cgroup quota prevents it from running.

## Bounded Evidence Sequence

On Linux, capture the system and cgroup state before profiling the process:

```bash
cat /proc/loadavg
ps -eo pid,stat,pcpu,pmem,comm --sort=-pcpu | head
cat /sys/fs/cgroup/cpu.stat
top -H -p <pid>
```

The `stat` column exposes runnable and uninterruptible-sleep states. In cgroup v2, `cpu.stat` reports usage and throttling counters. Record two samples across a fixed interval so rates can be compared; a cumulative counter without elapsed time is not a diagnosis.

For a .NET process, correlate runtime counters with a short trace:

```bash
dotnet-counters monitor --process-id <pid> \
  --counters System.Runtime Microsoft.AspNetCore.Hosting

dotnet-trace collect --process-id <pid> \
  --duration 00:00:30 --format speedscope
```

Keep the window short enough to reduce overhead but long enough to include the slow path. Capture request rate, p95/p99 latency, queue depth, allocation rate, GC time, thread-pool queue length, and cgroup throttling over the same interval.

## Example Decision

Suppose checkout p99 rises from 180 ms to 1.4 s while process CPU reaches its two-core quota. Traffic is flat, `cpu.stat` shows `nr_throttled` increasing every interval, and the trace attributes most samples to JSON serialization. Increasing the CPU limit may remove immediate throttling, but it does not prove the code is efficient.

First benchmark the serializer change under the same request mix. If CPU per request falls and latency recovers without a larger quota, the hot path was causal. If CPU per request stays flat but throttling disappears only with more quota, capacity was the binding constraint. Change one variable and compare the same counters; otherwise the result cannot distinguish optimization from added capacity.

## Failure Boundaries

- Do not treat a single host snapshot as a trend. Compare rates over a fixed interval.
- Do not infer CPU pressure from load average alone; inspect runnable and I/O-wait states.
- Do not assume more replicas help when the workload contends on one database, lock, or partition.
- Do not remove CPU limits blindly in a shared cluster; first identify whether quota policy or application cost is wrong.
- Do not capture an unbounded production trace. Define duration, storage destination, access policy, and cleanup.

The ByteByteGo source visual for common high-CPU cases remains rejected because it mixes causal categories. The runbook keeps utilization, run queue, I/O wait, quota throttling, garbage collection, and hot code as separate hypotheses.

## References

- [dotnet-counters diagnostic tool](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-counters) — Microsoft reference for observing runtime counters such as allocation rate, GC activity, and thread-pool behavior.
- [dotnet-trace diagnostic tool](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-trace) — Microsoft reference for collecting bounded .NET runtime traces and converting them for profile analysis.
- [Control Group v2 CPU interface](https://docs.kernel.org/admin-guide/cgroup-v2.html) — Linux kernel definitions for CPU weight, maximum bandwidth, pressure, and `cpu.stat` throttling counters.
- [Linux pressure stall information](https://docs.kernel.org/accounting/psi.html) — Linux kernel model for measuring time lost to CPU, memory, and I/O resource contention.
