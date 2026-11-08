#!/usr/bin/env node
// Render the complete deployable OpenCode bundle from adapter.json components.
//
//   node scripts/generate-bundle.mjs render [--output <dir>]
//   node scripts/generate-bundle.mjs list
//
// Convention: bundle root mirrors ~/.config/opencode — every
// adapters/opencode/** file lands with that prefix stripped
// (opencode.json, cli.json, scripts/*, themes/*).
// Everything else keeps its repo-relative path.
// The orchestrator prompt ships as-is at prompts/ORCHESTRATOR.md (no composed
// AGENTS.md — kerrigan loads it via {file:./prompts/ORCHESTRATOR.md}).
// Output is deterministic: sorted files, no timestamps in the manifest.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
// node <20.19 lacks require in ESM scope guard: use createRequire for walk()
import {createRequire} from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADAPTER_PREFIX = "adapters/opencode/";

// Bundle root mirrors ~/.config/opencode: every adapters/opencode/** file
// lands with the prefix stripped (opencode.json, cli.json, scripts/*, themes/*,
// adapter.json).
function destFor(repoPath) {
  return repoPath.startsWith(ADAPTER_PREFIX) ? repoPath.slice(
      ADAPTER_PREFIX.length) : repoPath;
}

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

// Expand one include pattern (supports **, *, literal) to repo-relative paths.
// Dependency-free: small fs walk, deterministic sorted output.
function expand(pattern) {
  const out = [];
  if (!pattern.includes("*")) {
    if (existsSync(join(ROOT, pattern))) {
      out.push(pattern);
    }
    return out;
  }
  const parts = pattern.split("/");
  const starIdx = parts.findIndex((p) => p.includes("*"));
  const base = parts.slice(0, starIdx).join("/") || ".";
  const rest = parts.slice(starIdx);
  walk(join(ROOT, base), base, rest, out);
  return out.sort();
}

function walk(absDir, relDir, rest, out) {
  const {readdirSync, statSync} = require("node:fs");
  let entries;
  try {
    entries = readdirSync(absDir).sort();
  } catch {
    return;
  }
  const [head, ...tail] = rest;
  for (const e of entries) {
    if (e === ".DS_Store") {
      continue;
    }
    const abs = join(absDir, e);
    const rel = relDir === "." ? e : `${relDir}/${e}`;
    const isDir = statSync(abs).isDirectory();
    if (head === "**") {
      // ** matches zero or more levels: try rest against self and children
      if (tail.length === 0) {
        if (!isDir) {
          out.push(rel);
        } else {
          walk(abs, rel, rest, out);
        }
      } else {
        if (matchPart(tail[0], e)) {
          if (tail.length === 1) {
            if (!isDir) {
              out.push(rel);
            }
          } else if (isDir) {
            walk(abs, rel, tail.slice(1), out);
          }
        }
        if (isDir) {
          walk(abs, rel, rest, out);
        }
      }
    } else if (matchPart(head, e)) {
      if (tail.length === 0) {
        if (!isDir) {
          out.push(rel);
        }
      } else if (isDir) {
        walk(abs, rel, tail, out);
      }
    }
  }
}

function matchPart(glob, name) {
  const rx = new RegExp(`^${glob.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`);
  return rx.test(name);
}

function resolveBundle(adapter) {
  const seen = new Set();
  for (const [comp, spec] of Object.entries(adapter.components ?? {})) {
    for (const pat of spec.include) {
      for (const f of expand(pat)) {
        seen.add(f);
      }
    }
  }
  return [...seen].sort();
}

function fileRefs(prompt) {
  if (typeof prompt !== "string") {
    return [];
  }
  return [...prompt.matchAll(/\{file:([^}]+)\}/g)].map(
      (m) => m[1].replace(/^\.\//, ""));
}

// Drop agent registrations whose prompt files are not in the complete bundle,
// so the generated opencode.json stays self-contained. Returns pruned names.
function pruneAgents(cfg, bundled) {
  const pruned = [];
  const agents = cfg.agent ?? {};
  for (const [name, def] of Object.entries(agents)) {
    if (name === "kerrigan") {
      continue;
    } // primary always ships
    const refs = fileRefs(def.prompt);
    if (refs.length > 0 && !refs.every((r) => bundled.has(r))) {
      delete agents[name];
      pruned.push(name);
    }
  }
  const subs = agents.kerrigan?.subagents ?? {};
  for (const [name, def] of Object.entries(subs)) {
    const refs = fileRefs(def.prompt);
    if (refs.length > 0 && !refs.every((r) => bundled.has(r))) {
      delete subs[name];
      pruned.push(`kerrigan:${name}`);
    }
  }
  return pruned.sort();
}

function render(outDir) {
  const adapter = loadJson("adapters/opencode/adapter.json");
  const files = resolveBundle(adapter);
  rmSync(outDir, {recursive: true, force: true});
  const bundled = new Set();
  for (const f of files) {
    bundled.add(destFor(f));
  }
  const pruned = [];
  for (const f of files) {
    const dest = destFor(f);
    const abs = join(outDir, dest);
    mkdirSync(dirname(abs), {recursive: true});
    if (f === "adapters/opencode/opencode.json") {
      const cfg = loadJson(f);
      pruned.push(...pruneAgents(cfg, bundled));
      writeFileSync(abs, JSON.stringify(cfg, null, 2) + "\n");
    } else {
      cpSync(join(ROOT, f), abs);
    }
  }
  const manifest = {
    generator: "scripts/generate-bundle.mjs",
    flatten: {[`${ADAPTER_PREFIX}**`]: "**"},
    pruned,
    files: [...bundled].sort(),
  };
  writeFileSync(join(outDir, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n");
  console.log(
      `complete bundle: ${manifest.files.length} files, pruned ${pruned.length} agents -> ${outDir}`);
  if (pruned.length > 0) {
    console.log(`  pruned: ${pruned.join(", ")}`);
  }
}

function list() {
  const adapter = loadJson("adapters/opencode/adapter.json");
  for (const f of resolveBundle(adapter)) {
    console.log(destFor(f));
  }
}

const require = createRequire(import.meta.url);

const [, , cmd = "render", ...rest] = process.argv;
const args = {};
for (let i = 0; i < rest.length; i += 1) {
  const option = rest[i];
  if (option !== "--output") {
    throw new Error(`unknown option '${option}' (supported: --output)`);
  }
  const value = rest[++i];
  if (!value || value.startsWith("--")) {
    throw new Error("--output requires a directory path");
  }
  args.output = value;
}
const output = resolve(ROOT, args.output ?? "distribution/opencode");

if (cmd === "render") {
  render(output);
} else if (cmd === "list") {
  list();
} else if (cmd === "--help" || cmd === "-h") {
  console.log(
      "Usage: node scripts/generate-bundle.mjs [render|list] [--output <dir>]",
  );
} else {
  throw new Error(`unknown command '${cmd}' (render|list)`);
}
