---
publish: true
created: 2026-08-20T20:41:15.683Z
modified: 2026-08-20T20:41:15.683Z
published: 2026-08-20T20:41:15.683Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Vertical scaling gives a single node more CPU, RAM, or disk, the simplest first move for monoliths and managed databases.
level:
  - "2"
priority: High
status: Creation
---

Vertical scaling (scale-up) gives one node more CPU, memory, storage throughput, or network capacity. It raises the capacity of the same process or database instance without partitioning work across nodes. That makes it a practical first move when one resource is measured as the bottleneck and a larger instance stays inside the cost and availability budget. [[Software Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]] covers the wider measurement decision.

The resource must match the constraint. More cores help only when runnable work can execute in parallel. More memory helps when the working set, cache, or database buffer pool is under pressure. Faster storage helps an I/O-bound path. A larger machine does little for lock contention, a serial section, a remote service limit, or inefficient queries.

# When Scale-Up Works

| Condition | Scale up | Move toward [[Software Architecture/Distributed Systems/Scalability Patterns/Horizontal Scaling]] |
| --- | --- | --- |
| Current limit | One node lacks a measured resource | One node cannot meet the capacity or availability target |
| Change cost | Resize is smaller than repartitioning the system | The single-node ceiling or price dominates |
| State | Local state is hard to split | State has a partition, replication, or externalization plan |
| Availability | Existing redundancy already covers the node | More independent replicas are required for the SLO |

Vertical scaling is bounded by the largest supported size and by diminishing returns. Amdahl's law captures the CPU case: if fraction `s` of an operation is serial, ideal speedup with `N` processors is

$$
S(N) = \frac{1}{s + \frac{1-s}{N}}
$$

With `s = 0.2`, unlimited processors still cannot exceed `5x` speedup. Real systems hit memory bandwidth, synchronization, or I/O limits sooner.

# What a Resize Costs

A resize can be disruptive. Azure VMs restart when resized while running, and some target sizes require deallocation because the current hardware cluster cannot host them. Azure SQL resource changes use a switchover that can briefly interrupt connections. The safe plan drains or fails over traffic, confirms retry behavior, performs the resize, and measures the original bottleneck again.

The commands below show three common resize paths. Their SKU names and API version are snapshots, not current recommendations. Target availability and supported versions must be checked before execution.

```bash
az sql db update \
  --resource-group myRG \
  --server myserver \
  --name mydb \
  --service-objective GP_Gen5_8
```

```bash
az appservice plan update \
  --name myAppPlan \
  --resource-group myRG \
  --sku P3V3
```

```bicep
resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  name: '${sqlServer.name}/mydb'
  sku: {
    name: 'GP_Gen5'
    capacity: 8
  }
}
```

Capacity and availability remain separate. A larger primary can serve more work but still fails as one unit. Redundancy across the required failure domains is necessary whether each replica is small or large. [[Software Architecture/Distributed Systems/Scalability Patterns/Horizontal Scaling]] becomes relevant when traffic or state must be divided across independent nodes.

# References

- [Azure App Service plan overview](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans)
