---
publish: true
created: 2026-08-20T20:41:15.495Z
modified: 2026-08-20T20:41:15.495Z
published: 2026-08-20T20:41:15.495Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Extension mechanisms that add tools, data, and workflows to coding agents. MCP standardizes server connectivity and capability exchange.
status: Done
level:
  - "2"
priority: Medium
---

"Plugin" is an overloaded word in coding agents. It can mean an installable bundle for one product, an editor extension, or an external server connected through [[Model Context Protocol]]. The common idea is simple: the runtime gains a capability the model did not have in its original tool set.

MCP standardizes one part of that picture. A host connects to servers and discovers three server features: **tools** for actions, **resources** for context, and **prompts** for user-invoked templates. The protocol defines the exchange. The host still decides which capabilities reach the model, when approval is required, and how credentials are isolated.

# Plugin Ecosystems

## MCP Servers

MCP servers let several compatible clients reuse the same integration. A server can expose:

- **Tools** for actions such as file operations, API calls, and database queries
- **Resources** for structured context such as docs, schemas, and config files
- **Prompts** for reusable task templates and workflows

Filesystem, source-control, database, and search integrations are common examples. Portability is the main gain, although client support and approval behavior still differ.

## VS Code Extensions

GitHub Copilot and Cline run inside VS Code-compatible extension hosts. That gives them editor context and platform APIs that an MCP server does not replace. Copilot's extension APIs can also add domain-specific chat behavior inside the IDE.

## Cursor Extensions

Cursor supports MCP alongside its own rules and extension surfaces. The separation is useful: rules shape behavior, while a server exposes something the runtime can call.

# Example

This historical configuration shows the host/server shape:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "..." }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."]
    }
  }
}
```

The package names and credential style are illustrative. Registries and server packages change. The durable part is the boundary: connection details live in configuration, secrets stay outside committed files, and prompts do not hardcode service logic. For reusable instruction workflows that teach the agent when to call those tools, see [[Skills]].

# Pitfalls

- **Untrusted execution:** a server may read files, run commands, or call an external system. Give it the smallest credential and filesystem scope that works, and keep approval in front of sensitive actions.
- **Tool noise:** schemas consume context and can make selection harder. In MCPGauge's 2025 experiment with six commercial models and 30 tool suites, MCP use reduced average task performance by 9.5% in that benchmark. Code generation fell 17%. This is evidence that tool access can hurt, not a universal estimate for every model or server. Load the smallest relevant set.
- **Package provenance:** community servers often arrive through public registries. Pin reviewed versions and treat a server with filesystem or production credentials as executable supply-chain code.

# Tradeoffs

| Strategy | Benefits | Costs | Best fit |
|---|---|---|---|
| Rich plugin ecosystem | More tasks can be completed without bespoke adapters | More schemas, credentials, and supply-chain exposure | Repeated cross-system work with owners for each integration |
| Minimal toolset | Easier review and clearer tool choice | Some work stays manual | Narrow workflows or environments with strict trust boundaries |

# References

- [GitHub Copilot Extension API - chat participants (Microsoft)](https://code.visualstudio.com/api/extension-guides/ai/chat)
