---
publish: true
created: 2026-07-13T09:43:13.823Z
modified: 2026-07-13T09:43:13.823Z
published: 2026-07-13T09:43:13.823Z
topic:
  - Architecture
subtopic:
  - Distributed Systems
summary: Vertical scaling gives a single node more CPU, RAM, or disk, the simplest first move for monoliths and managed databases.
level:
  - "2"
priority: High
status: Creation
---

# Vertical Scaling

Vertical scaling (scale-up) means giving a single node more resources: more CPU cores, more RAM, faster disks, or higher network throughput. The mechanism is direct: a process that was CPU-starved gets more cores and can run more threads concurrently; a database that was spilling to disk gets enough RAM to keep the working set in memory. No code changes, no topology changes. That simplicity makes it the right first move for monoliths and managed databases where adding nodes would require significant re-architecture. For the broader context of scaling strategies, see [[Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]].

You reach for it when: the bottleneck is clearly resource-bound on a single node, the workload doesn't parallelize cleanly across nodes, or the cost of [[Horizontal Scaling]] complexity (sharding, distributed coordination, eventual consistency) outweighs the cost of a larger machine.

## How It Works

The effect of scaling up depends on what the bottleneck actually is.

**CPU-bound**: Adding cores lets the OS scheduler run more threads in parallel. A .NET thread pool that was queuing work items because all threads were busy gets relief immediately. Throughput scales roughly linearly with cores until other bottlenecks appear (memory bandwidth, lock contention, GC pauses).

**Memory-bound**: Increasing RAM reduces pressure on the OS page file and allows larger in-process caches. For SQL Server or Azure SQL, more memory means a larger buffer pool, which means fewer physical reads. A query that took 800ms because it was reading from disk drops to 20ms when the pages are hot in memory.

**IO-bound**: Moving to a higher storage tier (e.g., Azure Premium SSD to Ultra Disk, or upgrading IOPS provisioning on Azure SQL) increases the throughput ceiling for reads and writes. This is the most common lever for write-heavy OLTP workloads.

When you scale up a VM in Azure, the hypervisor migrates the instance to a host with the target hardware profile. For Azure App Service, changing the plan tier resizes the underlying compute. For Azure SQL, changing the service tier (e.g., General Purpose to Business Critical) moves the database to different hardware with more vCores and a higher memory-to-core ratio.

## Example: Scaling Up Azure SQL and App Service

A .NET API backed by Azure SQL starts hitting CPU limits at peak load. The first diagnostic step is checking `sys.dm_exec_query_stats` and Azure Monitor metrics to confirm CPU is the bottleneck, not missing indexes.

Scale up Azure SQL via Azure CLI:

```bash
az sql db update \
  --resource-group myRG \
  --server myserver \
  --name mydb \
  --service-objective GP_Gen5_8
```

This moves from 4 vCores (General Purpose) to 8 vCores. The operation is online for Azure SQL Hyperscale; for other tiers it may cause a brief failover (typically under 30 seconds with Business Critical due to the secondary replica).

Scale up the App Service plan hosting the .NET API:

```bash
az appservice plan update \
  --name myAppPlan \
  --resource-group myRG \
  --sku P3V3
```

P3V3 gives 8 vCores and 32 GB RAM vs P1V3's 2 vCores and 8 GB. No redeployment needed; the app restarts on the new hardware.

For infrastructure-as-code, the equivalent in Bicep:

```bicep
resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  name: '${sqlServer.name}/mydb'
  sku: {
    name: 'GP_Gen5'
    capacity: 8
  }
}
```

## Pitfalls

**Hard ceiling on machine size.** Every cloud provider has a maximum VM SKU. Azure's largest general-purpose VM (Standard\_M416ms\_v2) has 416 vCores and 11.4 TB RAM. Once you hit it, vertical scaling is exhausted. Workloads that grow beyond that ceiling have no escape except horizontal scaling, which may require significant re-architecture if the system was designed assuming a single node.

**Single point of failure.** A larger single node concentrates blast radius. If the VM crashes, the entire workload goes down. Horizontal scaling distributes failure across nodes; vertical scaling does the opposite. Mitigation: pair vertical scaling with availability zones or active-passive failover (e.g., Azure SQL Business Critical tier includes a built-in secondary replica).

