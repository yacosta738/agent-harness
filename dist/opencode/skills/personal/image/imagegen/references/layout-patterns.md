# Layout Patterns Reference

Use this file to choose the composition before writing the prompt.

| Pattern             | Use When                                                          | Core Composition                                                        |
|---------------------|-------------------------------------------------------------------|-------------------------------------------------------------------------|
| Mission Dashboard   | Multi-metric overview, system status, executive technical summary | Top command bar, KPI cards, status tables, alert/log panels             |
| Ops Table           | Lists of endpoints, commits, tools, checks, services, risks       | Full-width table, compact rows, status badges, timestamps               |
| Process Monitor     | Build/deploy/runbook/progress narrative                           | Pipeline stages, active step, terminal log, ETA/progress bars           |
| Architecture Poster | Systems, AI flows, backend architecture, integrations             | Isometric/wireframe diagram, layer labels, side notes, data flow arrows |
| Terminal Log        | Chronological events, debugging, agent trace, incident story      | Log stream, timestamps, prompts, status codes, highlighted anomalies    |
| RPG Character Card  | Personal brand, bio, speaker profile, skills/stats                | Avatar, level, stat bars, achievements, skill panels                    |
| Hybrid              | Topic needs both structure and narrative                          | Combine 2 patterns max; avoid visual clutter                            |

## Topic-to-Pattern Defaults

| Topic                                    | Recommended Pattern                      |
|------------------------------------------|------------------------------------------|
| AI agents, orchestration, tool calls     | Architecture Poster + Terminal Log       |
| Cloudflare Workers, Vercel, edge systems | Architecture Poster                      |
| CI/CD, releases, automation              | Process Monitor                          |
| APIs and integrations                    | Ops Table                                |
| Observability, incidents, tracing        | Mission Dashboard + Terminal Log         |
| Security, auth, secrets, threat models   | Mission Dashboard                        |
| Databases, queues, storage               | Mission Dashboard or Architecture Poster |
| Performance and optimization             | Process Monitor                          |
| Git/version control                      | Ops Table + Terminal Log                 |
| Personal/career/profile                  | RPG Character Card                       |

## Pattern Selection Rules

1. If the topic is a system, choose **Architecture Poster**.
2. If the topic is a sequence over time, choose **Process Monitor** or **Terminal Log**.
3. If the topic is a comparison/list, choose **Ops Table**.
4. If the topic is identity/profile, choose **RPG Character Card**.
5. If uncertain, default to **Mission Dashboard** for broad technical content.

## Anti-Clutter Rule

Use at most three main content zones unless the user explicitly asks for an infographic/poster with
many sections.
