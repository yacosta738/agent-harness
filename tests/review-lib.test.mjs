import assert from 'node:assert/strict';
import {execFile, execFileSync} from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  watch,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  acknowledgeApproved,
  assessCandidate,
  captureCorrection,
  captureReview,
  materializeCandidate,
  startReview
} from '../adapters/opencode/scripts/review-lib.mjs';
import * as reviewControl from '../adapters/opencode/scripts/review-lib.mjs';

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    env: {...process.env, GIT_AUTHOR_NAME: 'Agent Harness Test',
      GIT_AUTHOR_EMAIL: 'agent-harness@example.invalid',
      GIT_COMMITTER_NAME: 'Agent Harness Test',
      GIT_COMMITTER_EMAIL: 'agent-harness@example.invalid'}
  }).trim();
}

function removeTree(root) {
  if (!existsSync(root)) {
    return;
  }
  const stat = lstatSync(root);
  if (stat.isSymbolicLink()) {
    rmSync(root, {force: true});
    return;
  }
  if (!stat.isDirectory()) {
    chmodSync(root, 0o600);
    rmSync(root, {force: true});
    return;
  }
  chmodSync(root, 0o700);
  for (const entry of readdirSync(root)) {
    removeTree(path.join(root, entry));
  }
  rmSync(root, {recursive: true, force: true});
}

function createSymlinkOrSkip(t, target, link, type = 'file') {
  try {
    symlinkSync(target, link, type);
    return true;
  } catch (error) {
    if (process.platform === 'win32'
        && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) {
      t.skip('Windows symlink privileges are not available');
      return false;
    }
    throw error;
  }
}

