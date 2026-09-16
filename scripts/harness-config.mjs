#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderEffectiveTree, treeDigest, loadHarnessConfig } from './harness-config-lib.mjs';

const [command] = process.argv.slice(2);
const root = process.cwd();
try {
  const config = await loadHarnessConfig(root);
  if (command === 'check') {
    const destination = path.join(root, 'dist', 'opencode');
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-harness-render-'));
    try {
      const rendered = await renderEffectiveTree(root, temporary, config);
      const currentFiles = [];
      async function collect(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) await collect(file); else currentFiles.push(path.relative(destination, file).split(path.sep).join('/')); } }
      await collect(destination).catch(() => {}); currentFiles.sort();
      const currentDigest = currentFiles.length ? await treeDigest(destination, currentFiles) : undefined;
      if (rendered.digest !== currentDigest) throw new Error('effective_tree_drift');
      process.stdout.write(`${JSON.stringify({ status: 'PASS', ...rendered, destination }, null, 2)}\n`);
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
  } else if (command === 'render') {
    const rendered = await renderEffectiveTree(root, path.join(root, 'dist', 'opencode'), config);
    process.stdout.write(`${JSON.stringify({ status: 'PASS', ...rendered }, null, 2)}\n`);
  } else throw new Error('usage: harness-config.mjs render|check');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
