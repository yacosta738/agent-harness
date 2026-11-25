#!/usr/bin/env node
// Render + verify the deployable bundle. distribution/ is gitignored by design —
// run this after cloning/pulling, before (re)running dotter.
//
//   node scripts/deploy.mjs [--target <target>] [--output <dir>] [--validate-only]
//   node scripts/deploy.mjs all [--validate-only]
//
// Targets: opencode, claude-code, junie, antigravity
// Defaults:
//   target  = "opencode"
//   output  = "distribution/<target>"
//
// Step 1: invoke generate-bundle.mjs render [--target <target>]
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

const TARGETS = ["opencode", "claude-code", "junie", "antigravity"];

function parseArgs(argv) {
  const out = {
    target: "opencode",
    output: null,
    validateOnly: false,
    help: false,
    all: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "all") {
      out.all = true;
    } else if (a === "--target") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new Error("--target requires a target name");
      }
      out.target = value;
    } else if (a === "--output") {
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
      throw new Error(
          `Unknown option '${a}'. Use --help for supported options.`);
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

function deployTarget(target, output, validateOnly, validateAllTargets = true) {
  console.log(`\n--- Deploying ${target} ---`);

  if (!validateOnly) {
    console.log(`rendering ${target} bundle -> ${output}`);
    const renderCode = runNode("generate-bundle.mjs", [
      "render",
      "--target",
      target,
      "--output",
      output,
    ]);
    if (renderCode !== 0) {
      console.error(
          `generate-bundle.mjs failed for ${target} (exit ${renderCode})`);
      return renderCode;
    }
  } else {
    console.log(`validate-only mode (skipping render) -> ${output}`);
    if (!existsSync(output)) {
      console.error(`bundle dir not found: ${output}`);
      return 1;
    }
  }

  const checkCode = runNode("check-refs.mjs",
      ["--root", output, "--target", target]);
  if (checkCode !== 0) {
    console.error(`check-refs.mjs failed for ${target} (exit ${checkCode})`);
    return checkCode;
  }

  if (validateAllTargets) {
    // Run cross-target validation (frontmatter duplicates, broken dependencies, etc.)
    const distRoot = resolve(output, "..");
    const validateCode = runNode("validate-targets.mjs", ["--root", distRoot]);
    if (validateCode !== 0) {
      console.error(
          `validate-targets.mjs failed for ${target} (exit ${validateCode})`);
      return validateCode;
    }
  }

  if (validateAllTargets) {
    console.log(`bundle ready: ${output}`);
  } else {
    console.log(`bundle rendered and per-target checks passed: ${output}`);
  }
  return 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
        "Usage: node scripts/deploy.mjs [--target <target>] [--output <dir>] [--validate-only]\n"
        +
        "       node scripts/deploy.mjs all [--validate-only]\n" +
        "  Renders and validates the Agent Harness bundle.\n" +
        `  Targets: ${TARGETS.join(", ")}\n` +
        "  Default target: 'opencode'.\n" +
        "  'all' deploys all targets.",
    );
    return 0;
  }

  if (args.all) {
    let exitCode = 0;
    for (const target of TARGETS) {
      const output = resolve(REPO, `distribution/${target}`);
      const code = deployTarget(target, output, args.validateOnly, false);
      if (code !== 0) {
        exitCode = code;
      }
    }
    if (exitCode !== 0) {
      return exitCode;
    }

    const validateCode = runNode("validate-targets.mjs", [
      "--root",
      resolve(REPO, "distribution")
    ]);
    if (validateCode !== 0) {
      console.error(
          `validate-targets.mjs failed for all targets (exit ${validateCode})`);
      return validateCode;
    }
    console.log("all target bundles ready");
    return 0;
  }

  const output = args.output ? resolve(REPO, args.output) : resolve(REPO,
      `distribution/${args.target}`);
  return deployTarget(args.target, output, args.validateOnly);
}

process.exit(main());