function createPullRequestRepository(featurePath = 'src-feature.js') {
  const root = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-'));
  git(root, ['init', '--initial-branch=main']);
  git(root, ['config', 'user.name', 'Agent Harness Test']);
  git(root, ['config', 'user.email', 'agent-harness@example.invalid']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(path.join(root, 'README.md'), 'base\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'base']);

  git(root, ['checkout', '-b', 'feature']);
  writeFileSync(path.join(root, featurePath), 'export const feature = true;\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'feature']);
  const headSha = git(root, ['rev-parse', 'HEAD']);

  git(root, ['checkout', 'main']);
  writeFileSync(path.join(root, 'base-only.txt'), 'base branch update\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'base branch update']);
  const baseSha = git(root, ['rev-parse', 'HEAD']);
  const mergeBaseSha = git(root, ['merge-base', baseSha, headSha]);

  return {root, baseSha, headSha, mergeBaseSha};
}

function waitForFile(file, timeoutMs) {
  return new Promise((resolve, reject) => {
    let timer;
    const watcher = watch(path.dirname(file), (eventType, filename) => {
      if ((!filename || filename.toString() === path.basename(file))
          && existsSync(file)) {
        watcher.close();
        clearTimeout(timer);
        resolve();
      }
    });
    timer = setTimeout(() => {
      watcher.close();
      reject(new Error(`timed out waiting for marker: ${file}`));
    }, timeoutMs);
    if (existsSync(file)) {
      watcher.close();
      clearTimeout(timer);
      resolve();
    }
  });
}

async function captureCandidateReview(root, binding, configHome, findings,
    reviewers) {
  const canonicalFindings = findings.map((finding, index) => ({
    ...finding,
    id: finding.id ?? `finding-${index + 1}`
  }));
  const materialized = await materializeCandidate(root, {
    subjectHash: binding.subjectHash
  });
  return captureReview(root, {
    ...binding,
    configHome,
    candidatePath: materialized.path,
    findings: canonicalFindings,
    reviewers,
    reviewEvidence: reviewers.map((reviewer) => ({
      reviewer,
      subjectHash: binding.subjectHash,
      candidatePath: materialized.path,
      findings: canonicalFindings,
      lenses: ['R1', 'R2', 'R3', 'R4'].map((lens) => ({
        lens,
        outcome: canonicalFindings.some((finding) => finding.lens === lens)
            ? 'FINDING' : 'PASS',
        rationale: canonicalFindings.some((finding) => finding.lens === lens)
            ? 'Recorded a candidate-caused finding under this lens.'
            : 'Reviewed this lens; no finding was recorded.'
      })),
      verdict: canonicalFindings.length === 0 ? 'CLEAN' : 'FINDINGS'
    }))
  });
}

function configureFakePullRequest(root, remote, fakeBin, {baseSha, headSha}) {
  const remoteUrl = 'https://github.com/acme/widget.git';
  execFileSync('git', ['init', '--bare', remote], {encoding: 'utf8'});
  git(root, ['remote', 'add', 'origin', remoteUrl]);
  git(root, ['config', `url.file://${remote}.insteadOf`, remoteUrl]);
  git(root, ['push', 'origin', 'main', 'feature']);
  execFileSync('git', ['--git-dir', remote, 'update-ref',
    'refs/pull/42/head', headSha], {encoding: 'utf8'});

  const fakeGh = path.join(fakeBin, 'gh');
  writeFileSync(fakeGh, [
    '#!/usr/bin/env node',
    'const [group, action] = process.argv.slice(2);',
    'const fs = require("node:fs");',
    'if (group === "auth" && action === "status") process.exit(0);',
    'if (group === "pr" && action === "view") {',
    '  if (process.env.TEST_GH_COUNT_FILE) {',
    '    const countFile = process.env.TEST_GH_COUNT_FILE;',
    '    const count = fs.existsSync(countFile)',
    '        ? Number(fs.readFileSync(countFile, "utf8")) : 0;',
    '    fs.writeFileSync(countFile, String(count + 1));',
    '  }',
    '  if (process.env.TEST_GH_STARTED_FILE',
    '      && !fs.existsSync(process.env.TEST_GH_STARTED_FILE)) {',
    '    fs.writeFileSync(process.env.TEST_GH_STARTED_FILE, "started\\n");',
    '    const gate = new Int32Array(new SharedArrayBuffer(4));',
    '    while (!fs.existsSync(process.env.TEST_GH_RELEASE_FILE)) {',
    '      Atomics.wait(gate, 0, 0, 10);',
    '    }',
    '  }',
    '  if (process.env.TEST_GH_FAIL === "1") process.exit(2);',
    '  if (process.env.TEST_GH_HANG === "1") {',
    '    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);',
    '  }',
    '  process.stdout.write(JSON.stringify({',
    '    url: process.env.TEST_PR_URL,',
    '    number: 42,',
    '    baseRefName: "main",',
    '    baseRefOid: process.env.TEST_BASE_SHA,',
    '    headRefName: "feature",',
    '    headRefOid: process.env.TEST_HEAD_SHA',
    '  }));',
    '  process.exit(0);',
    '}',
    'process.exit(2);',
    ''
  ].join('\n'));
  chmodSync(fakeGh, 0o755);
  const previous = {
    PATH: process.env.PATH,
    TEST_PR_URL: process.env.TEST_PR_URL,
    TEST_BASE_SHA: process.env.TEST_BASE_SHA,
    TEST_HEAD_SHA: process.env.TEST_HEAD_SHA,
    TEST_GH_HANG: process.env.TEST_GH_HANG,
    TEST_GH_FAIL: process.env.TEST_GH_FAIL,
    TEST_GH_STARTED_FILE: process.env.TEST_GH_STARTED_FILE,
    TEST_GH_RELEASE_FILE: process.env.TEST_GH_RELEASE_FILE,
    TEST_GH_COUNT_FILE: process.env.TEST_GH_COUNT_FILE
  };
  process.env.PATH = `${fakeBin}${path.delimiter}${process.env.PATH}`;
  process.env.TEST_PR_URL = 'https://github.com/acme/widget/pull/42';
  process.env.TEST_BASE_SHA = baseSha;
  process.env.TEST_HEAD_SHA = headSha;
  return {
    setOids(nextBaseSha, nextHeadSha) {
      process.env.TEST_BASE_SHA = nextBaseSha;
      process.env.TEST_HEAD_SHA = nextHeadSha;
    },
    setGhFailure(enabled) {
      if (enabled) {
        process.env.TEST_GH_FAIL = '1';
      } else {
        delete process.env.TEST_GH_FAIL;
      }
    },
    setGhHang(enabled) {
      if (enabled) {
        process.env.TEST_GH_HANG = '1';
      } else {
        delete process.env.TEST_GH_HANG;
      }
    },
    setGhGate(startedFile, releaseFile) {
      process.env.TEST_GH_STARTED_FILE = startedFile;
      process.env.TEST_GH_RELEASE_FILE = releaseFile;
    },
    setGhCountFile(countFile) {
      process.env.TEST_GH_COUNT_FILE = countFile;
    },
    restore() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  };
}

function materializationTimeoutRunner(timedCommand) {
  return (command, args, options, run) => {
    const shouldBlock = timedCommand === 'git archive'
        ? command === 'git' && args.includes('archive')
        : command === 'tar' && args[0] === '-xf';
    if (!shouldBlock) {
      return run();
    }
    return execFileSync(process.execPath, ['-e', [
      'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);',
      'process.exit(1);'
    ].join('\n')], options);
  };
}

test('assesses a PR from its merge base to head instead of the local worktree',
    (t) => {
      const {root, baseSha, headSha, mergeBaseSha} =
        createPullRequestRepository();
      t.after(() => removeTree(root));
      const url = 'https://github.com/acme/widget/pull/42';

      const assessment = assessCandidate(root, {
        kind: 'pull-request', url, baseSha, headSha
      });

      assert.deepEqual(assessment.changedPaths, ['src-feature.js']);
      assert.equal(assessment.risk, 'high');
      assert.deepEqual(assessment.candidate, {
        kind: 'pull-request', url, baseSha, headSha, mergeBaseSha
      });
    });

test('ignores Git replace refs when assessing a PR commit', (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  t.after(() => removeTree(root));
  const candidate = {
    kind: 'pull-request',
    url: 'https://github.com/acme/widget/pull/42',
    baseSha,
    headSha
  };
  const original = assessCandidate(root, candidate);
  const baseTree = git(root,
      ['--no-replace-objects', 'rev-parse', `${baseSha}^{tree}`]);
  const replacementSha = execFileSync('git', [
    '-C', root, 'commit-tree', baseTree, '-p', baseSha
  ], {
    encoding: 'utf8',
    input: 'replacement commit with the base tree\n',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Agent Harness Test',
      GIT_AUTHOR_EMAIL: 'agent-harness@example.invalid',
      GIT_COMMITTER_NAME: 'Agent Harness Test',
      GIT_COMMITTER_EMAIL: 'agent-harness@example.invalid'
    }
  }).trim();
  git(root, ['replace', headSha, replacementSha]);

  const assessed = assessCandidate(root, candidate);

  assert.deepEqual(assessed.changedPaths, original.changedPaths);
  assert.equal(assessed.candidateTree, original.candidateTree);
});

test('rejects unknown review candidate kinds instead of falling back to local',
    (t) => {
      const {root} = createPullRequestRepository();
      t.after(() => removeTree(root));

      assert.throws(() => assessCandidate(root, {kind: 'remote-branch'}),
          /candidate_kind_unsupported/);
    });

test('classifies executable GitHub workflow YAML as high risk', (t) => {
  const {root} = createPullRequestRepository();
  t.after(() => removeTree(root));
  mkdirSync(path.join(root, '.github', 'workflows'), {recursive: true});
  writeFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'),
      'name: deploy\non: push\njobs: {}\n');

  assert.equal(assessCandidate(root).risk, 'high');
});

test('classifies agent instructions and task entrypoints as high risk', (t) => {
  for (const candidatePath of [
    'Makefile',
    'Taskfile.yml',
    '.npmrc',
    'commands/review.md',
    'skills/workflow/code-review/SKILL.md'
  ]) {
    const {root} = createPullRequestRepository();
    t.after(() => removeTree(root));
    const file = path.join(root, candidatePath);
    mkdirSync(path.dirname(file), {recursive: true});
    writeFileSync(file, 'changed agent behavior\n');

    assert.equal(assessCandidate(root).risk, 'high', candidatePath);
  }
});

test('preserves the first tracked path in local working-tree assessment', (t) => {
  const {root} = createPullRequestRepository();
  t.after(() => removeTree(root));
  mkdirSync(path.join(root, 'auth'));
  writeFileSync(path.join(root, 'auth', 'config.json'), '{"enabled":false}\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'add auth configuration']);
  writeFileSync(path.join(root, 'auth', 'config.json'), '{"enabled":true}\n');
  writeFileSync(path.join(root, 'source\nfile.mjs'), 'export const value = true;\n');

  const assessment = assessCandidate(root);

  assert.deepEqual(assessment.changedPaths,
      ['auth/config.json', 'source\nfile.mjs']);
  assert.equal(assessment.risk, 'high');
});

test('classifies Node and Windows script changes as high risk', (t) => {
  const {root} = createPullRequestRepository();
  t.after(() => removeTree(root));
  writeFileSync(path.join(root, 'review.mjs'), 'export const review = true;\n');
  writeFileSync(path.join(root, 'deploy.ps1'), 'Write-Output "deploy"\n');

  assert.equal(assessCandidate(root).risk, 'high');
});

test('classifies GitHub composite action definitions as high risk', (t) => {
  const {root} = createPullRequestRepository();
  t.after(() => removeTree(root));
  mkdirSync(path.join(root, '.github', 'actions', 'setup'), {recursive: true});
  writeFileSync(path.join(root, '.github', 'actions', 'setup', 'action.yml'),
      'name: setup\nruns:\n  using: composite\n  steps: []\n');

  assert.equal(assessCandidate(root).risk, 'high');
});

test('classifies infrastructure and database migration files as high risk',
    (t) => {
      const {root} = createPullRequestRepository();
      t.after(() => removeTree(root));
      mkdirSync(path.join(root, 'terraform'));
      mkdirSync(path.join(root, 'k8s'));
      mkdirSync(path.join(root, 'db', 'migrations'), {recursive: true});
      writeFileSync(path.join(root, 'Dockerfile'), 'FROM scratch\n');
      writeFileSync(path.join(root, 'terraform', 'main.tf'), 'resource {}\n');
      writeFileSync(path.join(root, 'k8s', 'deployment.yaml'), 'kind: Deployment\n');
      writeFileSync(path.join(root, 'db', 'migrations', '001.sql'), 'SELECT 1;\n');

      assert.equal(assessCandidate(root).risk, 'high');
    });

test('classifies deployment manifests as high risk', (t) => {
  for (const manifest of ['wrangler.toml', 'wrangler.jsonc', 'vercel.json']) {
    const {root} = createPullRequestRepository();
    t.after(() => removeTree(root));
    writeFileSync(path.join(root, manifest), '{}\n');

    assert.equal(assessCandidate(root).risk, 'high', manifest);
  }
});

test('classifies dependency manifests and lockfiles as high risk', (t) => {
  const {root} = createPullRequestRepository();
  t.after(() => removeTree(root));
  writeFileSync(path.join(root, 'package-lock.json'), '{"lockfileVersion":3}\n');
  writeFileSync(path.join(root, 'Cargo.lock'), 'version = 3\n');
  writeFileSync(path.join(root, 'requirements.txt'), 'trusted-package==1.0\n');

  assert.equal(assessCandidate(root).risk, 'high');
});

test('classifies environment files with potential secrets as high risk', (t) => {
  const {root} = createPullRequestRepository();
  t.after(() => removeTree(root));
  writeFileSync(path.join(root, '.env.production'), 'API_TOKEN=placeholder\n');

  assert.equal(assessCandidate(root).risk, 'high');
});

for (const sensitivePath of [
  '.envrc',
  '.husky/pre-commit',
  '.githooks/pre-commit'
]) {
  test(`classifies ${sensitivePath} as high risk`, (t) => {
    const {root} = createPullRequestRepository();
    t.after(() => removeTree(root));
    const file = path.join(root, sensitivePath);
    mkdirSync(path.dirname(file), {recursive: true});
    writeFileSync(file, 'placeholder\n');

    assert.equal(assessCandidate(root).risk, 'high');
  });
}

test('does not classify requirements text files as passive documentation',
    (t) => {
      const {root} = createPullRequestRepository();
      t.after(() => removeTree(root));
      writeFileSync(path.join(root, 'requirements.txt'),
          'trusted-package==1.0\n');

      assert.equal(assessCandidate(root).risk, 'high');
    });

test('preserves PR filenames that contain newline characters', (t) => {
  const featurePath = 'src\nfeature.js';
  const {root, baseSha, headSha} = createPullRequestRepository(featurePath);
  t.after(() => removeTree(root));

  const assessment = assessCandidate(root, {
    kind: 'pull-request',
    url: 'https://github.com/acme/widget/pull/42',
    baseSha,
    headSha
  });

  assert.deepEqual(assessment.changedPaths, [featurePath]);
});

test('rejects insecure or malformed pull-request URLs', (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  t.after(() => removeTree(root));

  assert.throws(() => assessCandidate(root, {
    kind: 'pull-request',
    url: 'http://github.com/acme/widget/pull/42',
    baseSha,
    headSha
  }), /candidate_pull_request_url_invalid/);
});

test('starts required RDD for an explicit PR target while global mode is disabled',
    async (t) => {
      const {root, baseSha, headSha, mergeBaseSha} =
        createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      const candidate = {
        kind: 'pull-request',
        url: 'https://github.com/acme/widget/pull/42',
        baseSha,
        headSha
      };

      const result = await startReview(root, {
        configHome, required: true, candidate
      });

      assert.equal(result.status, 'reviewing');
      assert.equal(result.risk, 'high');
      assert.deepEqual(result.reviewers, ['lens', 'mirror']);
      assert.deepEqual(result.candidate, {...candidate, mergeBaseSha});
    });

test('prepare-pr resolves GH metadata and fetches exact refs without checkout',
    (t) => {
      const {root, baseSha, headSha, mergeBaseSha} =
        createPullRequestRepository();
      const remote = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-remote-'));
      const fakeBin = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-bin-'));
      t.after(() => {
        removeTree(root);
        removeTree(remote);
        removeTree(fakeBin);
      });
      const remoteUrl = 'https://github.com/acme/widget.git';
      execFileSync('git', ['init', '--bare', remote], {encoding: 'utf8'});
      git(root, ['remote', 'add', 'origin', remoteUrl]);
      git(root, ['config', `url.file://${remote}.insteadOf`, remoteUrl]);
      git(root, ['push', 'origin', 'main', 'feature']);
      execFileSync('git', ['--git-dir', remote, 'update-ref',
        'refs/pull/42/head', headSha], {encoding: 'utf8'});

      const fakeGh = path.join(fakeBin, 'gh');
      writeFileSync(fakeGh, [
        '#!/usr/bin/env node',
        'const [group, action] = process.argv.slice(2);',
        'if (group === "auth" && action === "status") process.exit(0);',
        'if (group === "pr" && action === "view") {',
        '  process.stdout.write(JSON.stringify({',
        '    url: process.env.TEST_PR_URL,',
        '    number: 42,',
        '    baseRefName: "main",',
        '    baseRefOid: process.env.TEST_BASE_SHA,',
        '    headRefName: "feature",',
        '    headRefOid: process.env.TEST_HEAD_SHA',
        '  }));',
        '  process.exit(0);',
        '}',
        'process.exit(2);',
        ''
      ].join('\n'));
      chmodSync(fakeGh, 0o755);
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => removeTree(configHome));
      const reviewScript = fileURLToPath(new URL(
          '../adapters/opencode/scripts/review.mjs', import.meta.url));
      const branchBefore = git(root, ['rev-parse', 'HEAD']);
      const env = {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
        TEST_PR_URL: 'https://github.com/acme/widget/pull/42',
        TEST_BASE_SHA: baseSha,
        TEST_HEAD_SHA: headSha
      };
      const output = execFileSync(process.execPath, [
        reviewScript, 'prepare-pr', '--cwd', root,
        '--pr-url', 'https://github.com/acme/widget/pull/42'
      ], {
        encoding: 'utf8',
        env
      });

      const result = JSON.parse(output);
      assert.equal(result.candidate.kind, 'pull-request');
      assert.equal(result.candidate.baseSha, baseSha);
      assert.equal(result.candidate.headSha, headSha);
      assert.equal(result.candidate.mergeBaseSha, mergeBaseSha);
      assert.deepEqual(result.changedPaths, ['src-feature.js']);
      assert.equal(git(root, ['rev-parse', 'HEAD']), branchBefore);
      assert.equal(git(root, ['status', '--porcelain']), '');

      const started = JSON.parse(execFileSync(process.execPath, [
        reviewScript, 'start', '--cwd', root, '--config-home', configHome,
        '--required', '--pr-url', 'https://github.com/acme/widget/pull/42'
      ], {encoding: 'utf8', env}));
      assert.equal(started.status, 'reviewing');
      assert.deepEqual(started.candidate, result.candidate);
      assert.deepEqual(started.changedPaths, ['src-feature.js']);
    });

test('does not match an HTTP GitHub remote to a PR URL', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  git(root, ['remote', 'set-url', 'origin', 'http://github.com/acme/widget.git']);
  git(root, ['config', '--add', `url.file://${remote}.insteadOf`,
    'http://github.com/acme/widget.git']);

  await assert.rejects(() => reviewControl.resolvePullRequestCandidate(root,
      'https://github.com/acme/widget/pull/42'),
  /pull_request_base_remote_not_found/);
});

test('concurrent starts bind to one RDD lineage', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');

  const results = await Promise.allSettled([
    startReview(root, {configHome, required: true}),
    startReview(root, {configHome, required: true})
  ]);
  const started = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');
  assert.ok(started.length >= 1);
  assert.ok(started.every((result) =>
    result.value.binding.lineage === started[0].value.binding.lineage));
  assert.ok(rejected.every((result) =>
    result.reason.message === 'review_transaction_busy'));
});

