# ponytail (vendored)

Lazy-senior-dev ruleset for OpenCode, vendored from upstream.

**Source**: https://github.com/DietrichGebert/ponytail
**Commit**: 687c1b3 (2026-06-15)
**License**: MIT

Vendored to avoid external dependency. Loaded by OpenCode's auto-discovery (per
docs at opencode.ai/docs/{plugins,commands,skills}). No entry in `opencode.json`.

## What lives where

| OpenCode-canonical | File | Auto-loaded by |
|---|---|---|
| `../plugins/ponytail.mjs` | plugin entry | `plugins/*.mjs` discovery |
| `../commands/ponytail*.md` | `/ponytail`, `/ponytail-review`, etc. | `commands/*.md` discovery |
| `../skills/ponytail*/SKILL.md` | skill bodies (incl. main rules) | `skill` tool |
| `./hooks/` | JS code the plugin loads via `require` | (not auto-discovered) |

`hooks/` stays here as a self-contained, portable unit. The rest moved to the
OpenCode-canonical roots so discovery works.

## To update from upstream

```bash
# 1. Clone fresh
git clone --depth 1 https://github.com/DietrichGebert/ponytail /tmp/ponytail-update

# 2. Compare vendored unit
diff -rq hooks/ /tmp/ponytail-update/hooks/

# 3. Compare auto-discovered files
for f in ponytail.md ponytail-review.md ponytail-audit.md ponytail-debt.md ponytail-help.md; do
  diff "../commands/$f" "/tmp/ponytail-update/.opencode/command/$f"
done

for s in ponytail ponytail-review ponytail-audit ponytail-debt ponytail-help; do
  diff "../skills/$s/SKILL.md" "/tmp/ponytail-update/skills/$s/SKILL.md"
done

# 4. Copy changes. For ../plugins/ponytail.mjs, re-apply the require fix:
#    require('../../hooks/...') → require('../ponytail/hooks/...')

# 5. Bump commit hash at the top of this file

# 6. Clean up
rm -rf /tmp/ponytail-update
```

## What's NOT vendored

- `commands/*.toml` — Claude Code command format
- `hooks/copilot-hooks.json` — Copilot-specific
- `pi-extension/` — Pi agent harness
- `benchmarks/`, `tests/`, `scripts/` — dev tooling
- `.claude-plugin/`, `.codex-plugin/`, `.cursor/`, `.windsurf/`, `.github/` — other agent integrations
