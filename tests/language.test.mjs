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

test('the haci skill stays in Spanish and stays excluded from the English rule', () => {
  const skill = read('skills/personal/haci/SKILL.md');
  assert.ok(skill.length > 0, 'haci skill is missing');

  // It is the Spanish tax authority skill: it stays in Spanish on purpose.
  for (const term of ['IRPF', 'AEAT', 'declaración de la renta']) {
    assert.ok(skill.includes(term), `haci skill lost its Spanish source text: ${term}`);
  }

  const readme = read('README.md');
  assert.match(readme, /`haci` \(Spanish IRPF\)/,
      'README must document the haci exclusion');
});

// Whole-catalog sweep. Every instruction artifact (Markdown and YAML) must read as English,
// with one documented exception.
//
// The detector counts Spanish-only vocabulary per line. A single Spanish function word is not
// evidence, because English documents legitimately contain words such as "no" or "so". Three or
// more distinct Spanish-only words on the same line is a Spanish sentence, not a coincidence.
//
// skills/personal/haci/ is excluded on purpose: it is the Spanish IRPF (Agencia Tributaria)
// skill and stays in Spanish, like the authority it serves. Its statutory names, regional
// deductions, and AEAT terminology are the source content, not drift.

const SPANISH_ONLY_WORDS = new Set([
  // Function words that are not valid English words.
  'al', 'ante', 'antes', 'aqui', 'asi', 'cada', 'como', 'con', 'cual', 'cuales', 'cuando',
  'de', 'del', 'desde', 'donde', 'durante', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre',
  'era', 'eramos', 'eran', 'eres', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta',
  'estaba', 'estan', 'estar', 'este', 'esto', 'estos', 'estoy', 'fue', 'fueron', 'ha',
  'haber', 'habia', 'hacia', 'hasta', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los',
  'mas', 'mucho', 'muy', 'nada', 'ni', 'nos', 'nosotros', 'nuestra',
  'nuestro', 'o', 'os', 'otra', 'otro', 'para', 'pero', 'poco', 'por', 'porque', 'puede',
  'pueden', 'que', 'quien', 'se', 'segun', 'ser', 'si', 'sin', 'sobre', 'son',
  'su', 'sus', 'tambien', 'tiene', 'tienen', 'todo', 'todos', 'tras', 'tu', 'tus',
  'un', 'una', 'uno', 'unos', 'unas', 'usted', 'va', 'van', 'y', 'ya',
  // Domain vocabulary that has no English counterpart in these documents.
  'archivo', 'archivos', 'cambio', 'cambios', 'codigo', 'contenido', 'contenidos',
  'datos', 'decision', 'decisiones', 'deduccion', 'documentacion', 'ejemplo', 'ejemplos',
  'estado', 'estrategia', 'estrategias', 'evidencia', 'fase', 'fases', 'guia',
  'implementacion', 'informacion', 'informe', 'informes', 'opcion', 'opciones', 'paso',
  'pasos', 'plantilla', 'problema', 'problemas', 'proceso', 'procesos', 'prueba', 'pruebas',
  'proyecto', 'proyectos', 'punto', 'puntos', 'referencia', 'referencias', 'requisito',
  'requisitos', 'resultado', 'resultados', 'reunion', 'revisar', 'revision', 'revisiones',
  'riesgo', 'riesgos', 'sistema', 'sistemas', 'siguiente', 'tarea', 'tareas', 'valor',
  'valores', 'verificacion',
]);

const INSTRUCTION_EXTENSIONS = new Set(['.md', '.yaml', '.yml']);
const SWEEP_SKIP_DIRS = new Set([
  '.git', 'node_modules', 'distribution', '.codegraph', '.idea', 'tmp',
]);
const SWEEP_SKIP_FILES = new Set([
  path.join('tests', 'language.test.mjs'),
]);

function collectInstructionFiles(dir, root, out = []) {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.isDirectory()) {
      if (SWEEP_SKIP_DIRS.has(entry.name)) continue;
      collectInstructionFiles(path.join(dir, entry.name), root, out);
      continue;
    }
    if (!INSTRUCTION_EXTENSIONS.has(path.extname(entry.name))) continue;
    const relative = path.relative(root, path.join(dir, entry.name));
    if (SWEEP_SKIP_FILES.has(relative)) continue;
    out.push(relative);
  }
  return out;
}

// Strip diacritics so "código" and "codigo" resolve to the same token.
const normalize = (word) => word.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Prose only. Inline code spans and fenced code blocks carry identifiers, locale codes, and
// sample payloads, not instructions.
const proseOf = (line) => line.replace(/`[^`]*`/g, ' ');

function proseLines(body) {
  const out = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push('');
      continue;
    }
    out.push(inFence ? '' : proseOf(line));
  }
  return out;
}

test('every instruction artifact is written in English', () => {
  const files = collectInstructionFiles(root, root)
      .filter((relative) => !relative.startsWith(path.join('skills', 'personal', 'haci')));

  assert.ok(files.length > 100, `Expected the catalog to be large, found ${files.length} files`);

  const offenders = [];
  for (const relative of files) {
    proseLines(read(relative)).forEach((line, index) => {
      const words = (line.toLowerCase().match(/[a-záéíóúñü]+/g) || []);
      const hits = new Set(words.filter((word) => SPANISH_ONLY_WORDS.has(normalize(word))));
      if (hits.size >= 3) {
        offenders.push(`${relative}:${index + 1} ${line.trim().slice(0, 120)}`);
      }
    });
  }

  assert.deepEqual(offenders, [],
      `Spanish prose found in instruction artifacts:\n${offenders.join('\n')}`);
});
