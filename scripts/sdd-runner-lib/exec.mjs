import { spawn } from 'node:child_process';

export function buildEnvironment(allowlist, source = process.env) {
  return Object.fromEntries((allowlist || []).filter((key) => Object.hasOwn(source, key)).map((key) => [key, source[key]]));
}

export function runProcess(definition, { cwd, env, timeoutMs, outputLimit = 65536 } = {}) {
  const started = process.hrtime.bigint();
  const command = definition.argv?.[0] || definition.command;
  const args = definition.argv?.slice(1) || [];
  const shell = Boolean(definition.shell?.enabled);
  return new Promise((resolve) => {
    let child;
    try { child = spawn(command, args, { cwd, env, shell, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (error) { resolve(finished(started, { spawnError: error })); return; }
    let stdout = '', stderr = '', truncated = false, timedOut = false, settled = false;
    const append = (stream, chunk) => {
      const current = stream === 'stdout' ? stdout : stderr;
      const text = current + chunk.toString();
      if (Buffer.byteLength(text) > outputLimit) truncated = true;
      const value = Buffer.from(text).subarray(0, outputLimit).toString();
      if (stream === 'stdout') stdout = value; else stderr = value;
    };
    const timer = setTimeout(() => { timedOut = true; terminateProcessGroup(child); }, timeoutMs);
    child.stdout.on('data', (chunk) => append('stdout', chunk));
    child.stderr.on('data', (chunk) => append('stderr', chunk));
    child.once('error', (error) => { if (!settled) { settled = true; clearTimeout(timer); resolve(finished(started, { stdout, stderr, truncated, timedOut, spawnError: error })); } });
    child.once('close', (exitCode, signal) => { if (!settled) { settled = true; clearTimeout(timer); resolve(finished(started, { stdout, stderr, truncated, timedOut, exitCode, signal })); } });
  });
}

export function terminateProcessGroup(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') { child.kill('SIGTERM'); return; }
  try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  setTimeout(() => { if (child.exitCode === null) { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } } }, 100);
}

function finished(started, values) { return { exitCode: null, signal: null, stdout: '', stderr: '', truncated: false, timedOut: false, ...values, durationMs: Number(process.hrtime.bigint() - started) / 1e6 }; }