test('serializes competing recovery of a stale transaction lock', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');
  const stateDirectory = path.join(root, '.git', 'agent-harness-review');
  mkdirSync(stateDirectory, {recursive: true});
  writeFileSync(path.join(stateDirectory, 'transaction.json.lock'),
      JSON.stringify({pid: 2147483647, startedAt: '2020-01-01T00:00:00Z'}));

  const results = await Promise.allSettled([
    startReview(root, {configHome, required: true}),
    startReview(root, {configHome, required: true})
  ]);
  const started = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.ok(started.length >= 1);
  assert.ok(started.every((result) =>
    result.value.binding.lineage === started[0].value.binding.lineage));
  assert.ok(rejected.every((result) =>
    result.reason.message === 'review_transaction_busy'));
});

test('recovers a stale lock when the operating system reused its PID', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');
  const stateDirectory = path.join(root, '.git', 'agent-harness-review');
  mkdirSync(stateDirectory, {recursive: true});
  writeFileSync(path.join(stateDirectory, 'transaction.json.lock'),
      JSON.stringify({
        pid: process.pid,
        processStartIdentity: 'stale-process-identity',
        startedAt: '2020-01-01T00:00:00Z'
      }));

  const started = await startReview(root, {configHome, required: true});

  assert.equal(started.status, 'reviewing');
});

test('serializes competing review captures for one RDD binding', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');
  const started = await startReview(root, {configHome, required: true});
  const materialized = await materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  });
  const reviewEvidence = started.reviewers.map((reviewer) => ({
    reviewer,
    subjectHash: started.binding.subjectHash,
    candidatePath: materialized.path,
    verdict: 'CLEAN',
    findings: [],
    lenses: ['R1', 'R2', 'R3', 'R4'].map((lens) => ({
      lens,
      outcome: 'PASS',
      rationale: `Reviewed ${lens}; no finding.`
    }))
  }));
  const capture = () => captureReview(root, {
    ...started.binding,
    configHome,
    candidatePath: materialized.path,
    findings: [],
    reviewers: started.reviewers,
    reviewEvidence
  });

  const results = await Promise.allSettled([
    capture(),
    capture()
  ]);
  const captured = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.equal(captured.length, 1);
  assert.equal(captured[0].value.status, 'approved');
  assert.equal(rejected.length, 1);
  assert.ok(['review_transaction_busy', 'transition_not_allowed'].includes(
      rejected[0].reason.message));
});

test('CLI defaults to the current working tree when no PR URL is provided',
    (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const reviewScript = fileURLToPath(new URL(
          '../adapters/opencode/scripts/review.mjs', import.meta.url));
      const output = execFileSync(process.execPath, [
        reviewScript, 'start', '--cwd', root, '--config-home', configHome,
        '--required'
      ], {encoding: 'utf8'});

      const result = JSON.parse(output);
      assert.equal(result.status, 'reviewing');
      assert.equal(result.risk, 'high');
      assert.deepEqual(result.candidate, {kind: 'working-tree'});
    });

test('rejects local start when staged and unstaged versions of one path differ',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      mkdirSync(path.join(root, 'auth'));
      writeFileSync(path.join(root, 'auth', 'config.json'), '{"mode":"base"}\n');
      git(root, ['add', '-A']);
      git(root, ['commit', '-m', 'add auth configuration']);
      writeFileSync(path.join(root, 'auth', 'config.json'), '{"mode":"staged"}\n');
      git(root, ['add', 'auth/config.json']);
      writeFileSync(path.join(root, 'auth', 'config.json'), '{"mode":"worktree"}\n');

      await assert.rejects(() => startReview(root, {
        configHome, required: true
      }), /candidate_staged_worktree_conflict/);
    });

test('times out a blocked Git clean filter and releases the review lock',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const releaseMarker = path.join(root, 'release-clean-filter');
      const finishedMarker = path.join(root, 'clean-filter-finished');
      const filterScript = path.join(root, 'blocked-clean-filter.mjs');
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, '.gitattributes'),
          'blocked.txt filter=blocked-clean\n');
      writeFileSync(path.join(root, 'blocked.txt'), 'filter this file\n');
      writeFileSync(filterScript, [
        'import {existsSync, readFileSync, writeFileSync} from "node:fs";',
        'const [releaseMarker, finishedMarker] = process.argv.slice(2);',
        'const gate = new Int32Array(new SharedArrayBuffer(4));',
        'while (!existsSync(releaseMarker)) Atomics.wait(gate, 0, 0, 5);',
        'const input = readFileSync(0);',
        'writeFileSync(finishedMarker, "finished\\n");',
        'process.stdout.write(input);',
        ''
      ].join('\n'));
      git(root, ['config', 'filter.blocked-clean.clean', [
        process.execPath,
        JSON.stringify(filterScript),
        JSON.stringify(releaseMarker),
        JSON.stringify(finishedMarker)
      ].join(' ')]);
      const indexPrefix = `agent-harness-review-${process.pid}-`;
      const indexesBefore = new Set(readdirSync(os.tmpdir()).filter((entry) =>
        entry.startsWith(indexPrefix) && entry.endsWith('.index')));
      const releaseProcess = new Promise((resolve, reject) => {
        execFile(process.execPath, ['-e', [
          'const {writeFileSync} = require("node:fs");',
          `setTimeout(() => writeFileSync(${JSON.stringify(releaseMarker)}, "release\\n"), 250);`
        ].join('\n')], {cwd: root}, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      await assert.rejects(() => startReview(root, {
        configHome, required: true
      }, {gitAddTimeoutMs: 80}), (error) => error.code === 'ETIMEDOUT');

      await releaseProcess;
      await waitForFile(finishedMarker, 2000);
      const indexesAfter = readdirSync(os.tmpdir()).filter((entry) =>
        entry.startsWith(indexPrefix) && entry.endsWith('.index'));
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      assert.deepEqual(indexesAfter.filter((entry) => !indexesBefore.has(entry)),
          []);
      assert.equal(existsSync(`${stateFile}.lock`), false);

      git(root, ['config', 'filter.blocked-clean.clean', 'cat']);
      const retried = await startReview(root, {
        configHome, required: true
      }, {gitAddTimeoutMs: 80});
      assert.equal(retried.status, 'reviewing');
      assert.equal(existsSync(`${stateFile}.lock`), false);
    });

test('mandatory local review reaches burned only with the exact approval token',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});
      const captured = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'WARNING', lens: 'R1',
            file: 'local-change.js', description: 'A non-blocking warning.'}],
          ['lens', 'mirror']);
      assert.equal(captured.status, 'approved');
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const approvedReceipt = JSON.parse(readFileSync(stateFile, 'utf8'));

      const burned = await acknowledgeApproved(root, {
        ...captured.binding,
        acknowledgement: captured.next_transition.token,
        configHome
      });

      assert.equal(burned.status, 'burned');
      const historyDirectory = path.join(path.dirname(stateFile), 'history');
      const historyFile = path.join(historyDirectory,
          `${approvedReceipt.lineage}-${approvedReceipt.revision}-approved.json`);
      assert.equal(existsSync(historyFile), true);
      const archivedReceipt = JSON.parse(readFileSync(historyFile, 'utf8'));
      assert.equal(archivedReceipt.status, 'approved');
      assert.equal(archivedReceipt.lineage, approvedReceipt.lineage);
      assert.equal(archivedReceipt.revision, approvedReceipt.revision);
      assert.equal(archivedReceipt.subjectHash, approvedReceipt.subjectHash);
      assert.deepEqual(archivedReceipt.candidate, approvedReceipt.candidate);
      assert.equal(archivedReceipt.candidateTree, approvedReceipt.candidateTree);
      assert.deepEqual(archivedReceipt.findings, approvedReceipt.findings);
      assert.deepEqual(archivedReceipt.reviewerEvidence,
          approvedReceipt.reviewerEvidence);
      assert.equal(Object.hasOwn(archivedReceipt, 'next_transition'), false);
      assert.equal(Object.hasOwn(archivedReceipt, 'recovery_transition'), false);
      assert.ok(Number.isFinite(Date.parse(archivedReceipt.acknowledgedAt)));
      assert.equal(existsSync(stateFile), false);
      assert.equal(existsSync(path.join(root, '.git', 'agent-harness-review',
          'candidates', started.binding.subjectHash)), false);
    });

test('approved acknowledgement rejects a symlinked history directory',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const outsideHistory = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-external-history-'));
      const outsideFile = path.join(outsideHistory, 'keep.txt');
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
        removeTree(outsideHistory);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      writeFileSync(outsideFile, 'external history stays intact\n');
      const started = await startReview(root, {configHome, required: true});
      const captured = await captureCandidateReview(root, started.binding,
          configHome, [], started.reviewers);
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const historyDirectory = path.join(path.dirname(stateFile), 'history');
      if (!createSymlinkOrSkip(t, outsideHistory, historyDirectory, 'dir')) {
        return;
      }

      await assert.rejects(() => acknowledgeApproved(root, {
        ...captured.binding,
        configHome,
        acknowledgement: captured.next_transition.token
      }), /review_history_path_invalid/);

      assert.equal(readFileSync(outsideFile, 'utf8'),
          'external history stays intact\n');
      assert.equal(existsSync(stateFile), true);
    });

test('approved acknowledgement rejects a symlinked history receipt',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const outsideHistory = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-external-history-'));
      const outsideFile = path.join(outsideHistory, 'keep.json');
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
        removeTree(outsideHistory);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      writeFileSync(outsideFile, 'external receipt stays intact\n');
      const started = await startReview(root, {configHome, required: true});
      const captured = await captureCandidateReview(root, started.binding,
          configHome, [], started.reviewers);
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      const historyDirectory = path.join(path.dirname(stateFile), 'history');
      mkdirSync(historyDirectory);
      const historyPath = path.join(historyDirectory,
          `${state.lineage}-${state.revision}-approved.json`);
      if (!createSymlinkOrSkip(t, outsideFile, historyPath)) {
        return;
      }

      await assert.rejects(() => acknowledgeApproved(root, {
        ...captured.binding,
        configHome,
        acknowledgement: captured.next_transition.token
      }), /review_history_path_invalid/);

      assert.equal(readFileSync(outsideFile, 'utf8'),
          'external receipt stays intact\n');
      assert.equal(existsSync(stateFile), true);
    });

