#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderEffectiveTree, checkBundle, verifyBundle, linkBundle, loadHarnessConfig } from './harness-config-lib.mjs';

function parseArgs(argv) {
  const options = {
    adapter: 'opencode',
    output: null,
    target: null,
    preset: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--adapter') options.adapter = argv[++i];
    else if (arg === '--output') options.output = argv[++i];
    else if (arg === '--target') options.target = argv[++i];
    else if (arg === '--preset') options.preset = argv[++i];
    else if (!arg.startsWith('-')) {
      options.command = arg;
    }
  }
  return options;
}

async function main() {
  const root = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  const command = options.command;

  try {
    const config = await loadHarnessConfig(root, options.adapter);
    const effectiveConfig = options.preset ? { ...config, preset: options.preset } : config;
    const baseOutput = options.output ? path.resolve(root, options.output) : path.join(root, 'dist', 'opencode');

    if (command === 'render') {
      const rendered = await renderEffectiveTree(root, baseOutput, effectiveConfig, options.adapter);
      process.stdout.write(`${JSON.stringify({ status: 'PASS', ...rendered, output: baseOutput }, null, 2)}\n`);
      return;
    }

    if (command === 'verify') {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-harness-verify-'));
      try {
        const result = await verifyBundle(root, tempDir, effectiveConfig, options.adapter);
        process.stdout.write(`${JSON.stringify({ status: 'PASS', ...result, output: tempDir }, null, 2)}\n`);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
      return;
    }

    if (command === 'check') {
      const result = await checkBundle(root, baseOutput, effectiveConfig, options.adapter);
      process.stdout.write(`${JSON.stringify({ status: result.status, ...result }, null, 2)}\n`);
      return;
    }

    if (command === 'link') {
      const result = await linkBundle(root, options.target ?? '~/.config/opencode', effectiveConfig, options.adapter);
      process.stdout.write(`${JSON.stringify({ status: 'PASS', ...result }, null, 2)}\n`);
      return;
    }

    throw new Error('usage: harness-config.mjs render|verify|check|link [--adapter opencode] [--output dist/opencode] [--target ~/.config/opencode]');
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

await main();
