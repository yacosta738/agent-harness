# Design skills — routing and precedence

Eight skills live in this directory. Two are systems with tooling; the rest are prompt
collections or asset pipelines. This file is the decision layer: which one to load, which one wins
in a conflict, and what is known to be broken in this install.

OpenCode discovers skills by `SKILL.md`, so this file is documentation only. It changes no routing
behavior on its own.

## 1. Decision table

| The task is… | Load | Why |
|---|---|---|
| Build, redesign, audit, polish, or refine any frontend interface — web or native, marketing or product | **`impeccable`** | Default and only owner of UI execution. Has modes, persistent `PRODUCT.md`/`DESIGN.md` context, a defect detector, and live browser iteration. |
| A diagram, chart, or structural visual: architecture, sequence, state machine, ER, timeline, swimlane, quadrant, Gantt, medallion, data flow | **`diagram-design`** | Separate domain with 27 visual types, semantic patterns, and hard layout rules. Does not compete with UI work. |
| Reference images before writing code: site section comps, app screen concepts | **`imagegen-frontend-web`** / **`imagegen-frontend-mobile`** | Produce direction references only. They do not write production UI. |
| An identity board: logo system, palette, brand guidelines | **`brandkit`** | Presentation artifact. Not a UI skill. |
| Implement an approved design image as code | **`image-to-code`** | Image → analysis → implementation, with the image as the contract. |
| A landing page or portfolio where you want a check against AI sameness and no design system exists yet | **`design-taste-frontend`** | Brief-inference-first, conservative scope. Use it *instead of* `impeccable` only when there is no incumbent visual authority. |
| Upgrade a legacy site that has no tokens, no `DESIGN.md`, and no direction | **`impeccable`** | Redesign mode replaces the visual world while keeping product truth. Audit first inside `$impeccable critique` when the current state needs evidence. |
| An explicit named aesthetic: Nothing | **`nothing-design`** (`skills/web/`) | One named aesthetic outlives generic presets. Execution still belongs to `impeccable`. |
| A Google Stitch project | **`stitch-design-taste`** | Emits a `DESIGN.md` in Stitch's format. Nothing else in the bundle does that. |

Output truncation control (`full-output-enforcement`) moved to `skills/workflow/`: it is not a
design skill.

## 2. Precedence when two skills disagree

Apply in order; the first one that decides, wins.

1. **The user's explicit brief.** Pinned aesthetics, eras, materials, fonts, and palettes override
   every skill's taste. Redirecting a clear brief toward a skill's preference is failure.
2. **`impeccable` owns execution.** Once loaded for a UI task, its craft floor, its detector
   findings, and its bans outrank another design skill's advice.
3. **Style presets contribute vocabulary, never rules.** A preset may name a palette, a type voice,
   or a layout archetype. It may not override the brief or relax `impeccable`'s bans.
4. **`diagram-design` is a separate domain.** Its connector rules, complexity budget, and 4px grid
   apply to diagrams. They never transfer to product UI.
5. **`imagegen-*` and `brandkit` produce references.** Production UI still goes through
   `impeccable`. A generated comp is never a specification.

Conflict that this ordering does *not* resolve: two prompt-only skills giving opposite aesthetic
advice with no tooling to arbitrate. Pick one, state why, and do not load both.

## 3. Known limitations of this install

Verified against the shipped sources, not assumed.

| Limitation | Detail |
|---|---|
| `impeccable` script paths | Upstream text hardcodes `.agents/skills/impeccable/`. Locally the scripts live under `~/.config/opencode/skills/design/impeccable/`. Resolve `$SKILL_DIR` once per session as its Setup step 0 instructs; all references use `node "$SKILL_DIR/scripts/…"`. |
| `impeccable` automatic detector | `$impeccable hooks` writes manifests for `.claude`, `.codex`, `.cursor`, and GitHub only. No OpenCode target exists, so nothing runs after a file edit. Run the detector manually: `node "$SKILL_DIR/scripts/detect.mjs" --json [target]`. |
| `diagram-design` verifier scripts | The skill ships `self_check.py`, `mermaid_extract.py`, and `drawio_extract.py`. `verify-geometry.py`, `verify-motion.py`, `test-verify-motion.py`, and `lint-skin.py` are upstream repository tooling and are not part of the skill subtree — they are absent at the pinned commit too. Connector geometry is verified by inspection. See that skill's `PROVENANCE.md` § Local patches. |
| `diagram-design` PNG export | Requires Playwright. Prefer the Playwright MCP server; the Python path in `references/export.md` needs `pip install playwright` and `playwright install chromium`. HTML and SVG export need no dependency. |
| First-use gates | Both systems stop on the first run in a new project by design: `impeccable` on `PRODUCT.md` (`$impeccable init`), `diagram-design` on its style-guide tokens. A stop here is the gate working, not a broken install. |

## 4. Verification before claiming a design task is done

- **`impeccable`**: detector clean, one batched inspection round covering desktop and mobile
  together, then at most one confirming round. The craft floor is a checklist, not a loop.
- **`diagram-design`**: `python3 <skill-dir>/scripts/self_check.py <file>` passes, plus the §9
  pre-output checklist including the six connector rules.

## 5. Why this file exists

Two years of collecting produced a thesis repeated in different voices with no arbitration.
Six such skills were archived on 2026-10-21 to `~/Downloads/Other/skills-archive`, with the reason
for each recorded in that directory's `README.md`: `redesign-existing-projects`,
`high-end-visual-design`, `gpt-taste`, `minimalist-ui`, `industrial-brutalist-ui`, and
`web/frontend-design`.

What remains is deliberate: two systems with tooling, four asset and pipeline skills that do work
no one else does, one narrow brief-first skill, one named aesthetic, and one external-tool
formatter.

Overlap is not a correctness problem. It becomes one when a loaded agent has to choose between five
equally-weighted voices. Sections 1 and 2 exist to make that choice deterministic. Adding a new
design skill means adding a row that no existing row already covers — a restored skill without a
routing reason is how the pile came back the first time.