test('candidate cleanup refuses a storage root replaced by a symlink', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const outsideRoot = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-external-candidates-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
    removeTree(outsideRoot);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');
  const started = await startReview(root, {configHome, required: true});
  const captured = await captureCandidateReview(root, started.binding,
      configHome, [], started.reviewers);
  const stateDirectory = path.join(root, '.git', 'agent-harness-review');
  const candidatesDirectory = path.join(stateDirectory, 'candidates');
  const archivedCandidatesDirectory = path.join(stateDirectory,
      'candidates-original');
  renameSync(candidatesDirectory, archivedCandidatesDirectory);
  mkdirSync(path.join(outsideRoot, started.binding.subjectHash));
  writeFileSync(path.join(outsideRoot, started.binding.subjectHash, 'keep.txt'),
      'keep outside data\n');
  symlinkSync(outsideRoot, candidatesDirectory, 'dir');

  const cleanupPending = await acknowledgeApproved(root, {
    ...captured.binding,
    acknowledgement: captured.next_transition.token,
    configHome
  });

  assert.equal(cleanupPending.status, 'cleanup_pending');
  assert.equal(existsSync(path.join(outsideRoot, started.binding.subjectHash,
      'keep.txt')), true);
  rmSync(candidatesDirectory, {force: true});
  renameSync(archivedCandidatesDirectory, candidatesDirectory);
  const burned = await acknowledgeApproved(root, {
    ...captured.binding,
    acknowledgement: captured.next_transition.token,
    configHome
  });
  assert.equal(burned.status, 'burned');
});

test('rejects RDD state directory and file symlinks outside the Git directory',
    async (t) => {
      const directoryCase = createPullRequestRepository();
      const fileCase = createPullRequestRepository();
      const directoryConfig = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const fileConfig = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const outsideDirectory = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-external-rdd-state-'));
      const outsideFile = path.join(os.tmpdir(),
          `agent-harness-external-rdd-state-${process.pid}.json`);
      t.after(() => {
        removeTree(directoryCase.root);
        removeTree(fileCase.root);
        removeTree(directoryConfig);
        removeTree(fileConfig);
        removeTree(outsideDirectory);
        removeTree(outsideFile);
      });
      writeFileSync(path.join(directoryCase.root, 'local-change.js'),
          'export const localChange = true;\n');
      writeFileSync(path.join(fileCase.root, 'local-change.js'),
          'export const localChange = true;\n');
      await startReview(directoryCase.root, {
        configHome: directoryConfig, required: true
      });
      await startReview(fileCase.root, {configHome: fileConfig, required: true});

      const directoryPath = path.join(directoryCase.root, '.git',
          'agent-harness-review');
      const archivedDirectory = `${directoryPath}-original`;
      const outsideState = path.join(outsideDirectory, 'transaction.json');
      writeFileSync(outsideState, '{}\n');
      renameSync(directoryPath, archivedDirectory);
      if (!createSymlinkOrSkip(t, outsideDirectory, directoryPath, 'dir')) {
        return;
      }

      await assert.rejects(() => startReview(directoryCase.root, {
        configHome: directoryConfig, required: true
      }), /review_state_path_invalid/);
      assert.equal(readFileSync(outsideState, 'utf8'), '{}\n');

      const fileState = path.join(fileCase.root, '.git',
          'agent-harness-review', 'transaction.json');
      writeFileSync(outsideFile, '{}\n');
      rmSync(fileState);
      if (!createSymlinkOrSkip(t, outsideFile, fileState, 'file')) {
        return;
      }

      await assert.rejects(() => reviewControl.reviewStatus(fileCase.root),
          /review_state_path_invalid/);
      assert.equal(readFileSync(outsideFile, 'utf8'), '{}\n');
    });

test('does not follow the former predictable state temporary-file symlink',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const outsideDirectory = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-external-temp-'));
      const outsideFile = path.join(outsideDirectory, 'keep.txt');
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
        removeTree(outsideDirectory);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      writeFileSync(outsideFile, 'outside data must stay intact\n');
      const stateDirectory = path.join(root, '.git', 'agent-harness-review');
      mkdirSync(stateDirectory);
      const stateFile = path.join(stateDirectory, 'transaction.json');
      const oldTemporaryPath = `${stateFile}.${process.pid}.tmp`;
      if (!createSymlinkOrSkip(t, outsideFile, oldTemporaryPath)) {
        return;
      }

      const started = await startReview(root, {configHome, required: true});

      assert.equal(started.status, 'reviewing');
      assert.equal(readFileSync(outsideFile, 'utf8'),
          'outside data must stay intact\n');
      assert.equal(existsSync(stateFile), true);
    });

test('stores state and closed history receipts with private Unix modes',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');

      const started = await startReview(root, {configHome, required: true});
      const stateDirectory = path.join(root, '.git', 'agent-harness-review');
      const stateFile = path.join(stateDirectory, 'transaction.json');
      if (process.platform !== 'win32') {
        assert.equal(statSync(stateDirectory).mode & 0o777, 0o700);
        assert.equal(statSync(stateFile).mode & 0o777, 0o600);
      }
      const closed = await reviewControl.closeReview(root, {
        ...started.binding,
        configHome,
        recoveryToken: started.recovery_transition.token,
        resolution: 'User deferred this review.'
      });

      assert.equal(closed.status, 'closed_without_approval');
      if (process.platform !== 'win32') {
        assert.equal(statSync(path.join(stateDirectory, 'history')).mode & 0o777,
            0o700);
        assert.equal(statSync(closed.historyPath).mode & 0o777, 0o600);
      }
    });

test('review CLI captures bound 4R evidence and acknowledges the exact token',
    (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const reviewScript = fileURLToPath(new URL(
          '../adapters/opencode/scripts/review.mjs', import.meta.url));
      const run = (command, args = []) => JSON.parse(execFileSync(
          process.execPath,
          [reviewScript, command, '--cwd', root, '--config-home', configHome,
            ...args],
          {encoding: 'utf8'}));
      const started = run('start', ['--required']);
      const materialized = run('materialize', [
        '--subject-hash', started.binding.subjectHash
      ]);
      const reviewers = started.reviewers;
      const reviewEvidence = reviewers.map((reviewer) => ({
        reviewer,
        subjectHash: started.binding.subjectHash,
        candidatePath: materialized.path,
        verdict: 'CLEAN',
        findings: [],
        lenses: ['R1', 'R2', 'R3', 'R4'].map((lens) => ({
          lens,
          outcome: 'PASS',
          rationale: `Reviewed ${lens}; no finding.`
        }))
      }));
      const captured = run('capture', [
        '--lineage', started.binding.lineage,
        '--revision', String(started.binding.revision),
        '--target', started.binding.target,
        '--subject-hash', started.binding.subjectHash,
        '--candidate-path', materialized.path,
        '--findings', '[]',
        '--reviewers', reviewers.join(','),
        '--review-evidence', JSON.stringify(reviewEvidence)
      ]);
      const burned = run('acknowledge-approved', [
        '--lineage', captured.binding.lineage,
        '--revision', String(captured.binding.revision),
        '--target', captured.binding.target,
        '--subject-hash', captured.binding.subjectHash,
        '--acknowledgement', captured.next_transition.token
      ]);

      assert.equal(captured.status, 'approved');
      assert.equal(burned.status, 'burned');
    });

test('requires bound 4R evidence from each assigned reviewer before capture',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});
      const materialized = await materializeCandidate(root, {
        subjectHash: started.binding.subjectHash
      });

      await assert.rejects(() => captureReview(root, {
        ...started.binding,
        configHome,
        candidatePath: materialized.path,
        findings: [],
        reviewers: started.reviewers
      }), /review_evidence_incomplete/);

      const unsubstantiatedEvidence = started.reviewers.map((reviewer) => ({
        reviewer,
        subjectHash: started.binding.subjectHash,
        candidatePath: materialized.path,
        lenses: ['R1', 'R2', 'R3', 'R4'],
        verdict: 'CLEAN'
      }));
      await assert.rejects(() => captureReview(root, {
        ...started.binding,
        configHome,
        candidatePath: materialized.path,
        findings: [],
        reviewers: started.reviewers,
        reviewEvidence: unsubstantiatedEvidence
      }), /review_evidence_incomplete/);
    });

test('rejects a critical finding without explicit candidate attribution',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});

      await assert.rejects(() => captureCandidateReview(root, started.binding,
          configHome, [{
            lens: 'R1', severity: 'CRITICAL', file: 'local-change.js',
            description: 'Critical unsafe behavior.'
          }], ['lens', 'mirror']), /review_finding_invalid/);
    });

test('accepts a warning severity emitted by the review prompts', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');
  const started = await startReview(root, {configHome, required: true});

  const captured = await captureCandidateReview(root, started.binding,
      configHome, [{candidateCaused: true, severity: 'WARNING (real)',
        lens: 'R1', file: 'local-change.js',
        description: 'Normal use can trigger this warning.'}],
      started.reviewers);

  assert.equal(captured.status, 'approved');
});

test('captures general WARNING findings through the approval transition',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});
      const materialized = await materializeCandidate(root, {
        subjectHash: started.binding.subjectHash
      });
      const finding = {
        id: 'R1-warning',
        lens: 'R1',
        severity: ' warning ',
        candidateCaused: true,
        file: 'local-change.js',
        description: 'Normal use can trigger this warning.'
      };
      const reviewEvidence = started.reviewers.map((reviewer) => ({
        reviewer,
        subjectHash: started.binding.subjectHash,
        candidatePath: materialized.path,
        verdict: 'FINDINGS',
        findings: [{...finding, severity: 'WARNING'}],
        lenses: ['R1', 'R2', 'R3', 'R4'].map((lens) => ({
          lens,
          outcome: lens === 'R1' ? 'FINDING' : 'PASS',
          rationale: lens === 'R1'
              ? 'Recorded a general warning.' : 'No finding under this lens.'
        }))
      }));

      const captured = await captureReview(root, {
        ...started.binding,
        configHome,
        candidatePath: materialized.path,
        findings: [finding],
        reviewers: started.reviewers,
        reviewEvidence
      });

      assert.equal(captured.status, 'approved');
      assert.equal(captured.next_transition.action, 'acknowledge-approved');
    });

test('captures P1 findings and starts the correction transition', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');
  const started = await startReview(root, {configHome, required: true});

  const captured = await captureCandidateReview(root, started.binding,
      configHome, [{candidateCaused: true, severity: ' p1 ', lens: 'R1',
        file: 'local-change.js', description: 'Critical behavior needs a fix.'}],
      started.reviewers);

  assert.equal(captured.status, 'correction_pending');
  assert.equal(captured.next_transition.action, 'capture-correction');
});

test('rejects findings whose severity differs from reviewer evidence', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');
  const started = await startReview(root, {configHome, required: true});
  const materialized = await materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  });
  const reviewerFinding = {
    id: 'R1-1',
    lens: 'R1',
    severity: 'CRITICAL',
    candidateCaused: true,
    file: 'local-change.js',
    description: 'Unsafe behavior.'
  };
  const evidence = started.reviewers.map((reviewer) => ({
    reviewer,
    subjectHash: started.binding.subjectHash,
    candidatePath: materialized.path,
    verdict: 'FINDINGS',
    findings: [{...reviewerFinding}],
    lenses: ['R1', 'R2', 'R3', 'R4'].map((lens) => ({
      lens,
      outcome: lens === 'R1' ? 'FINDING' : 'PASS',
      rationale: lens === 'R1' ? 'Found a critical risk.' : 'No finding.'
    }))
  }));

  await assert.rejects(() => captureReview(root, {
    ...started.binding,
    configHome,
    candidatePath: materialized.path,
    findings: [{...reviewerFinding, severity: 'SUGGESTION'}],
    reviewers: started.reviewers,
    reviewEvidence: evidence
  }), /review_evidence_findings_mismatch/);
});

