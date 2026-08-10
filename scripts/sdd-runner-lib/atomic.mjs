import fs from 'node:fs';
import path from 'node:path';

export function withLock(lockPath, callback, { ttlMs = 300000, force = false } = {}) {
  let acquired = false;
  try {
    try { fs.mkdirSync(lockPath); acquired = true; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (!force && !isStale(lockPath, ttlMs)) throw new Error('lock_conflict');
      fs.rmSync(lockPath, { recursive: true, force: true }); fs.mkdirSync(lockPath); acquired = true;
    }
    fs.writeFileSync(path.join(lockPath, 'owner'), JSON.stringify({ pid: process.pid, host: process.env.HOSTNAME || 'unknown', time: Date.now() }));
    fs.utimesSync(lockPath, new Date(), new Date());
    return callback();
  } finally { if (acquired) fs.rmSync(lockPath, { recursive: true, force: true }); }
}

export function atomicWrite(filePath, content) {
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const fd = fs.openSync(temp, 'w', 0o600);
  try {
    fs.writeFileSync(fd, content);
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  try {
    fs.renameSync(temp, filePath);
    const directory = fs.openSync(path.dirname(filePath), 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
}

function isStale(lockPath, ttlMs) {
  try {
    const stat = fs.statSync(lockPath);
    if (Date.now() - stat.mtimeMs <= ttlMs) return false;
    const owner = JSON.parse(fs.readFileSync(path.join(lockPath, 'owner'), 'utf8'));
    if (owner.host === (process.env.HOSTNAME || 'unknown')) {
      try { process.kill(Number(owner.pid), 0); return false; } catch { return true; }
    }
    return true;
  } catch (error) { if (error.code === 'ENOENT') return true; try { return Date.now() - fs.statSync(lockPath).mtimeMs > ttlMs; } catch { return true; } }
}
