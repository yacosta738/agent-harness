import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { initTask, updateTask, checkTask, resumeTask } from '../odd-task-lib.mjs';

test('initializes and resumes a substantial ODD task with stable checklist ids', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'odd-task-'));
  const created = await initTask(root, 'Billing retry policy');
  assert.equal(created.version, 'agent-harness.odd-task/v1');
  assert.equal(created.slug, 'billing-retry-policy');
  assert.match(created.path, /odd\/tasks\/billing-retry-policy\.md$/);
  const first = await fs.readFile(created.path, 'utf8');
  assert.match(first, /ODD-001/);
  const updated = await updateTask(root, created.slug, { progress: 'Implementation started.', next: 'Run focused tests.' });
  assert.equal(updated.progress, 'Implementation started.');
  assert.equal((await checkTask(root, created.slug)).status, 'PASS');
  const resumed = await resumeTask(root, created.slug);
  assert.equal(resumed.tasks[0].id, 'ODD-001');
  assert.equal(resumed.next, 'Run focused tests.');
});

test('rejects malformed task documents before implementation proceeds', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'odd-task-invalid-'));
  await fs.mkdir(path.join(root, 'odd/tasks'), { recursive: true });
  await fs.writeFile(path.join(root, 'odd/tasks/bad.md'), '# Bad\n');
  await assert.rejects(() => checkTask(root, 'bad'), /missing_section/);
});