test('materializes the PR head tree even when the local worktree is on base',
    async (t) => {
      const {root, baseSha, headSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      const candidate = {
        kind: 'pull-request',
        url: 'https://github.com/acme/widget/pull/42',
        baseSha,
        headSha
      };
      const started = await startReview(root, {
        configHome, required: true, candidate
      });

      const materialized = await materializeCandidate(root, {
        subjectHash: started.binding.subjectHash
      });
      const replayed = await materializeCandidate(root, {
        subjectHash: started.binding.subjectHash
      });

      assert.equal(materialized.readOnly, true);
      assert.equal(replayed.path, materialized.path);
      assert.equal(existsSync(path.join(materialized.path, 'src-feature.js')), true);
      assert.equal(existsSync(path.join(materialized.path, 'base-only.txt')), false);
       assert.equal(readFileSync(path.join(materialized.path, 'README.md'), 'utf8'),
           'base\n');
    });

for (const command of ['git archive', 'tar -xf']) {
  test(`times out ${command} and removes staging while releasing the lock`,
      async (t) => {
        const {root, baseSha, headSha} = createPullRequestRepository();
        const configHome = mkdtempSync(
            path.join(os.tmpdir(), 'agent-harness-review-config-'));
        t.after(() => {
          removeTree(root);
          removeTree(configHome);
        });
        const started = await startReview(root, {
          configHome,
          required: true,
          candidate: {
            kind: 'pull-request',
            url: 'https://github.com/acme/widget/pull/42',
            baseSha,
            headSha
          }
        });
        await assert.rejects(() => materializeCandidate(root, {
          subjectHash: started.binding.subjectHash
        }, {
          archiveTimeoutMs: 30,
          tarTimeoutMs: 30,
          commandRunner: materializationTimeoutRunner(command)
        }), (error) => error.code === 'ETIMEDOUT');

        const stateFile = path.join(root, '.git', 'agent-harness-review',
            'transaction.json');
        const candidatesDirectory = path.join(path.dirname(stateFile),
            'candidates');
        assert.equal(existsSync(`${stateFile}.lock`), false);
        assert.equal(existsSync(stateFile), true);
        assert.deepEqual(readdirSync(candidatesDirectory).filter((entry) =>
          entry.startsWith(`${started.binding.subjectHash}.staging-`)), []);
      });
}

test('rejects an existing candidate snapshot symlink without changing its target',
    async (t) => {
      const {root, baseSha, headSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const outsideRoot = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-external-snapshot-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
        removeTree(outsideRoot);
      });
      const started = await startReview(root, {
        configHome,
        required: true,
        candidate: {
          kind: 'pull-request',
          url: 'https://github.com/acme/widget/pull/42',
          baseSha,
          headSha
        }
      });
      const materialized = await materializeCandidate(root, {
        subjectHash: started.binding.subjectHash
      });
      const externalSnapshot = path.join(outsideRoot, 'snapshot');
      chmodSync(materialized.path, 0o755);
      renameSync(materialized.path, externalSnapshot);
      chmodSync(externalSnapshot, 0o555);
      const externalReadme = path.join(externalSnapshot, 'README.md');
      const originalContent = readFileSync(externalReadme, 'utf8');
      const originalMode = statSync(externalReadme).mode;
      if (!createSymlinkOrSkip(t, externalSnapshot, materialized.path, 'dir')) {
        return;
      }

      await assert.rejects(() => materializeCandidate(root, {
        subjectHash: started.binding.subjectHash
      }), /candidate_snapshot_path_invalid/);

      assert.equal(readFileSync(externalReadme, 'utf8'), originalContent);
      assert.equal(statSync(externalReadme).mode, originalMode);
    });

test('retries materialization after cleaning an interrupted staging copy', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });
  const candidatesDirectory = path.join(root, '.git', 'agent-harness-review',
      'candidates');
  mkdirSync(candidatesDirectory, {recursive: true});
  const interrupted = path.join(candidatesDirectory,
      `${started.binding.subjectHash}.staging-interrupted`);
  mkdirSync(interrupted);
  writeFileSync(path.join(interrupted, 'partial.txt'), 'partial\n');

  const materialized = await materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  });

  assert.equal(existsSync(path.join(materialized.path, 'src-feature.js')), true);
  assert.deepEqual(readdirSync(candidatesDirectory).filter((entry) =>
    entry.startsWith(`${started.binding.subjectHash}.staging-`)), []);
});

test('materializes tracked files marked export-ignore in the PR tree', async (t) => {
  const {root, baseSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  git(root, ['checkout', 'feature']);
  writeFileSync(path.join(root, '.gitattributes'),
      'src-feature.js export-ignore\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'mark source file export-ignore']);
  const headSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', 'main']);
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });

  const materialized = await materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  });

  assert.equal(existsSync(path.join(materialized.path, 'src-feature.js')), true);
});

test('materializes exact Git blob bytes when attributes alter checkout line endings',
    async (t) => {
      const {root, baseSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      git(root, ['checkout', 'feature']);
      writeFileSync(path.join(root, '.gitattributes'),
          'src-feature.js text eol=crlf\n');
      git(root, ['add', '-A']);
      git(root, ['commit', '-m', 'set checkout line endings']);
      const headSha = git(root, ['rev-parse', 'HEAD']);
      git(root, ['checkout', 'main']);
      const started = await startReview(root, {
        configHome,
        required: true,
        candidate: {
          kind: 'pull-request',
          url: 'https://github.com/acme/widget/pull/42',
          baseSha,
          headSha
        }
      });

      const materialized = await materializeCandidate(root, {
        subjectHash: started.binding.subjectHash
      });

      assert.equal(readFileSync(path.join(materialized.path, 'src-feature.js'),
          'utf8'), 'export const feature = true;\n');
    });

test('rejects a read-only candidate directory whose content changed', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });
  const materialized = await materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  });
  const readme = path.join(materialized.path, 'README.md');
  chmodSync(readme, 0o644);
  writeFileSync(readme, 'tampered candidate\n');
  chmodSync(readme, 0o444);

  await assert.rejects(() => materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  }), /candidate_materialization_mismatch/);
  const reviewers = ['lens', 'mirror'];
  const reviewEvidence = reviewers.map((reviewer) => ({
    reviewer,
    subjectHash: started.binding.subjectHash,
    candidatePath: materialized.path,
    verdict: 'CLEAN',
    findings: [],
    lenses: ['R1', 'R2', 'R3', 'R4'].map((lens) => ({
      lens,
      outcome: 'PASS',
      rationale: 'Reviewed this lens; no finding was recorded.'
    }))
  }));
  await assert.rejects(() => captureReview(root, {
    ...started.binding,
    configHome,
    candidatePath: materialized.path,
    findings: [],
    reviewers,
    reviewEvidence
  }), /candidate_materialization_mismatch/);
});

test('rejects materialization destinations inside the live worktree', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });

  await assert.rejects(() => materializeCandidate(root, {
    subjectHash: started.binding.subjectHash,
    destination: path.join(root, 'review-output')
  }), /destination_path_traversal/);
  await assert.rejects(() => materializeCandidate(root, {
    subjectHash: started.binding.subjectHash,
    destination: path.join(root, '.git', 'agent-harness-review', 'candidates',
        'alternate-name')
  }), /destination_path_traversal/);
});

test('blocks a PR symlink that escapes the immutable review candidate', async (t) => {
  const {root, baseSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const outsideFile = path.join(os.tmpdir(), `review-outside-${process.pid}.txt`);
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
    removeTree(outsideFile);
  });
  writeFileSync(outsideFile, 'must remain writable\n');
  chmodSync(outsideFile, 0o644);
  git(root, ['checkout', 'feature']);
  mkdirSync(path.join(root, 'alpha-directory'));
  writeFileSync(path.join(root, 'alpha-directory', 'inside.txt'), 'inside\n');
  if (!createSymlinkOrSkip(t, outsideFile,
      path.join(root, 'z-external-link.txt'), 'file')) {
    return;
  }
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'add external symlink']);
  const headSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', 'main']);
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });

  await assert.rejects(() => materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  }), /candidate_symlink_escapes_tree/);
  assert.notEqual(statSync(outsideFile).mode & 0o222, 0);
  assert.equal(existsSync(path.join(root, '.git', 'agent-harness-review',
      'candidates', started.binding.subjectHash)), false);
});

test('resolves intermediate symlinks before checking parent traversal', async (t) => {
  const {root, baseSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const outsideFile = path.join(path.dirname(root),
      `review-outside-${process.pid}.txt`);
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
    removeTree(outsideFile);
  });
  git(root, ['checkout', 'feature']);
  writeFileSync(outsideFile, 'outside candidate root\n');
  if (!createSymlinkOrSkip(t, '.', path.join(root, 'alpha-link'), 'dir')
      || !createSymlinkOrSkip(t,
          `alpha-link/../${path.basename(outsideFile)}`,
          path.join(root, 'z-indirect-link'), 'file')) {
    return;
  }
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'add indirect symlink escape']);
  const headSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', 'main']);
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });

  await assert.rejects(() => materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  }), /candidate_symlink_(escapes_tree|cycle)/);
});

test('rejects a directory symlink that loops to its parent', async (t) => {
  const {root, baseSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  git(root, ['checkout', 'feature']);
  if (!createSymlinkOrSkip(t, '.', path.join(root, 'directory-loop'), 'dir')) {
    return;
  }
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'add directory symlink loop']);
  const headSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', 'main']);
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });

  await assert.rejects(() => materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  }), /candidate_symlink_cycle/);
});

test('rejects Windows path aliases before extracting candidate entries', () => {
  assert.equal(typeof reviewControl.validateCandidateTreePaths, 'function');
  for (const candidatePath of [
    '..\\outside.txt',
    'folder\\..\\outside.txt',
    'C:outside.txt',
    'CON.txt'
  ]) {
    assert.throws(() => reviewControl.validateCandidateTreePaths([
      {path: candidatePath}
    ], 'C:\\review-candidate', 'win32'),
    /candidate_path_unsupported_on_windows/);
  }
  assert.throws(() => reviewControl.validateCandidateTreePaths([
    {path: 'Foo/first.txt'},
    {path: 'foo/second.txt'}
  ], 'C:\\review-candidate', 'win32'),
  /candidate_path_collision_on_windows/);
});

