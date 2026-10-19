#!/usr/bin/env node
// Validate harness references for the opencode adapter (dotfiles deploy).
//
// Convention: repo root maps 1:1 to ~/.config/opencode, except
//   adapters/opencode/opencode.json -> opencode.json
//   adapters/opencode/cli.json      -> cli.json
// So {file:./...} in opencode.json is resolved target-relative against repo root.
//
// Checks (source mode, default):
//   1. opencode.json is valid JSON; every {file:PATH} and local instruction path
//      resolves to a file in the bundle. Global OpenCode paths map to bundle-relative paths.
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
  realpathSync,
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

// Glob match check: returns true if `pattern` matches at least one file under `root`.
// Supports `*`, `?`, and `**` (including the common `**/` recursive-directory form).
function globHasMatch(root, pattern) {
  let regexSource = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === "*") {
      const recursive = pattern[i + 1] === "*";
      if (recursive) i += 1;
      if (recursive && pattern[i + 1] === "/") {
        i += 1;
        regexSource += "(?:.*/)?";
      } else {
        regexSource += recursive ? ".*" : "[^/]*";
      }
    } else if (char === "?") {
      regexSource += "[^/]";
    } else {
      regexSource += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  const regex = new RegExp(`^${regexSource}$`);
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

function checkLocalInstructionPattern(root, pattern) {
  if (/[*?]/.test(pattern)) return globHasMatch(root, pattern);
  const target = resolve(root, pattern);
  const rootPath = resolve(root);
  if (!isInside(rootPath, target)) return "outside";
  try {
    const rootResolved = realpathSync(rootPath);
    const actualTarget = realpathSync(target);
    if (!isInside(rootResolved, actualTarget)) return "outside";
    return statSync(actualTarget).isFile() ? true : "not-file";
  } catch {
    return false;
  }
}

function checkOpencodeRefs(root, cfgRel) {
  const cfgPath = join(root, cfgRel);
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  const blob = JSON.stringify(cfg);
  const fileRefs = [...blob.matchAll(/\{file:([^}]+)\}/g)].map((m) => m[1]);
  const instructionRefs = Array.isArray(cfg.instructions) ? cfg.instructions : [];
  const refs = [
    ...new Set([
      ...fileRefs.map((ref) => ({ ref, kind: "{file:}" })),
      ...instructionRefs.map((ref) => ({ ref, kind: "instruction" })),
    ]),
  ].sort((a, b) => a.ref.localeCompare(b.ref));
  console.log(`${cfgRel}: ${refs.length} unique instructions and file refs`);
  const rootResolved = resolve(root);
  let ok = 0;
  for (const { ref, kind } of refs) {
    if (kind === "instruction" && /^https?:\/\//i.test(ref)) {
      ok += 1;
      continue;
    }

    if (kind === "instruction" && ref.startsWith("~/") && !ref.startsWith("~/.config/opencode/")) {
      const homeRef = ref.slice(2);
      if (ref.includes("*") || ref.includes("?")) {
        fail(`instruction '${ref}' is home-relative and cannot be verified as a self-contained bundle reference`);
      } else {
        try {
          if (statSync(resolve(process.env.HOME ?? "", homeRef)).isFile()) {
            ok += 1;
          } else {
            fail(`instruction '${ref}' is not a file`);
          }
        } catch {
          fail(`instruction '${ref}' does not exist under the current home directory`);
        }
      }
      continue;
    }

    if (kind === "instruction" && !ref.startsWith("~/.config/opencode/")) {
      const localRef = ref;
      const result = checkLocalInstructionPattern(root, localRef);
      if (result === true) {
        ok += 1;
      } else if (result === "outside") {
        fail(`instruction '${ref}' escapes the bundle root`);
      } else if (result === "not-file") {
        fail(`instruction '${ref}' is not a file`);
      } else {
        fail(`instruction '${ref}' does not resolve to a local file or matching glob`);
      }
      continue;
    }

    // The harness deploys to ~/.config/opencode, so validate these global paths inside the bundle.
    const bundleRelative = ref.startsWith("~/.config/opencode/")
      ? ref.slice("~/.config/opencode/".length)
      : ref;
    // {file:...} references retain their established config-root resolution.
    const stripped = kind === "{file:}"
      ? bundleRelative.replace(/^[\.\/]+/, "")
      : bundleRelative;
    if (kind === "instruction" && !isInside(rootResolved, resolve(root, stripped))) {
      fail(`instruction '${ref}' escapes the bundle root`);
      continue;
    }
    if (kind === "instruction" && /[*?]/.test(stripped)) {
      if (checkLocalInstructionPattern(root, stripped)) {
        ok += 1;
      } else {
        fail(`instruction glob '${ref}' matches no files in ${root}`);
      }
      continue;
    }
    const target = resolve(join(root, stripped));
    if (!isInside(rootResolved, target)) {
      fail(`${kind} '${ref}' escapes root ${root}`);
      continue;
    }
    if (kind === "instruction") {
      const localResult = checkLocalInstructionPattern(root, stripped);
      if (localResult === true) {
        ok += 1;
      } else if (localResult === "outside") {
        fail(`instruction '${ref}' escapes the bundle root`);
      } else if (localResult === "not-file") {
        fail(`instruction '${ref}' is not a file`);
      } else {
        fail(`instruction '${ref}' does not resolve to a local file`);
      }
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
      fail(`${kind} '${ref}' -> ${shown} MISSING`);
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