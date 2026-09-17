---
description: Export a local Diagram Design HTML diagram as SVG and/or PNG
---

# Diagram export

This is a standalone OpenCode command adapter. Parse `$ARGUMENTS` as data, not as a shell command,
and follow the local `diagram-design` skill as the source of truth:

- `skills/design/diagram-design/SKILL.md`
- `skills/design/diagram-design/references/export.md`
- `skills/design/diagram-design/references/output-spec.md` when sizing is relevant

This Markdown prompt is model-driven guidance, not a deterministic CLI or a claim that text alone
enforces the rules. Execute the validations below, use only evidence from local files/tools, and do
not report an artifact, renderer, or status that was not actually observed.

## Contract

```text
$ARGUMENTS = <source.html>
              [--svg-only | --png-only]
              [--scale=1|2|3]
              [--output=<path>]
```

- `<source.html>` is required and must be one local HTML file containing the diagram SVG.
- Supported representations are `html` (the unchanged source), `svg` (diagram-only vector), and
  `png` (diagram-only raster). The normal operation produces SVG and PNG from the HTML source;
  `--svg-only` or `--png-only` selects exactly one. Never claim that HTML was regenerated.
- Without `--output`, write beside the source using its stem (`source.svg` and/or `source.png`).
  With one `*-only` flag, `--output` is the exact destination file and must have the matching
  suffix. With both outputs, `--output` is an existing safe directory or a suffix-less safe stem;
  derive `.svg` and `.png` without overwriting the source. Reject ambiguous output paths.
- `--scale=1|2|3` controls PNG `device_scale_factor`; default is `2`. It is invalid with
  `--svg-only` and has no effect on SVG.
- `--svg-only` and `--png-only` are mutually exclusive. Unknown, duplicated, space-separated, or
  unsupported flags are validation errors; do not silently reinterpret them.

## Validate before writing

1. Require exactly one source argument. Reject missing input, NUL bytes, URI schemes (`http:`,
   `https:`, `file:`, `data:`, `javascript:`), shell interpretation, nonexistent paths, directories,
   and unreadable files.
2. Resolve the source and output parent canonically from the current project/workspace root. Both
   must remain inside that root; reject `..` escapes and symlinks whose resolved target escapes it.
   The output parent must already exist. Never overwrite the source or write inside an unrelated
   checkout. These checks happen before any renderer or extractor invocation.
3. Reject the gallery file `skills/design/diagram-design/assets/index.html` (and its canonical
   equivalent). It contains multiple SVGs; never guess which gallery item to export.
4. Read the source as inert text and extract the **first** `<svg ...>...</svg>` block, as required by
   `references/export.md`. If there is no SVG, or its `viewBox` is absent, stop with no output.
   Preserve the authored accessible `<title>`, `<desc>`, `role`, and `aria-labelledby`; do not edit
   the source. A failed packaged `self_check.py` preflight is also a validation failure.
5. Validate every requested destination and capability before creating any user-visible file. Use
   temporary files followed by an atomic final move; on any failure remove temporary/partial outputs
   and leave no output at the requested path.

## Export procedure

For SVG, extract only the diagram SVG, add the SVG namespace when absent, require its `viewBox`,
preserve accessibility metadata, add the XML declaration, and follow `references/export.md` for
the merged XML-safe Google Fonts `@import`. Do not wrap it in page cards, headers, or `foreignObject`.

For PNG, render the original HTML and screenshot only the first SVG bounding box with a transparent
background. For motion, use the static query/state described by `export.md`, await `document.fonts.ready`,
and never use an arbitrary sleep. Before writing anything, prove that both the Python Playwright
module and a launchable local Chromium are available. If either is absent, report
`status: UNAVAILABLE` (or `status: BLOCKED` when the environment forbids the probe),
`reason: PLAYWRIGHT_OR_CHROMIUM_UNAVAILABLE`, and the missing prerequisite. Do not install packages,
download browsers, fetch a renderer, or substitute SVG for a requested PNG.

Do not add scripts, export buttons, or resources to the HTML. Reuse only the local source and the
skill's documented procedure; any font substitution or offline rendering limitation must be stated.

## Failure and result contract

Validation, unsupported input, or unavailable capability is a nonzero-equivalent result. Stop before
writing and report a stable reason such as `MISSING_SOURCE`, `UNSAFE_PATH`, `GALLERY_SOURCE`,
`SOURCE_HAS_NO_SVG`, `INVALID_VIEWBOX`, `UNKNOWN_FLAG`, `INVALID_SCALE`, `OUTPUT_CONFLICT`, or
`PLAYWRIGHT_OR_CHROMIUM_UNAVAILABLE`. Do not fabricate process exit codes or success.

Always finish with exactly these fields, including on failure:

```text
route: diagram-design → references/export.md
format: html-source → svg | png | svg+png
status: PASS | BLOCKED | UNAVAILABLE | ERROR
output: <exact path(s), or none>
limitations: <font, renderer, offline, or other observed limitation; none if none>
```

`PASS` requires the requested file format, exact path, and post-write existence/format checks. A
source remains unchanged in every status.
