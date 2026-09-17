import fs from 'node:fs/promises';
import path from 'node:path';

export const ODD_TASK_VERSION = 'agent-harness.odd-task/v1';
const REQUIRED_SECTIONS = ['Objective', 'Problem', 'Why', 'Scope', 'Constraints', 'Tasks', 'Acceptance criteria', 'Verification evidence', 'Progress', 'Next step'];

export function slugify(value) {
  const slug = String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  if (!slug) throw new Error('feature_name_required');
  return slug;
}

export function taskPath(root, slug) {
  return path.join(path.resolve(root), 'odd', 'tasks', `${slugify(slug)}.md`);
}

function section(name, value) { return `## ${name}\n${value.trim()}\n`; }

export async function initTask(root, feature, options = {}) {
  const slug = slugify(options.slug ?? feature);
  const filePath = taskPath(root, slug);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try { await fs.access(filePath); throw new Error(`task_exists:${slug}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const content = [
    `# ${feature.trim()}`, '',
    section('Objective', options.objective ?? feature),
    section('Problem', options.problem ?? 'Describe the current gap this task addresses.'),
    section('Why', options.why ?? 'Record the user or operational motivation.'),
    section('Scope', options.scope ?? '- Define the bounded behavior and affected surfaces.'),
    section('Constraints', options.constraints ?? '- Preserve existing repository policy and unrelated work.'),
    section('Tasks', '- [ ] ODD-001 Define the first coherent behavior.\n- [ ] ODD-002 Verify the behavior with focused evidence.'),
    section('Acceptance criteria', '- Observable behavior is implemented and verified.'),
    section('Verification evidence', 'Pending implementation.'),
    section('Progress', 'Not started.'),
    section('Next step', 'Implement ODD-001 with a failing test first.'),
  ].join('\n');
  await fs.writeFile(filePath, content, 'utf8');
  return { version: ODD_TASK_VERSION, slug, path: filePath, ...parseTask(content) };
}

export function parseTask(content) {
  const heading = content.match(/^# (.+)$/m);
  const result = { title: heading?.[1]?.trim() ?? '' };
  for (const sectionName of REQUIRED_SECTIONS) {
    const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = content.match(new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=^## |$)`, 'm'));
    result[sectionName.toLowerCase().replace(/ /g, '_')] = match?.[1]?.trim() ?? '';
  }
  result.tasks = (result.tasks.match(/^- \[[ xX]\] (ODD-\d+) (.+)$/gm) ?? []).map((line) => {
    const match = line.match(/^- \[([ xX])\] (ODD-\d+) (.+)$/); return { id: match[2], done: match[1].toLowerCase() === 'x', text: match[3] };
  });
  result.next = result.next_step;
  return result;
}

export async function checkTask(root, slug) {
  const filePath = taskPath(root, slug);
  const content = await fs.readFile(filePath, 'utf8');
  for (const sectionName of REQUIRED_SECTIONS) {
    const key = sectionName.toLowerCase().replace(/ /g, '_');
    if (!parseTask(content)[key]) throw new Error(`missing_section:${sectionName}`);
  }
  const task = parseTask(content);
  if (!task.tasks.length) throw new Error('tasks_required');
  const ids = task.tasks.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('task_ids_must_be_unique');
  return { version: ODD_TASK_VERSION, status: 'PASS', slug: slugify(slug), path: filePath, tasks: task.tasks };
}

export async function updateTask(root, slug, patch = {}) {
  const filePath = taskPath(root, slug);
  const content = await fs.readFile(filePath, 'utf8');
  const task = parseTask(content);
  const replacements = { progress: patch.progress, next_step: patch.next ?? patch.next_step, 'verification_evidence': patch.verificationEvidence };
  let updated = content;
  for (const [key, value] of Object.entries(replacements)) {
    if (value === undefined) continue;
    const heading = key.replace(/_/g, ' ');
    const title = heading === 'verification evidence' ? 'Verification evidence' : heading[0].toUpperCase() + heading.slice(1);
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    updated = updated.replace(new RegExp(`(^## ${escaped}\\n)[\\s\\S]*?(?=^## |$)`, 'm'), `$1${String(value).trim()}\n`);
  }
  await fs.writeFile(filePath, updated, 'utf8');
  const result = parseTask(updated);
  return { version: ODD_TASK_VERSION, slug: slugify(slug), path: filePath, ...result, next: result.next_step };
}

export async function resumeTask(root, slug) {
  const filePath = taskPath(root, slug);
  const content = await fs.readFile(filePath, 'utf8');
  const task = parseTask(content);
  await checkTask(root, slug);
  return { version: ODD_TASK_VERSION, slug: slugify(slug), path: filePath, ...task, next: task.next_step };
}
