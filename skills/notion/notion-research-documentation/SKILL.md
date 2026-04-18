---
name: notion-research-documentation
description: Research across Notion and synthesize into structured documentation; use when gathering info from multiple Notion sources to produce briefs, comparisons, or reports with citations.
metadata:
  short-description: Research Notion content and produce briefs/reports
---

# Research & Documentation

Pull relevant Notion pages, synthesize findings, and publish clear briefs or reports (with citations and links to sources).

## Quick start
1) Find sources with the available Notion search tool using targeted queries; confirm scope with the user.
2) Fetch pages via the available Notion page-read tool; note key sections and capture citations (`reference/citations.md`).
3) Choose output format (brief, summary, comparison, comprehensive report) using `reference/format-selection-guide.md`.
4) Draft in Notion with the available page/database create tool using the matching template (quick, summary, comparison, comprehensive).
5) Link sources and add a references/citations section; update as new info arrives with the available Notion update tool.

## Workflow
### 0) If Notion tools are unavailable, pause and ask the user to enable the Notion integration:
1. Enable the `notion` MCP entry in `editors/agents/opencode/opencode.json` for this environment or session.
2. Complete the Notion auth flow if OpenCode prompts for it.
3. Restart OpenCode or the current session if the tools still do not appear.

After the integration is enabled, finish your answer and tell the user to retry so they can continue with Step 1.

### 1) Gather sources
- Search first with the available Notion search tool; refine queries, and ask the user to confirm if multiple results appear.
- Fetch relevant pages with the available Notion page-read tool, skim for facts, metrics, claims, constraints, and dates.
- Track each source URL/ID for later citation; prefer direct quotes for critical facts.

### 2) Select the format
- Quick readout → quick brief.
- Single-topic dive → research summary.
- Option tradeoffs → comparison.
- Deep dive / exec-ready → comprehensive report.
- See `reference/format-selection-guide.md` for when to pick each.

### 3) Synthesize
- Outline before writing; group findings by themes/questions.
- Note evidence with source IDs; flag gaps or contradictions.
- Keep user goal in view (decision, summary, plan, recommendation).

### 4) Create the doc
- Pick the matching template in `reference/` (brief, summary, comparison, comprehensive) and adapt it.
- Create the page with the available Notion create tool; include title, summary, key findings, supporting evidence, and recommendations/next steps when relevant.
- Add citations inline and a references section; link back to source pages.

### 5) Finalize & handoff
- Add highlights, risks, and open questions.
- If the user needs follow-ups, create tasks or a checklist in the page; link any task database entries if applicable.
- Share a short changelog or status using the available Notion update tool when updating.

## References and examples
- `reference/` — search tactics, format selection, templates, and citation rules (e.g., `advanced-search.md`, `format-selection-guide.md`, `research-summary-template.md`, `comparison-template.md`, `citations.md`).
- `examples/` — end-to-end walkthroughs (e.g., `competitor-analysis.md`, `technical-investigation.md`, `market-research.md`, `trip-planning.md`).
