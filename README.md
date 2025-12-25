# OpenCode Agent Configuration

Custom agent configuration for OpenCode with specialized agents for different workflows.

## 🎨 Themes

### Aura Dark
Vibrant dark theme with high contrast colors perfect for long coding sessions.

**Colors:**
- Primary: Purple `#a277ff`
- Secondary: Green `#61ffca`
- Accent: Orange `#ffca85`
- Pink: `#f694ff`
- Blue: `#82e2ff`
- Error: Red `#ff6767`

### Aura Dark Soft
Softer variant with reduced saturation for less eye strain.

**Colors:**
- Primary: Purple `#8464c6`
- Secondary: Green `#54c59f`
- Accent: Orange `#c7a06f`
- Pink: `#c17ac8`
- Blue: `#6cb2c7`
- Error: Red `#c55858`

**To switch themes:**
Edit `opencode.json` and change the `theme` value to:
- `aura-dark` (default)
- `aura-dark-soft`
- `base`

---

## 🤖 Agents

### 1. Kuko (Primary Agent)
**Mode:** `primary`  
**Description:** Cuban fullstack architect focused on code reviews and best practices

**Use for:**
- Code reviews
- Architecture discussions
- Best practices guidance
- Technical mentoring
- Refactoring suggestions

**Style:** Direct, confrontational, educational. Won't sugarcoat issues.

**Tools:** Full access (read, write, edit, search)

---

### 2. Linear PM (Project Management)
**Mode:** `secondary`  
**Description:** Project management specialist for Linear workflow

**Use for:**
- Creating and updating Linear issues
- Sprint planning and tracking
- Issue triage and prioritization
- Status updates and progress tracking
- Generating project reports

**When to invoke:**
```
@linear-pm create issue for user authentication bug
@linear-pm update sprint progress
@linear-pm show blockers in current cycle
```

**Best practices:**
- Issues use verb-first titles: "Add", "Fix", "Update", "Refactor"
- Priorities: P0 (Critical) → P1 (High) → P2 (Medium) → P3 (Low)
- States: Backlog → Todo → In Progress → In Review → Done
- Always link PRs to issues

**Tools:** Linear MCP, read, search

---

### 3. PKM (Personal Knowledge Management)
**Mode:** `secondary`  
**Description:** Maintains Obsidian vault and Notion databases

**Vault Location:** `/Users/acosta/Library/Mobile Documents/iCloud~md~obsidian/Documents/🧠`

**Use for:**
- Creating and organizing notes in Obsidian
- Managing Notion databases
- Finding related notes and creating connections
- Maintaining knowledge structure
- Syncing between Obsidian and Notion

**When to invoke:**
```
@pkm capture idea about reactive programming
@pkm research notes on clean architecture
@pkm organize notes tagged #concept
@pkm sync project notes to Notion
```

**Note Types:**
- **Permanent Notes**: Evergreen content (status: `evergreen`)
- **Literature Notes**: From books/articles (tag: `#resource`)
- **Fleeting Notes**: Quick captures (status: `seedling`)
- **MOCs**: Maps of Content (links related notes)
- **Daily Notes**: Journal entries
- **Project Notes**: Active projects (tag: `#project`)

**Tags:**
- `#concept` - Core ideas and mental models
- `#resource` - References, tools, links
- `#project` - Active projects
- `#area` - Life/work areas
- `#code` - Programming concepts
- `#archive` - Completed content

**Note Structure:**
```markdown
---
title: Note Title
date: 2025-12-25
tags: [concept, code, architecture]
status: seedling
---

# Note Title

## Summary
One-paragraph summary

## Content
Main content with [[wikilinks]]

## References
- [[Related Note]]
- Source: [Link](url)
```

**Tools:** Notion MCP, read, write, edit, search

---

## 🔌 MCP Servers

### Context7
Type: Remote  
Purpose: Up-to-date library documentation

### DeepWiki
Type: Remote  
Purpose: GitHub repository documentation and Q&A

### GitHub Grep
Type: Remote  
Purpose: Search code across GitHub repositories

### Chrome DevTools
Type: Local  
Purpose: Browser automation and debugging

### Linear
Type: Remote  
Purpose: Linear API access for issue management  
URL: `https://mcp.linear.app/sse`

### Notion
Type: Local  
Purpose: Notion API access for database management  
Command: `npx -y @notionhq/mcp-server-notion@latest`

---

## 🚀 Usage Examples

### Code Review
```
@kuko review this authentication implementation
```

### Project Management
```
@linear-pm create issue: Fix memory leak in user service
Priority: P1
Labels: bug, performance
Estimate: 3 points
```

### Knowledge Capture
```
@pkm capture: Clean Architecture separates business logic from frameworks
Tags: #concept #architecture #code
Status: seedling
```

### Research
```
@pkm research: What notes do I have about hexagonal architecture?
```

### Sprint Planning
```
@linear-pm plan sprint with issues tagged "mvp"
```

### Notion Sync
```
@pkm sync daily note to Notion inbox
```

---

## 📁 File Structure

```
editors/agents/opencode/
├── opencode.json          # Main configuration
├── themes/
│   ├── base.json         # Original theme
│   ├── aura-dark.json    # Aura Dark theme
│   └── aura-dark-soft.json  # Aura Dark Soft theme
└── README.md             # This file
```

---

## 🔧 Configuration

Edit `opencode.json` to:
- Change theme
- Enable/disable MCP servers
- Modify agent prompts
- Adjust tool permissions

---

## 📝 Notes

- Linear MCP requires Linear workspace access
- Notion MCP requires Notion API token
- Obsidian vault must be accessible at configured path
- Agents work best when invoked for their specific domains

---

## 🎯 Tips

1. **Use the right agent**: Don't ask PKM about code reviews, use Kuko
2. **Be specific**: "create issue" vs "create P1 bug issue for auth flow"
3. **Link everything**: Connect issues to PRs, notes to each other
4. **Stay organized**: Review notes monthly, triage issues weekly
5. **Automate**: Let agents handle repetitive tasks (status updates, note templates)

---

Made with 🔥 by a Cuban who doesn't sugarcoat shit
