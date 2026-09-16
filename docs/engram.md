# Engram integration

Engram remains the persistent memory layer: OpenCode MCP tools, automatic session registration,
passive delegated-output capture, project import, and compaction recovery.

ODD task documents are mirrored under topic `odd/<feature>/tasks`. Routing decisions use the existing
`routing/<category>` topic convention. Subagents may save discoveries but do not own top-level session
summaries. The local Engram server is optional at runtime; unavailable memory must be reported rather
than silently presented as durable evidence.
