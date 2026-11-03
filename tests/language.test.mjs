// Guard for the instruction-language decision documented in
// .agents/rpi/plan/tasks/english-instruction-language.md
//
// English is the language of instruction artifacts. Output language follows the user.
// skills/personal/haci/ is excluded: it encodes Spanish IRPF law and terminology.
//
// These assertions target strings that actually existed before the translation, so the
// guard fails on a regression and does not flag legitimate non-English domain content.

import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

const TRANSLATED_ARTIFACTS = [
  'README.md',
  'commands/review.md',
  'skills/workflow/code-review/SKILL.md',
  'skills/workflow/route-assess/SKILL.md',
  'skills/workflow/async-collaboration-comments/SKILL.md',
  'skills/testing/test-driven-development/SKILL.md',
  'skills/testing/test-driven-development/PROVENANCE.md',
  'skills/testing/test-driven-development/references/fundamentals.md',
  'skills/testing/test-driven-development/references/test-design.md',
  'skills/testing/test-driven-development/references/test-doubles.md',
  'skills/testing/test-driven-development/references/reliability.md',
  'skills/testing/test-driven-development/references/legacy.md',
  'skills/testing/test-driven-development/references/team-workflow.md',
  'skills/testing/test-driven-development/references/code-examples.md',
  'skills/testing/test-driven-development/references/example.test.ts',
  'skills/testing/test-driven-development/references/Example.kt',
  'skills/testing/test-driven-development/references/Example.java',
  'skills/testing/test-driven-development/references/example.rs',
  'skills/personal/image/imagegen/SKILL.md',
];

// Unambiguous Spanish strings that were present before the translation.
const RETIRED_SPANISH = [
  'Flujo de revisión',
  'Revisión de código',
  'Dobles de prueba',
  'Fundamentos y niveles',
  'Fiabilidad de los tests',
  'Diseño y legibilidad',
  'Flujo de equipo',
  'Ejemplos de código',
  'Desarrollo dirigido por tests',
  'URL de pull request',
  'working tree local',
  '¿Cuántas partes del sistema',
  'Los tests deben cubrir',
  'confirma una compra',
  'rechaza una compra',
  'Ejemplo',
  'MISIÓN',
  'HABILIDADES',
  'EXPERIENCIA',
  'CATEGORÍAS',
  'FILOSOFÍA',
  'NIVEL',
  'EXPERTO',
  'infografía',
  'perfil personal',
];

test('translated instruction artifacts keep no retired Spanish strings', () => {
  for (const relative of TRANSLATED_ARTIFACTS) {
    const body = read(relative);
    for (const retired of RETIRED_SPANISH) {
      assert.ok(!body.includes(retired),
          `${relative} still contains retired Spanish text: "${retired}"`);
    }
  }
});

test('reference filenames in the TDD skill are English', () => {
  const dir = path.join(root, 'skills/testing/test-driven-development/references');
  const retired = [
    'fundamentos.md', 'diseno-de-tests.md', 'dobles-de-prueba.md',
    'fiabilidad.md', 'flujo-de-equipo.md', 'ejemplos-de-codigo.md',
    'ejemplo-typescript.test.ts', 'EjemploKotlin.kt', 'EjemploJava.java',
    'ejemplo_rust.rs'
  ];

  for (const name of retired) {
    assert.ok(!existsSync(path.join(dir, name)),
        `Spanish reference filename still present: ${name}`);
  }

  const present = readdirSync(dir);
  for (const name of [
    'fundamentals.md', 'test-design.md', 'test-doubles.md', 'reliability.md',
    'team-workflow.md', 'code-examples.md', 'example.test.ts', 'Example.kt',
    'Example.java', 'example.rs'
  ]) {
    assert.ok(present.includes(name), `Expected English reference missing: ${name}`);
  }
});

test('skill frontmatter descriptions are English', () => {
  for (const relative of [
    'skills/workflow/code-review/SKILL.md',
    'skills/testing/test-driven-development/SKILL.md',
  ]) {
    const body = read(relative);
    const description = body.match(/^description:\s*(.+)$/m);
    assert.ok(description, `${relative} has no description`);
    assert.match(description[1], /^[A-Z]/,
        `${relative} description must start with a capital letter`);
    assert.doesNotMatch(description[1], /[áéíóúñ¿¡ÁÉÍÓÚÑ]/,
        `${relative} description contains Spanish characters: ${description[1]}`);
  }
});

test('the Spanish IRPF skill stays excluded from the English rule', () => {
  const skill = read('skills/personal/haci/SKILL.md');
  assert.ok(skill.length > 0, 'haci skill is missing');

  const readme = read('README.md');
  assert.match(readme, /`haci` \(Spanish IRPF\)/,
      'README must document the haci exclusion');
});
