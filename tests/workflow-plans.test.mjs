// Regression tests for the vertical slice contract.
//
// These tests read the SKILL.md files and assert that the shared contract
// prevents horizontal layer phases, defers critical controls, or forces SDD
// for trivial changes. They follow the same pattern as sdd-agents.test.mjs:
// static assertions on instruction text, not behavioral evaluation.

import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readSkill(dir) {
  const file = path.join(root, `skills/${dir}/SKILL.md`);
  assert.ok(existsSync(file), `missing skill: ${dir}`);
  return readFileSync(file, 'utf8');
}

// RPI-002 Case 1: Multi-surface capability grouped in one functional slice.
// sdd-tasks must NOT prescribe horizontal phases (Foundation, Core, Integration,
// Testing, Cleanup) as the default template.
test('sdd-tasks does not prescribe horizontal layer phases by default', () => {
  const tasks = readSkill('sdd/sdd-tasks');

  // The skill should reference vertical slices or functional units, not
  // recommend Foundation → Core → Integration → Testing → Cleanup as a
  // default decomposition.
  assert.doesNotMatch(
      tasks,
      /Phase 1.*Foundation.*\n.*Phase 2.*Core.*\n.*Phase 3.*Integration/s,
      'sdd-tasks must not present Foundation/Core/Integration as the default ' +
          'phase template');

  // If examples exist, they must illustrate functional slices, not layers.
  // The skill should contain language about grouping behavior, tests, and docs
  // together in deliverable units.
  assert.match(
      tasks,
      /slice|functional.*(unit|delivery)|deliverable.*(unit|batch)/i,
      'sdd-tasks must reference functional slices or deliverable units');
});

// RPI-002 Case 2: Trivial change does not force SDD.
test('rpi does not infer SDD from size, risk, or complexity', () => {
  const rpi = readSkill('workflow/rpi');
  assert.match(
      rpi,
      /Never infer SDD/i,
      'RPI must explicitly forbid inferring SDD from task characteristics');
});

// RPI-002 Case 3: Critical controls (auth, validation, integrity) are not
// deferred to a later phase.
test('sdd-tasks does not defer security or integrity to a later phase', () => {
  const tasks = readSkill('sdd/sdd-tasks');

  // The skill should not have a "Phase 4: Testing" that separates tests from
  // the behavior they verify. Tests must travel with their behavior.
  assert.doesNotMatch(
      tasks,
      /Phase.*Testing.*\n.*Unit tests.*\n.*integration tests/s,
      'sdd-tasks must not separate testing into its own horizontal phase');
});

// RPI-002 Case 4: After completing a slice, the agent stops for review and
// adaptation; it does not automatically continue to the next slice.
test('sdd-apply stops after completing the assigned batch', () => {
  const apply = readSkill('sdd/sdd-apply');
  assert.match(
      apply,
      /NEVER implement tasks that weren't assigned/i,
      'sdd-apply must refuse to implement unassigned tasks');
});

// RPI-002 Case 5: writing-plans aligns with vertical slices.
test('writing-plans groups behavior, tests, and docs together', () => {
  const plans = readSkill('workflow/writing-plans');
  assert.match(
      plans,
      /work.?unit.*(task|commit)/i,
      'writing-plans must reference work-unit tasks or commits');
  assert.doesNotMatch(
      plans,
      /Phase.*Testing.*\n.*Phase.*Cleanup/s,
      'writing-plans must not prescribe horizontal phases');
});