test('infers Windows directory link type when target files are archive-ignored',
    () => {
      assert.equal(typeof reviewControl.candidateSymlinkType, 'function');
      const entries = [
        {path: 'docs/current', mode: '120000'},
        // git ls-tree includes this path even when git archive excludes the blob.
        {path: 'docs/releases/README.md', mode: '100644'}
      ];

      assert.equal(reviewControl.candidateSymlinkType(
          'docs/current', 'releases', entries, 'win32'), 'dir');
      assert.equal(reviewControl.candidateSymlinkType(
          'docs/current', '../README.md', [
            {path: 'README.md', mode: '100644'}
          ], 'win32'), 'file');
    });

test('rejects a cycle between symlinked sibling directories', async (t) => {
  const {root, baseSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  git(root, ['checkout', 'feature']);
  mkdirSync(path.join(root, 'a'));
  mkdirSync(path.join(root, 'b'));
  writeFileSync(path.join(root, 'a', 'file.txt'), 'a\n');
  writeFileSync(path.join(root, 'b', 'file.txt'), 'b\n');
  if (!createSymlinkOrSkip(t, '../b', path.join(root, 'a', 'back'), 'dir')
      || !createSymlinkOrSkip(t, '../a', path.join(root, 'b', 'back'), 'dir')) {
    return;
  }
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'add sibling symlink cycle']);
  const headSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', 'main']);
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });

  await assert.rejects(() => materializeCandidate(root, {
    subjectHash: started.binding.subjectHash
  }), /candidate_symlink_cycle/);
});

test('allows an internal symlink to a sibling directory without a cycle',
    async (t) => {
      const {root, baseSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      git(root, ['checkout', 'feature']);
      mkdirSync(path.join(root, 'docs', 'releases'), {recursive: true});
      writeFileSync(path.join(root, 'docs', 'releases', 'README.md'),
          'release notes\n');
      if (!createSymlinkOrSkip(t, 'releases',
          path.join(root, 'docs', 'current'), 'dir')) {
        return;
      }
      git(root, ['add', '-A']);
      git(root, ['commit', '-m', 'add internal docs symlink']);
      const headSha = git(root, ['rev-parse', 'HEAD']);
      git(root, ['checkout', 'main']);
      const started = await startReview(root, {
        configHome,
        required: true,
        candidate: {
          kind: 'pull-request',
          url: 'https://github.com/acme/widget/pull/42',
          baseSha,
          headSha
        }
      });

      const candidate = await materializeCandidate(root, {
        subjectHash: started.binding.subjectHash
      });

      assert.equal(readFileSync(path.join(candidate.path, 'docs', 'current',
          'README.md'), 'utf8'), 'release notes\n');
    });

test('requires a new commit from the same PR before capturing a correction', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {
      kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42',
      baseSha,
      headSha
    }
  });
  const reviewed = await captureCandidateReview(root, started.binding,
      configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
        file: 'src-feature.js', description: 'Test correction finding.'}],
      ['lens', 'mirror']);

  await assert.rejects(() => captureCorrection(root, {
    ...reviewed.binding,
    configHome,
    validatorStatus: 'PASS'
  }), /candidate_pull_request_successor_required/);
});

test('rejects a local correction commit that is not the current published PR head',
    async (t) => {
      const {root, baseSha, headSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const remote = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-remote-'));
      const fakeBin = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-bin-'));
      const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
          {baseSha, headSha});
      t.after(() => {
        fakePullRequest.restore();
        removeTree(root);
        removeTree(configHome);
        removeTree(remote);
        removeTree(fakeBin);
      });
      const url = 'https://github.com/acme/widget/pull/42';
      const started = await startReview(root, {
        configHome,
        required: true,
        candidate: {kind: 'pull-request', url, baseSha, headSha}
      });
      const reviewed = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
            file: 'src-feature.js', description: 'Unresolved risk.'}],
          ['lens', 'mirror']);
      git(root, ['checkout', 'feature']);
      writeFileSync(path.join(root, 'unpublished-fix.js'),
          'export const unpublishedFix = true;\n');
      git(root, ['add', '-A']);
      git(root, ['commit', '-m', 'local unpublished correction']);
      const localHeadSha = git(root, ['rev-parse', 'HEAD']);
      const localTree = git(root, ['rev-parse', '--verify', `${localHeadSha}^{tree}`]);
      git(root, ['checkout', 'main']);

      await assert.rejects(() => captureCorrection(root, {
        ...reviewed.binding,
        configHome,
        validatorStatus: 'PASS',
        candidate: {kind: 'pull-request', url, baseSha, headSha: localHeadSha},
        validationEvidence: [{
          command: 'npm run test:review',
          status: 'PASS',
          exitCode: 0,
          candidateTree: localTree
        }]
      }), /candidate_pull_request_not_current/);
    });

test('captures a committed local correction against the reviewed base',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      const localFile = path.join(root, 'local-change.js');
      writeFileSync(localFile, 'export const value = "before";\n');
      const started = await startReview(root, {configHome, required: true});
      const reviewed = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'P1', lens: 'R1',
            file: 'local-change.js', description: 'Correct this local change.'}],
          started.reviewers);
      writeFileSync(localFile, 'export const value = "corrected";\n');
      git(root, ['add', 'local-change.js']);
      git(root, ['commit', '-m', 'correct local review finding']);
      const correctedTree = git(root,
          ['rev-parse', '--verify', 'HEAD^{tree}']);

      const correction = await captureCorrection(root, {
        ...reviewed.binding,
        configHome,
        validatorStatus: 'PASS',
        validationEvidence: [{
          command: 'npm run test:review',
          status: 'PASS',
          exitCode: 0,
          candidateTree: correctedTree
        }]
      });

      assert.deepEqual(correction.changedPaths, ['local-change.js']);
      assert.equal(correction.risk, 'high');
      assert.deepEqual(correction.reviewers, ['lens', 'mirror']);
    });

test('accepts a successor PR after its base and head advance', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository(
      'feature.md');
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  const url = 'https://github.com/acme/widget/pull/42';
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {kind: 'pull-request', url, baseSha, headSha}
  });
  const reviewed = await captureCandidateReview(root, started.binding,
      configHome, [{candidateCaused: true, severity: 'P1', lens: 'R1',
        file: 'feature.md', description: 'Correct this PR change.'}],
      started.reviewers);

  git(root, ['checkout', 'main']);
  writeFileSync(path.join(root, 'base-update.txt'), 'current base\n');
  git(root, ['add', 'base-update.txt']);
  git(root, ['commit', '-m', 'advance the PR base']);
  const currentBaseSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', 'feature']);
  mkdirSync(path.join(root, '.husky'));
  writeFileSync(path.join(root, '.husky', 'pre-commit'), 'echo check\n');
  git(root, ['add', '.husky/pre-commit']);
  git(root, ['commit', '-m', 'correct PR and add hook']);
  const successorHeadSha = git(root, ['rev-parse', 'HEAD']);
  const successorTree = git(root, ['rev-parse', '--verify', 'HEAD^{tree}']);
  git(root, ['checkout', 'main']);
  git(root, ['push', 'origin', 'main', 'feature']);
  execFileSync('git', ['--git-dir', remote, 'update-ref',
    'refs/pull/42/head', successorHeadSha], {encoding: 'utf8'});
  fakePullRequest.setOids(currentBaseSha, successorHeadSha);

  const correction = await captureCorrection(root, {
    ...reviewed.binding,
    configHome,
    validatorStatus: 'PASS',
    candidate: {
      kind: 'pull-request', url, baseSha: currentBaseSha,
      headSha: successorHeadSha
    },
    validationEvidence: [{
      command: 'npm run test:review',
      status: 'PASS',
      exitCode: 0,
      candidateTree: successorTree
    }]
  });

  assert.equal(correction.status, 'reviewing_correction');
  assert.equal(correction.candidate.baseSha, currentBaseSha);
  assert.equal(correction.candidate.headSha, successorHeadSha);
  assert.deepEqual(correction.changedPaths,
      ['.husky/pre-commit', 'feature.md']);
  assert.equal(correction.risk, 'high');
  assert.deepEqual(correction.reviewers, ['lens', 'mirror']);
});

test('times out a remote PR lookup and releases the correction lock', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  const url = 'https://github.com/acme/widget/pull/42';
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {kind: 'pull-request', url, baseSha, headSha}
  });
  const reviewed = await captureCandidateReview(root, started.binding,
      configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
        file: 'src-feature.js', description: 'Unresolved risk.'}],
      started.reviewers);
  fakePullRequest.setGhHang(true);

  await assert.rejects(() => captureCorrection(root, {
    ...reviewed.binding,
    configHome,
    validatorStatus: 'PASS',
    candidate: {kind: 'pull-request', url, baseSha, headSha}
  }, {ghTimeoutMs: 750}), /pull_request_lookup_failed/);

  const stateFile = path.join(root, '.git', 'agent-harness-review',
      'transaction.json');
  assert.equal(existsSync(`${stateFile}.lock`), false);
  assert.equal(existsSync(stateFile), true);
});

test('resolves a PR outside the correction lock and rejects a stale binding',
    async (t) => {
      const {root, baseSha, headSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const remote = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-remote-'));
      const fakeBin = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-bin-'));
      const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
          {baseSha, headSha});
      t.after(() => {
        fakePullRequest.restore();
        removeTree(root);
        removeTree(configHome);
        removeTree(remote);
        removeTree(fakeBin);
      });
      const url = 'https://github.com/acme/widget/pull/42';
      const started = await startReview(root, {
        configHome,
        required: true,
        candidate: {kind: 'pull-request', url, baseSha, headSha}
      });
      const reviewed = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
            file: 'src-feature.js', description: 'Unresolved risk.'}],
          started.reviewers);
      const startedMarker = path.join(fakeBin, 'gh-lookup-started');
      const releaseMarker = path.join(fakeBin, 'gh-lookup-release');
      fakePullRequest.setGhGate(startedMarker, releaseMarker);
      const input = {
        ...reviewed.binding,
        configHome,
        validatorStatus: 'PASS',
        candidate: {kind: 'pull-request', url, baseSha, headSha}
      };
      const libraryUrl = new URL(
          '../adapters/opencode/scripts/review-lib.mjs', import.meta.url).href;
      const source = `
        import {captureCorrection} from ${JSON.stringify(libraryUrl)};
        const input = JSON.parse(${JSON.stringify(JSON.stringify(input))});
        try {
          const result = await captureCorrection(
              ${JSON.stringify(root)}, input, {ghTimeoutMs: 5000});
          console.log(JSON.stringify({status: result.status}));
        } catch (error) {
          console.error(error.message);
          process.exitCode = 1;
        }
      `;
      const childResult = new Promise((resolve) => {
        execFile(process.execPath, ['--input-type=module', '-e', source], {
          env: process.env,
          maxBuffer: 1024 * 1024
        }, (error, stdout, stderr) => resolve({error, stdout, stderr}));
      });
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const lockFile = `${stateFile}.lock`;

      try {
        await waitForFile(startedMarker, 5000);
        assert.equal(existsSync(lockFile), false);

        await reviewControl.closeReview(root, {
          ...reviewed.binding,
          configHome,
          recoveryToken: reviewed.recovery_transition.token,
          resolution: 'User deferred this unresolved finding.'
        });
        await startReview(root, {
          configHome,
          required: true,
          candidate: {kind: 'pull-request', url, baseSha, headSha}
        });
        assert.equal(existsSync(lockFile), false);
      } finally {
        writeFileSync(releaseMarker, 'release\\n');
        await childResult;
      }

      const result = await childResult;
      assert.equal(result.error?.code, 1);
      assert.match(result.stderr, /binding_lineage_mismatch/);
    });

