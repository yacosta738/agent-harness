#!/usr/bin/env node
// Validate harness references for the opencode adapter (dotfiles deploy).
//
// Convention: repo root maps 1:1 to ~/.config/opencode, except
//   adapters/opencode/opencode.json -> opencode.json
//   adapters/opencode/cli.json      -> cli.json
// So {file:./...} in opencode.json is resolved target-relative against repo root.
//
// Checks (source mode, default):
//   1. opencode.json is valid JSON; every {file:PATH} resolves to an existing file.
//   2. adapter.json is valid JSON; every non-glob include path exists;
//      every glob prefix (before **) exists as a directory.
//   3. commands/sdd-*.md absolute ~/.config/opencode/... paths map to repo files.
//
// Bundle mode (--root dist/opencode): resolves the bundle's opencode.json
// {file:} refs against the bundle root, so every preset ships self-contained.
// Exit non-zero on any failure.
//
// Cross-platform: no shell, no Python. Node 18+ built-ins only.

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FAILURES = [];

// True when `child` lives at or below `parent` (no `..` escapes past parent).
// path.relative(parent, parent) === ""; escapes start with "../" or are absolute.
function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !/^[\\/]/.test(rel);
}

// Glob match check: returns true if `pattern` (with `*` only; no `**`) matches
// at least one file under `root`. Mirrors pathlib.Path.glob semantics:
// `*` matches any chars except the path separator.
function globHasMatch(root, pattern) {
  const regexStr =
    "^" +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^/]*") +
    "$";
  const regex = new RegExp(regexStr);
  let found = false;
  const walk = (absDir, relDir) => {
    if (found) return;
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === ".DS_Store") continue;
      const rel = relDir === "" ? e.name : `${relDir}/${e.name}`;
      if (e.isDirectory()) walk(join(absDir, e.name), rel);
      else if (regex.test(rel)) {
        found = true;
        return;
      }
    }
  };
  walk(root, "");
  return found;
}

function fail(msg) {
  FAILURES.push(msg);
  console.log(`FAIL: ${msg}`);
}

function checkOpencodeRefs(root, cfgRel) {
  const cfgPath = join(root, cfgRel);
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  const blob = JSON.stringify(cfg);
  const refs = [
    ...new Set(
      [...blob.matchAll(/\{file:([^}]+)\}/g)].map((m) => m[1]),
    ),
  ].sort();
  console.log(`${cfgRel}: ${refs.length} unique {file:} refs`);
  const rootResolved = resolve(root);
  let ok = 0;
  for (const ref of refs) {
    // Python: ref.lstrip("./") strips any leading "." or "/" chars.
    const stripped = ref.replace(/^[\.\/]+/, "");
    const target = resolve(join(root, stripped));
    if (!isInside(rootResolved, target)) {
      fail(`{file:${ref}} escapes root ${root}`);
      continue;
    }
    let isFile = false;
    try {
      isFile = statSync(target).isFile();
    } catch {
      isFile = false;
    }
    if (isFile) {
      ok += 1;
    } else {
      let shown = target;
      try {
        const rel = relative(rootResolved, target);
        if (rel && !rel.startsWith("..") && !/^[\\/]/.test(rel)) shown = rel;
      } catch {
        /* keep shown = target */
      }
      fail(`{file:${ref}} -> ${shown} MISSING`);
    }
  }
  console.log(`  resolved ${ok}/${refs.length}`);
  return refs.length;
}

function checkAdapter() {
  const root = REPO;
  const adapterPath = join(root, "adapters", "opencode", "adapter.json");
  const adapter = JSON.parse(readFileSync(adapterPath, "utf8"));
  // compose sources: "layer:path"
  for (const [target, sources] of Object.entries(adapter.compose ?? {})) {
    for (const src of sources) {
      const path = src.partition(":")[2];
      if (!existsSync(join(root, path))) {
        fail(`compose ${target}: '${src}' MISSING`);
      }
    }
  }
  let n = 0;
  for (const [comp, spec] of Object.entries(adapter.components ?? {})) {
    for (const pat of spec.include ?? []) {
      n += 1;
      if (pat.includes("**")) {
        const prefix = pat.split("**")[0].replace(/\/+$/, "");
        if (prefix && !existsSync(join(root, prefix))) {
          fail(`component ${comp}: glob '${pat}' prefix MISSING`);
        }
      } else if (pat.includes("*")) {
        if (!globHasMatch(root, pat)) {
          fail(`component ${comp}: glob '${pat}' matches nothing`);
        }
      } else {
        if (!existsSync(join(root, pat))) {
          fail(`component ${comp}: '${pat}' MISSING`);
        }
      }
    }
  }
  console.log(`adapter.json: ${n} include patterns checked`);
}

function checkCommands(cmdsDir, resolveRoot) {
  // Python: sorted(cmds_dir.glob("sdd-*.md"))
  const all = readdirSync(cmdsDir);
  const cmds = all.filter((f) => /^sdd-.*\.md$/.test(f)).sort();
  let n = 0;
  for (const name of cmds) {
    const text = readFileSync(join(cmdsDir, name), "utf8");
    // Python regex: r"~\/\.config\/opencode\/(\S+?)(?=[\s\"'`]|$)"
    const re = /~\/\.config\/opencode\/(\S+?)(?=[\s"'`]|$)/g;
    for (const m of text.matchAll(re)) {
      const rel = m[1].replace(/[.,:;]+$/, "");
      n += 1;
      if (!existsSync(join(resolveRoot, rel))) {
        fail(`${name}: ~/.config/opencode/${rel} MISSING`);
      }
    }
  }
  console.log(
    `commands: ${n} absolute path refs checked in ${cmds.length} files`,
  );
}

function parseArgs(argv) {
  const out = { root: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") {
      out.root = argv[++i];
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: node scripts/check-refs.mjs [--root <bundleDir>]\n" +
        "  No --root: source mode (validates live repo).\n" +
        "  --root <path>: bundle mode (validates <path>/opencode.json).",
    );
    return 0;
  }
  if (args.root) {
    // Bundle mode: opencode.json must be self-contained (pruned at render).
    // Command bodies keep source-mode validation: their absolute refs
    // assume the full deployed layout, not a minimal slice.
    const root = resolve(args.root);
    checkOpencodeRefs(root, "opencode.json");
  } else {
    checkOpencodeRefs(REPO, join("adapters", "opencode", "opencode.json"));
    checkAdapter();
    checkCommands(join(REPO, "commands"), REPO);
  }
  if (FAILURES.length > 0) {
    console.log(`\n${FAILURES.length} FAILURE(S)`);
    return 1;
  }
  console.log("\nAll references OK");
  return 0;
}

process.exit(main());