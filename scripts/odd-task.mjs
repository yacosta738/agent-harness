#!/usr/bin/env node
import { initTask, updateTask, checkTask, resumeTask } from './odd-task-lib.mjs';

const [command, ...args] = process.argv.slice(2);
const rootIndex = args.indexOf('--root');
const root = rootIndex >= 0 ? args[rootIndex + 1] : process.cwd();
const positional = rootIndex >= 0 ? args.filter((_, index) => index !== rootIndex && index !== rootIndex + 1) : args;

function json(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }

try {
  let result;
  if (command === 'init') result = await initTask(root, positional.join(' '), {});
  else if (command === 'update') result = await updateTask(root, positional[0], { progress: option('--progress'), next: option('--next'), verificationEvidence: option('--evidence') });
  else if (command === 'check') result = await checkTask(root, positional[0]);
  else if (command === 'resume') result = await resumeTask(root, positional[0]);
  else throw new Error('usage: odd-task.mjs init|update|check|resume [args] [--root path]');
  json(result);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
