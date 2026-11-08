#!/usr/bin/env node
// Render + verify the deployable bundle. distribution/ is gitignored by design —
// run this after cloning/pulling, before (re)running dotter.
//
//   node scripts/deploy.mjs [--output <dir>] [--validate-only]
//
// Defaults:
//   output  = "distribution/opencode"
//
// Step 1: invoke generate-bundle.mjs render
// Step 2: invoke check-refs.mjs --root <output> (bundle mode)
//
// Cross-platform: no shell, no `&&`, no `bash`. Node child_process handles
// paths correctly across OS (forward slashes in args; native resolution at
// each child). Exit non-zero if either child fails.

import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

function parseArgs(argv) {
  const out = {output: null, validateOnly: false, help: false};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--output") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new Error("--output requires a directory path");
      }
      out.output = value;
    } else if (a === "--validate-only") {
      out.validateOnly = true;
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    } else {
      throw new Error(`Unknown option '${a}'. Use --help for supported options.`);
    }
  }
  return out;
}

function runNode(scriptRel, args) {
  const result = spawnSync(
      process.execPath,
      [resolve(HERE, scriptRel), ...args],
      {stdio: "inherit"},
  );
  return result.status ?? 1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
        "Usage: node scripts/deploy.mjs [--output <dir>] [--validate-only]\n" +
        "  Renders the complete Agent Harness bundle.\n" +
        "  Default output: 'distribution/opencode'.",
    );
    return 0;
  }
  const output = args.output ? resolve(REPO, args.output) : resolve(REPO,
      "distribution/opencode");

  if (!args.validateOnly) {
    console.log(`rendering complete bundle -> ${output}`);
    const renderCode = runNode("generate-bundle.mjs", [
      "render",
      "--output",
      output,
    ]);
    if (renderCode !== 0) {
      console.error(`generate-bundle.mjs failed (exit ${renderCode})`);
      return renderCode;
    }
  } else {
    console.log(`validate-only mode (skipping render) -> ${output}`);
    if (!existsSync(output)) {
      console.error(`bundle dir not found: ${output}`);
      return 1;
    }
  }

  const checkCode = runNode("check-refs.mjs", ["--root", output]);
  if (checkCode !== 0) {
    console.error(`check-refs.mjs failed (exit ${checkCode})`);
    return checkCode;
  }

  console.log(`bundle ready: ${output} — now run dotter deploy`);
  return 0;
}

process.exit(main());