**Downtime during resize.** Not all scale-up operations are live. Azure VM resizing requires a stop/deallocate if the target SKU is on a different hardware cluster. Azure SQL General Purpose tier has a brief connection interruption during scaling. Plan maintenance windows and use connection retry logic (`Polly` with exponential backoff) to handle transient failures.

**Non-linear cost curve.** Doubling resources rarely doubles cost. Moving from 4 to 8 vCores on Azure SQL General Purpose roughly doubles the compute cost, but moving from 8 to 16 vCores on Business Critical tier can be 3-4x more expensive due to the premium hardware and built-in HA. Always model cost at the target tier before committing.

## Tradeoffs

| Dimension | Vertical Scaling | Horizontal Scaling |
|---|---|---|
| Complexity | Low — no topology change | High — requires load balancing, distributed state, sharding |
| Latency | Lower — no network hops between nodes | Higher — inter-node communication adds latency |
| Ceiling | Hard limit at max SKU | Effectively unlimited (add nodes) |
| Failure blast radius | High — single node failure = full outage | Low — node failure affects fraction of traffic |
| Cost efficiency | Poor at high scale — premium tiers are expensive | Better at scale — commodity nodes are cheaper per unit |
| Downtime risk | Possible during resize | Rolling deploys avoid downtime |
| When to prefer | Monoliths, stateful DBs, early-stage systems | Stateless services, read replicas, high-availability requirements |

The practical decision rule: start vertical, switch to horizontal when you hit the cost curve inflection point or when the single-node failure risk becomes unacceptable for your SLA.

## Questions

> [!QUESTION]- When is vertical scaling the right first move over horizontal scaling?
> **Expected answer:**
>
> - When the workload is stateful and hard to shard (e.g., a relational database).
> - When the bottleneck is clearly resource-bound on a single node.
> - When the operational cost of distributed coordination (consensus, partitioning, eventual consistency) exceeds the cost of a larger machine.
> - Vertical scaling is faster to implement and avoids distributed-systems complexity.
> - It's the right first move for most monoliths and managed databases in early growth phases.
>   **Why this is strong:** It shows the candidate reasons about tradeoffs (complexity vs cost) rather than defaulting to "just add more servers."

> [!QUESTION]- Why does vertical scaling have diminishing returns at high scale?
> **Expected answer:**
>
> - Hardware cost scales super-linearly: premium SKUs charge a multiplier for the same resource increment.
> - Not all workloads parallelize across additional cores — Amdahl's Law bounds speedup by the serial fraction.
> - A process with 20% serial code can never exceed 5x speedup regardless of core count.
> - Memory bandwidth and cache coherency become bottlenecks as core counts grow.
> - The cost-per-unit-of-capacity curve inflects sharply at high tiers.
>   **Why this is strong:** It demonstrates understanding of hardware economics and parallelism limits, not just "bigger is better."

> [!QUESTION]- What's the failure mode of relying solely on vertical scaling for availability?
> **Expected answer:**
>
> - A single large node is a single point of failure — any hardware fault, OS crash, or maintenance window causes full outage.
> - Vertical scaling increases capacity but does nothing for availability.
> - Mitigation: pair with redundancy (active-passive failover, read replicas, multi-AZ deployment).
> - Azure SQL Business Critical tier includes a built-in secondary replica for reads and failover.
> - This is distinct from [[Horizontal Scaling]], which inherently distributes failure across nodes.
>   **Why this is strong:** It shows the candidate distinguishes capacity from availability — a common interview blind spot.

## References

- [Azure SQL Database service tiers](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tiers-general-purpose-business-critical) — official docs on vCore tiers, hardware generations, and scaling behavior
- [Azure App Service plan overview](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans) — plan tiers, scaling options, and compute characteristics
- [Designing Data-Intensive Applications, Chapter 1 — Scalability](https://dataintensive.net/) — Kleppmann's treatment of scaling approaches, load parameters, and the limits of vertical scaling
- [The Pragmatic Engineer: Scaling Databases](https://blog.pragmaticengineer.com/scaling-databases/) — practitioner perspective on when vertical scaling breaks down and what comes next
