import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(new URL('../..', import.meta.url).pathname);

test('routing policy keeps SDD explicit and exposes the three ODD routes', async () => {
  const agents = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8');
  const route = await fs.readFile(path.join(root, 'skills/workflow/route-assess/SKILL.md'), 'utf8');
  for (const text of [agents, route]) {
    assert.match(text, /Direct/);
    assert.match(text, /Delegated direct/);
    assert.match(text, /Explicit SDD/);
    assert.match(text, /never (?:an )?automatic/i);
  }
  assert.match(agents, /size, risk, ambiguity, architecture, persistence, and file count alone never select SDD/i);
  assert.match(route, /SDD is never automatic/i);
});