test('bounds the time spent fetching a pull-request candidate', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const remote = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(remote);
    removeTree(fakeBin);
  });

  await assert.rejects(() => reviewControl.resolvePullRequestCandidate(root,
      'https://github.com/acme/widget/pull/42', {fetchTimeoutMs: 1}),
  /pull_request_fetch_failed/);
});

test('captures an updated PR head as the single RDD correction', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  const url = 'https://github.com/acme/widget/pull/42';
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {kind: 'pull-request', url, baseSha, headSha}
  });
  const reviewed = await captureCandidateReview(root, started.binding,
      configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
        file: 'src-feature.js', description: 'Test correction finding.'}],
      ['lens', 'mirror']);

  git(root, ['checkout', 'feature']);
  writeFileSync(path.join(root, 'fix.js'), 'export const fixed = true;\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'apply review correction']);
  const correctedHeadSha = git(root, ['rev-parse', 'HEAD']);
  const correctedTree = git(root,
      ['rev-parse', '--verify', `${correctedHeadSha}^{tree}`]);
  git(root, ['checkout', 'main']);
  git(root, ['push', 'origin', 'feature']);
  execFileSync('git', ['--git-dir', remote, 'update-ref',
    'refs/pull/42/head', correctedHeadSha], {encoding: 'utf8'});
  fakePullRequest.setOids(baseSha, correctedHeadSha);

  const correctionInput = {
    ...reviewed.binding,
    configHome,
    validatorStatus: 'PASS',
    candidate: {
      kind: 'pull-request', url, baseSha, headSha: correctedHeadSha
    }
  };
  await assert.rejects(() => captureCorrection(root, correctionInput),
      /correction_validation_evidence_incomplete/);
  const correction = await captureCorrection(root, {
    ...correctionInput,
    validationEvidence: [{
      command: 'npm run test:review',
      status: 'PASS',
      exitCode: 0,
      candidateTree: correctedTree
    }]
  });

  assert.equal(correction.status, 'reviewing_correction');
  assert.equal(correction.candidate.headSha, correctedHeadSha);
  assert.notEqual(correction.binding.subjectHash, reviewed.binding.subjectHash);
  const savedState = JSON.parse(readFileSync(path.join(root, '.git',
      'agent-harness-review', 'transaction.json'), 'utf8'));
  assert.equal(savedState.correctionHistory[0].candidate.headSha, headSha);
  assert.equal(savedState.correctionHistory[0].candidateTree,
      git(root, ['rev-parse', '--verify', `${headSha}^{tree}`]));
  assert.deepEqual(savedState.findings, []);
  assert.deepEqual(savedState.reviewerEvidence, []);

  const correctedCandidate = await materializeCandidate(root, {
    subjectHash: correction.binding.subjectHash
  });
  assert.equal(existsSync(path.join(correctedCandidate.path, 'fix.js')), true);
  const rereview = await captureCandidateReview(root, correction.binding,
      configHome, [], correction.reviewers);
  assert.equal(rereview.status, 'approved');
});

test('capture-correction CLI resolves a PR URL once inside the library',
    async (t) => {
      const {root, baseSha, headSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const remote = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-remote-'));
      const fakeBin = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-bin-'));
      const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
          {baseSha, headSha});
      t.after(() => {
        fakePullRequest.restore();
        removeTree(root);
        removeTree(configHome);
        removeTree(remote);
        removeTree(fakeBin);
      });
      const url = 'https://github.com/acme/widget/pull/42';
      const started = await startReview(root, {
        configHome,
        required: true,
        candidate: {kind: 'pull-request', url, baseSha, headSha}
      });
      const reviewed = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
            file: 'src-feature.js', description: 'Unresolved risk.'}],
          started.reviewers);
      git(root, ['checkout', 'feature']);
      writeFileSync(path.join(root, 'fix.js'), 'export const fixed = true;\n');
      git(root, ['add', '-A']);
      git(root, ['commit', '-m', 'apply review correction']);
      const correctedHeadSha = git(root, ['rev-parse', 'HEAD']);
      const correctedTree = git(root,
          ['rev-parse', '--verify', `${correctedHeadSha}^{tree}`]);
      git(root, ['checkout', 'main']);
      git(root, ['push', 'origin', 'feature']);
      execFileSync('git', ['--git-dir', remote, 'update-ref',
        'refs/pull/42/head', correctedHeadSha], {encoding: 'utf8'});
      fakePullRequest.setOids(baseSha, correctedHeadSha);
      const lookupCount = path.join(fakeBin, 'gh-lookup-count');
      fakePullRequest.setGhCountFile(lookupCount);
      const reviewScript = fileURLToPath(new URL(
          '../adapters/opencode/scripts/review.mjs', import.meta.url));

      const correction = JSON.parse(execFileSync(process.execPath, [
        reviewScript, 'capture-correction', '--cwd', root,
        '--config-home', configHome,
        '--lineage', reviewed.binding.lineage,
        '--revision', String(reviewed.binding.revision),
        '--target', reviewed.binding.target,
        '--subject-hash', reviewed.binding.subjectHash,
        '--validator-status', 'PASS', '--pr-url', url,
        '--validation-evidence', JSON.stringify([{
          command: 'npm run test:review',
          status: 'PASS',
          exitCode: 0,
          candidateTree: correctedTree
        }])
      ], {encoding: 'utf8'}));

      assert.equal(correction.status, 'reviewing_correction');
      assert.equal(correction.candidate.headSha, correctedHeadSha);
      assert.equal(Number(readFileSync(lookupCount, 'utf8')), 2);
    });

test('rejects a new PR commit when the reviewed tree did not change', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  const url = 'https://github.com/acme/widget/pull/42';
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {kind: 'pull-request', url, baseSha, headSha}
  });
  const reviewed = await captureCandidateReview(root, started.binding,
      configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
        file: 'src-feature.js', description: 'Test correction finding.'}],
      ['lens', 'mirror']);
  git(root, ['checkout', 'feature']);
  git(root, ['commit', '--allow-empty', '-m', 'empty correction commit']);
  const unchangedHeadSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['checkout', 'main']);
  git(root, ['push', 'origin', 'feature']);
  execFileSync('git', ['--git-dir', remote, 'update-ref',
    'refs/pull/42/head', unchangedHeadSha], {encoding: 'utf8'});
  fakePullRequest.setOids(baseSha, unchangedHeadSha);

  await assert.rejects(() => captureCorrection(root, {
    ...reviewed.binding,
    configHome,
    validatorStatus: 'PASS',
    candidate: {kind: 'pull-request', url, baseSha, headSha: unchangedHeadSha}
  }), /candidate_correction_unchanged/);
});

test('rejects a correction commit outside the reviewed PR head lineage',
    async (t) => {
      const {root, baseSha, headSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const remote = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-remote-'));
      const fakeBin = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-bin-'));
      const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
          {baseSha, headSha});
      t.after(() => {
        fakePullRequest.restore();
        removeTree(root);
        removeTree(configHome);
        removeTree(remote);
        removeTree(fakeBin);
      });
      const url = 'https://github.com/acme/widget/pull/42';
      const started = await startReview(root, {
        configHome,
        required: true,
        candidate: {kind: 'pull-request', url, baseSha, headSha}
      });
      const reviewed = await captureCandidateReview(root, started.binding,
          configHome, [{id: 'R1-1', lens: 'R1', severity: 'CRITICAL',
            candidateCaused: true, file: 'src-feature.js',
            description: 'Unresolved risk.'}], ['lens', 'mirror']);
      const unrelatedTree = git(root,
          ['rev-parse', '--verify', `${baseSha}^{tree}`]);

      await assert.rejects(() => captureCorrection(root, {
        ...reviewed.binding,
        configHome,
        validatorStatus: 'PASS',
        validationEvidence: [{
          command: 'npm run test:review',
          status: 'PASS',
          exitCode: 0,
          candidateTree: unrelatedTree
        }],
        candidate: {kind: 'pull-request', url, baseSha, headSha: baseSha}
      }), /candidate_pull_request_successor_not_descendant/);
    });

test('preserves active receipt and external history when history is a symlink',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const outsideHistory = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-external-history-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
        removeTree(outsideHistory);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});
      const reviewed = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
            file: 'local-change.js', description: 'Unresolved risk.'}],
          started.reviewers);
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      const historyDirectory = path.join(path.dirname(stateFile), 'history');
      const historyName = `${state.lineage}-${state.revision}-closed.json`;
      const externalReceipt = path.join(outsideHistory, historyName);
      writeFileSync(externalReceipt, 'external receipt must stay intact\n');
      if (!createSymlinkOrSkip(t, outsideHistory, historyDirectory, 'dir')) {
        return;
      }

      await assert.rejects(() => reviewControl.closeReview(root, {
        ...reviewed.binding,
        configHome,
        recoveryToken: reviewed.recovery_transition.token,
        resolution: 'User deferred this unresolved finding.'
      }), /review_history_path_invalid/);

      assert.equal(readFileSync(externalReceipt, 'utf8'),
          'external receipt must stay intact\n');
      assert.equal(existsSync(stateFile), true);
    });

test('preserves active receipt and external file when history receipt is a symlink',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const outsideHistory = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-external-history-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
        removeTree(outsideHistory);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});
      const reviewed = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
            file: 'local-change.js', description: 'Unresolved risk.'}],
          started.reviewers);
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      const historyDirectory = path.join(path.dirname(stateFile), 'history');
      mkdirSync(historyDirectory);
      const historyPath = path.join(historyDirectory,
          `${state.lineage}-${state.revision}-closed.json`);
      const externalReceipt = path.join(outsideHistory, 'external-receipt.json');
      writeFileSync(externalReceipt, 'external receipt must stay intact\n');
      if (!createSymlinkOrSkip(t, externalReceipt, historyPath, 'file')) {
        return;
      }

      await assert.rejects(() => reviewControl.closeReview(root, {
        ...reviewed.binding,
        configHome,
        recoveryToken: reviewed.recovery_transition.token,
        resolution: 'User deferred this unresolved finding.'
      }), /review_history_path_invalid/);

      assert.equal(readFileSync(externalReceipt, 'utf8'),
          'external receipt must stay intact\n');
      assert.equal(existsSync(stateFile), true);
    });

