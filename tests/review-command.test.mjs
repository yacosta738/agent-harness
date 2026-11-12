import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('/review routes PR URLs to the PR and no URL to the local worktree',
    () => {
      const command = readFileSync(path.join(root, 'commands/review.md'),
          'utf8');

      assert.match(command, /HTTPS pull request URL|PR URL/i);
      assert.match(command, /working tree|local working tree/i);
      assert.match(command, /--required/);
      assert.match(command, /review\.mjs start/);
      assert.match(command, /--pr-url/);
      assert.doesNotMatch(command, /git fetch/);
      assert.match(command, /do not use\s+`gh pr checkout`/i);
    });

test('the general review skill mandates RDD and all four 4R lenses', () => {
  const skill = readFileSync(
      path.join(root, 'skills/workflow/code-review/SKILL.md'), 'utf8');

  for (const term of [
    'rdd-review', 'four-r-review', 'R1 Risk', 'R2 Readability',
    'R3 Reliability', 'R4 Resilience', 'coderabbit-review',
    'double-blind-review', 'materialize', 'capture-correction',
    'acknowledge-approved'
  ]) {
    assert.ok(skill.includes(term),
        `Missing required review contract: ${term}`);
  }
});

test('the recovery command example includes the exact transaction binding',
    () => {
      const skill = readFileSync(
          path.join(root, 'skills/workflow/code-review/SKILL.md'), 'utf8');
      const closeSection = skill.slice(skill.indexOf('review.mjs close'));

      for (const flag of [
        '--lineage', '--revision', '--target', '--subject-hash',
        '--recovery-token', '--resolution'
      ]) {
        assert.ok(closeSection.includes(flag),
            `Missing exact recovery flag: ${flag}`);
      }
    });

test(
    'pr-watch keeps GitHub thread and workflow ownership while sharing code review',
    () => {
      const command = readFileSync(
          path.join(root, 'commands/pr-watch.md'), 'utf8');

      assert.match(command, /code-review/);
      assert.match(command, /review threads/i);
      assert.match(command, /workflow/i);
    });