test('closes an escalated receipt without approval and unblocks a new review',
    async (t) => {
      assert.equal(typeof reviewControl.closeReview, 'function');
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});
      const reviewed = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'CRITICAL', lens: 'R1',
            file: 'local-change.js', description: 'Unresolved risk.'}],
          started.reviewers);
      await assert.rejects(() => reviewControl.closeReview(root, {
        ...reviewed.binding,
        configHome,
        recoveryToken: 'invalid-token',
        resolution: 'User deferred this unresolved finding.'
      }), /recovery_token_invalid/);

      const closed = await reviewControl.closeReview(root, {
        ...reviewed.binding,
        configHome,
        recoveryToken: reviewed.recovery_transition.token,
        resolution: 'User deferred this unresolved finding.'
      });

      assert.equal(closed.status, 'closed_without_approval');
      assert.equal(existsSync(closed.historyPath), true);
      assert.equal(existsSync(path.join(root, '.git', 'agent-harness-review',
          'candidates', started.binding.subjectHash)), false);
      assert.equal((await startReview(root, {configHome, required: true})).status,
          'reviewing');
    });

test('does not close a legacy transaction when both recovery tokens are absent',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      const started = await startReview(root, {configHome, required: true});
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      delete state.recovery_transition;
      writeFileSync(stateFile, `${JSON.stringify(state)}\n`);

      const recovery = await reviewControl.closeReview(root, {
        ...started.binding,
        configHome,
        resolution: 'User chose to close this legacy receipt.'
      });
      assert.equal(recovery.status, 'recovery_required');

      const closed = await reviewControl.closeReview(root, {
        ...recovery.binding,
        configHome,
        recoveryToken: recovery.recovery_transition.token,
        resolution: 'User chose to close this legacy receipt.'
      });
      assert.equal(closed.status, 'closed_without_approval');
    });

test('rejects a start request whose pull-request URL has no value', async (t) => {
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  writeFileSync(path.join(root, 'local-change.js'),
      'export const localChange = true;\n');
  const reviewScript = fileURLToPath(new URL(
      '../adapters/opencode/scripts/review.mjs', import.meta.url));

  const failure = await new Promise((resolve) => {
    execFile(process.execPath, [reviewScript, 'start', '--cwd', root,
      '--config-home', configHome, '--required', '--pr-url'],
    {encoding: 'utf8'}, (error, stdout, stderr) => {
      resolve({error, stdout, stderr});
    });
  });

  assert.notEqual(failure.error, null);
  assert.match(failure.stderr, /pull_request_url_value_required/);
  assert.equal(existsSync(path.join(root, '.git', 'agent-harness-review',
      'transaction.json')), false);
});

test('classifies agent instruction files as high risk', (t) => {
  for (const candidatePath of [
    'AGENTS.md',
    'CLAUDE.md',
    'prompts/sdd/sdd-init.md',
    'skills/github/yeet/SKILL.md'
  ]) {
    const {root} = createPullRequestRepository();
    t.after(() => removeTree(root));
    const file = path.join(root, candidatePath);
    mkdirSync(path.dirname(file), {recursive: true});
    writeFileSync(file, 'changed agent instructions\n');

    const assessment = assessCandidate(root);

    assert.equal(assessment.risk, 'high', candidatePath);
  }
});

test('classifies an extensionless executable file as high risk', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows does not record the executable bit in the Git index');
    return;
  }
  const {root} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  t.after(() => {
    removeTree(root);
    removeTree(configHome);
  });
  mkdirSync(path.join(root, 'scripts'));
  const executable = path.join(root, 'scripts', 'deploy');
  writeFileSync(executable, '#!/bin/sh\nexit 0\n');
  chmodSync(executable, 0o755);

  const assessment = assessCandidate(root);

  assert.equal(assessment.risk, 'high');
  assert.deepEqual(assessment.changedPaths, ['scripts/deploy']);

  const started = await startReview(root, {configHome, required: true});

  assert.equal(started.risk, 'high');
  assert.deepEqual(started.reviewers, ['lens', 'mirror']);
});

test('times out the working-tree status scan and releases the review lock',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const indexesBefore = new Set(readdirSync(os.tmpdir()).filter((entry) =>
        entry.startsWith('agent-harness-review-') && entry.endsWith('.index')));

      await assert.rejects(() => startReview(root, {configHome, required: true},
          {gitStatusTimeoutMs: 1}), (error) => error.code === 'ETIMEDOUT');

      const indexesAfter = readdirSync(os.tmpdir()).filter((entry) =>
        entry.startsWith('agent-harness-review-') && entry.endsWith('.index'));
      assert.deepEqual(indexesAfter.filter((entry) => !indexesBefore.has(entry)),
          []);
      assert.equal(existsSync(path.join(root, '.git', 'agent-harness-review',
          'transaction.json.lock')), false);
      assert.equal(existsSync(path.join(root, '.git', 'agent-harness-review',
          'transaction.json')), false);

      const started = await startReview(root, {configHome, required: true});

      assert.equal(started.status, 'reviewing');
    });

test('keeps an existing matching history receipt and the transaction coherent',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});
      const captured = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'WARNING', lens: 'R1',
            file: 'local-change.js', description: 'A non-blocking warning.'}],
          ['lens', 'mirror']);
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      const historyDirectory = path.join(path.dirname(stateFile), 'history');
      mkdirSync(historyDirectory, {recursive: true});
      const historyFile = path.join(historyDirectory,
          `${state.lineage}-${state.revision}-approved.json`);
      const preExisting = `${JSON.stringify({
        ...state, receiptOrigin: 'pre-existing'
      }, null, 2)}\n`;
      writeFileSync(historyFile, preExisting);
      const receiptStatBefore = statSync(historyFile);

      const burned = await acknowledgeApproved(root, {
        ...captured.binding,
        acknowledgement: captured.next_transition.token,
        configHome
      });

      assert.equal(burned.status, 'burned');
      assert.equal(readFileSync(historyFile, 'utf8'), preExisting);
      if (process.platform !== 'win32') {
        assert.equal(statSync(historyFile).ino, receiptStatBefore.ino);
      }
      assert.equal(existsSync(stateFile), false);
    });

test('refuses to overwrite a different history receipt and keeps the transaction',
    async (t) => {
      const {root} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      t.after(() => {
        removeTree(root);
        removeTree(configHome);
      });
      writeFileSync(path.join(root, 'local-change.js'),
          'export const localChange = true;\n');
      const started = await startReview(root, {configHome, required: true});
      const captured = await captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'WARNING', lens: 'R1',
            file: 'local-change.js', description: 'A non-blocking warning.'}],
          ['lens', 'mirror']);
      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      const historyDirectory = path.join(path.dirname(stateFile), 'history');
      mkdirSync(historyDirectory, {recursive: true});
      const historyFile = path.join(historyDirectory,
          `${state.lineage}-${state.revision}-approved.json`);
      const conflicting = `${JSON.stringify({
        ...state, subjectHash: 'a-different-candidate', receiptOrigin: 'conflict'
      }, null, 2)}\n`;
      writeFileSync(historyFile, conflicting);

      await assert.rejects(() => acknowledgeApproved(root, {
        ...captured.binding,
        acknowledgement: captured.next_transition.token,
        configHome
      }), /review_history_receipt_conflict/);

      assert.equal(readFileSync(historyFile, 'utf8'), conflicting);
      assert.equal(existsSync(stateFile), true);
      assert.equal(JSON.parse(readFileSync(stateFile, 'utf8')).status,
          'approved');
    });

test('rejects a capture when the pull-request head moved after the start',
    async (t) => {
      const {root, baseSha, headSha} = createPullRequestRepository();
      const configHome = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-config-'));
      const remote = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-remote-'));
      const fakeBin = mkdtempSync(
          path.join(os.tmpdir(), 'agent-harness-review-bin-'));
      const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
          {baseSha, headSha});
      t.after(() => {
        fakePullRequest.restore();
        removeTree(root);
        removeTree(configHome);
        removeTree(remote);
        removeTree(fakeBin);
      });
      const url = 'https://github.com/acme/widget/pull/42';
      const started = await startReview(root, {
        configHome,
        required: true,
        candidate: {kind: 'pull-request', url, baseSha, headSha}
      });
      git(root, ['checkout', 'feature']);
      writeFileSync(path.join(root, 'src-feature.js'),
          'export const feature = true;\n// advanced head\n');
      git(root, ['commit', '-am', 'advance the pull-request head']);
      const advancedHead = git(root, ['rev-parse', 'HEAD']);
      git(root, ['checkout', 'main']);
      fakePullRequest.setOids(baseSha, advancedHead);

      await assert.rejects(() => captureCandidateReview(root, started.binding,
          configHome, [{candidateCaused: true, severity: 'WARNING', lens: 'R1',
            file: 'src-feature.js', description: 'A non-blocking warning.'}],
          ['lens', 'mirror']), /candidate_pull_request_oid_stale/);

      const stateFile = path.join(root, '.git', 'agent-harness-review',
          'transaction.json');
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      assert.equal(state.status, 'invalidated');
      assert.equal(state.invalidatedReason, 'candidate_pull_request_oid_stale');
    });

test('fails closed on GitHub lookup errors during PR review capture', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42', baseSha, headSha}
  });
  const stateFile = path.join(root, '.git', 'agent-harness-review',
      'transaction.json');
  const before = readFileSync(stateFile, 'utf8');
  fakePullRequest.setGhFailure(true);

  await assert.rejects(() => captureCandidateReview(root, started.binding,
      configHome, [], started.reviewers), /pull_request_freshness_check_failed/);

  assert.equal(readFileSync(stateFile, 'utf8'), before);
  assert.equal(JSON.parse(before).status, 'reviewing');
});

test('fails closed on GitHub lookup errors during PR review close', async (t) => {
  const {root, baseSha, headSha} = createPullRequestRepository();
  const configHome = mkdtempSync(
      path.join(os.tmpdir(), 'agent-harness-review-config-'));
  const remote = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-remote-'));
  const fakeBin = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-review-bin-'));
  const fakePullRequest = configureFakePullRequest(root, remote, fakeBin,
      {baseSha, headSha});
  t.after(() => {
    fakePullRequest.restore();
    removeTree(root);
    removeTree(configHome);
    removeTree(remote);
    removeTree(fakeBin);
  });
  const started = await startReview(root, {
    configHome,
    required: true,
    candidate: {kind: 'pull-request',
      url: 'https://github.com/acme/widget/pull/42', baseSha, headSha}
  });
  const stateFile = path.join(root, '.git', 'agent-harness-review',
      'transaction.json');
  const before = readFileSync(stateFile, 'utf8');
  fakePullRequest.setGhFailure(true);

  await assert.rejects(() => reviewControl.closeReview(root, {
    ...started.binding,
    recoveryToken: started.recovery_transition.token,
    resolution: 'Close after GitHub lookup failure.'
  }), /pull_request_freshness_check_failed/);

  assert.equal(readFileSync(stateFile, 'utf8'), before);
  assert.equal(JSON.parse(before).status, 'reviewing');
});
