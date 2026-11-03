import {createHash, randomUUID} from 'node:crypto';
import {createReadStream, rmSync} from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export const REVIEW_VERSION = 'agent-harness.review/v1';
export const ASSESSMENT_VERSION = 'agent-harness.review-assessment/v1';
const REVIEW_LENSES = ['R1', 'R2', 'R3', 'R4'];
const GIT_OUTPUT_MAX_BUFFER = 128 * 1024 * 1024;
const GIT_ARCHIVE_TIMEOUT_MS = 30_000;
const TAR_EXTRACT_TIMEOUT_MS = 30_000;
const GIT_ADD_TIMEOUT_MS = 30_000;
const GIT_COMMAND_TIMEOUT_MS = 30_000;
const GIT_STATUS_TIMEOUT_MS = 30_000;
const GH_TIMEOUT_MS = 30_000;
const GIT_FETCH_TIMEOUT_MS = 60_000;
const REVIEW_SEVERITIES = new Set([
  'P0', 'P1', 'CRITICAL', 'WARNING', 'WARNING (REAL)',
  'WARNING (THEORETICAL)', 'SUGGESTION'
]);

function gitExec(args, options = {}) {
  return execFileSync('git', args, {
    ...options,
    env: {
      ...process.env,
      ...options.env,
      GIT_NO_REPLACE_OBJECTS: '1'
    }
  });
}

function git(root, args, env = {}, timeout = GIT_COMMAND_TIMEOUT_MS) {
  return gitExec(['-C', root, ...args], {encoding: 'utf8', env, timeout}).trim();
}

function configPath(configHome) {
  return path.join(
      configHome ?? process.env.AGENT_HARNESS_CONFIG_HOME ?? path.join(
          os.homedir(), '.config'), 'agent-harness', 'review-mode.json');
}

function cloneConfigPath(root) {
  return path.join(root, '.agent-harness', 'review-mode.json');
}

function statePath(root) {
  const gitPath = git(root,
      ['rev-parse', '--git-path', 'agent-harness-review']);
  return path.join(
      path.isAbsolute(gitPath) ? gitPath : path.join(root, gitPath),
      'transaction.json');
}

async function safeStatePath(root, createDirectory = false) {
  const file = statePath(root);
  const directory = path.dirname(file);
  let directoryStat;
  try {
    directoryStat = await fs.lstat(directory);
  } catch (error) {
    if (error.code !== 'ENOENT' || !createDirectory) {
      if (error.code === 'ENOENT') {
        return file;
      }
      throw error;
    }
    await fs.mkdir(directory, {recursive: true, mode: 0o700});
    directoryStat = await fs.lstat(directory);
  }
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    throw new Error('review_state_path_invalid');
  }
  if (process.platform !== 'win32') {
    await fs.chmod(directory, 0o700);
  }
  try {
    const fileStat = await fs.lstat(file);
    if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
      throw new Error('review_state_path_invalid');
    }
    if (process.platform !== 'win32') {
      await fs.chmod(file, 0o600);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  return file;
}

async function readReviewState(root) {
  return readJson(await safeStatePath(root));
}

async function writeReviewState(root, value) {
  await writeJson(await safeStatePath(root, true), value);
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function processStartIdentity(pid) {
  try {
    if (process.platform === 'win32') {
      return execFileSync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().Ticks`
      ], {encoding: 'utf8', windowsHide: true}).trim();
    }
    return execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
      encoding: 'utf8',
      env: {...process.env, LC_ALL: 'C'}
    }).trim();
  } catch {
    return undefined;
  }
}

const PROCESS_START_IDENTITY = processStartIdentity(process.pid);

function lockOwnerIsAlive(lock) {
  if (!Number.isInteger(lock?.pid) || !processIsAlive(lock.pid)) {
    return false;
  }
  if (typeof lock.processStartIdentity !== 'string'
      || !lock.processStartIdentity) {
    return true;
  }
  const identity = processStartIdentity(lock.pid);
  return identity === undefined || identity === lock.processStartIdentity;
}

async function withReviewLock(root, operation) {
  const stateFile = await safeStatePath(root, true);
  const lockFile = `${stateFile}.lock`;
  await acquireReviewLock(lockFile);
  try {
    return await operation();
  } finally {
    await fs.rm(lockFile, {force: true});
  }
}

async function createExclusiveLock(file) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify({
      pid: process.pid,
      processStartIdentity: PROCESS_START_IDENTITY,
      startedAt: new Date().toISOString()
    }), {flag: 'wx', mode: 0o600});
    await fs.link(temporary, file);
  } finally {
    await fs.rm(temporary, {force: true});
  }
}

async function acquireReviewLock(lockFile, depth = 0) {
  if (depth > 8) {
    throw new Error('review_lock_recovery_depth_exceeded');
  }
  while (true) {
    try {
      await createExclusiveLock(lockFile);
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    const recoveryFile = `${lockFile}.recovery`;
    await acquireReviewLock(recoveryFile, depth + 1);
    try {
      let lockStat;
      try {
        lockStat = await fs.lstat(lockFile);
      } catch (error) {
        if (error.code === 'ENOENT') {
          continue;
        }
        throw error;
      }
      if (lockStat.isSymbolicLink()) {
        throw new Error('review_lock_path_invalid');
      }
      let currentLock;
      try {
        currentLock = await readJson(lockFile);
      } catch {
        throw new Error('review_transaction_lock_corrupt');
      }
      if (!Number.isInteger(currentLock?.pid) || lockOwnerIsAlive(currentLock)) {
        throw new Error('review_transaction_busy');
      }
      await fs.rm(lockFile, {force: true});
    } finally {
      await fs.rm(recoveryFile, {force: true});
    }
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), {recursive: true});
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600
    });
    await fs.rename(tmp, file);
  } finally {
    await fs.rm(tmp, {force: true});
  }
}

async function writeHistoryReceiptExclusive(file, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try {
    await fs.writeFile(file, content, {
      encoding: 'utf8', flag: 'wx', mode: 0o600
    });
    return;
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
  let existing;
  try {
    existing = await readJson(file);
  } catch {
    throw new Error('review_history_receipt_conflict');
  }
  if (existing?.lineage !== value.lineage
      || existing?.revision !== value.revision
      || existing?.subjectHash !== value.subjectHash
      || JSON.stringify(existing?.candidate ?? null)
        !== JSON.stringify(value.candidate ?? null)) {
    throw new Error('review_history_receipt_conflict');
  }
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizedReviewSeverity(severity) {
  return severity.trim().toUpperCase();
}

function validReviewFinding(finding) {
  return finding && typeof finding.id === 'string'
      && finding.id.trim().length > 0
      && REVIEW_LENSES.includes(finding.lens)
      && typeof finding.severity === 'string'
      && REVIEW_SEVERITIES.has(normalizedReviewSeverity(finding.severity))
      && typeof finding.candidateCaused === 'boolean'
      && typeof finding.file === 'string' && finding.file.trim().length > 0
      && typeof finding.description === 'string'
      && finding.description.trim().length > 0;
}

function reviewFindingFingerprint(finding) {
  return JSON.stringify({
    id: finding.id,
    lens: finding.lens,
    severity: normalizedReviewSeverity(finding.severity),
    candidateCaused: finding.candidateCaused,
    file: finding.file,
    description: finding.description
  });
}

function resolveCommit(root, value, label) {
  if (typeof value !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(
      value)) {
    throw new Error(`candidate_${label}_invalid`);
  }
  try {
    const resolved = git(root, ['rev-parse', '--verify', `${value}^{commit}`]);
    if (resolved.toLowerCase() !== value.toLowerCase()) {
      throw new Error(`candidate_${label}_invalid`);
    }
    return resolved;
  } catch (error) {
    if (error.message.startsWith('candidate_')) {
      throw error;
    }
    throw new Error(`candidate_${label}_unavailable`);
  }
}

function pullRequestIdentity(value) {
  try {
    const parsed = new URL(value);
    const match = parsed.pathname.match(
        /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/);
    if (parsed.protocol !== 'https:' || !match
        || parsed.username || parsed.password) {
      throw new Error('invalid_url');
    }
    return {
      url: `${parsed.origin}/${match[1]}/${match[2]}/pull/${match[3]}`,
      repository: `${parsed.host.toLowerCase()}/${match[1].toLowerCase()}/${match[2].toLowerCase()}`,
      number: match[3]
    };
  } catch {
    throw new Error('candidate_pull_request_url_invalid');
  }
}

function gitRemoteRepository(value) {
  try {
    const parsed = new URL(value);
    if (!['https:', 'ssh:', 'git:'].includes(parsed.protocol)) {
      return undefined;
    }
    const parts = parsed.pathname.replace(/\.git\/?$/i, '').split('/').filter(
        Boolean);
    if (parts.length < 2) {
      return undefined;
    }
    return `${parsed.host.toLowerCase()}/${parts.slice(-2).join('/').toLowerCase()}`;
  } catch {
    const match = value.match(/^(?:[^@/]+@)?([^/:]+):(.+)$/);
    if (!match) {
      return undefined;
    }
    const parts = match[2].replace(/\.git\/?$/i, '').split('/').filter(Boolean);
    return parts.length >= 2
        ? `${match[1].toLowerCase()}/${parts.slice(-2).join('/').toLowerCase()}`
        : undefined;
  }
}

function pullRequestCandidate(root, candidate) {
  const identity = pullRequestIdentity(candidate?.url);

  const baseSha = resolveCommit(root, candidate.baseSha, 'base_sha');
  const headSha = resolveCommit(root, candidate.headSha, 'head_sha');
  let mergeBaseSha;
  try {
    mergeBaseSha = git(root, ['merge-base', baseSha, headSha]);
  } catch {
    throw new Error('candidate_pull_request_has_no_merge_base');
  }
  return {
    kind: 'pull-request',
    url: identity.url,
    baseSha,
    headSha,
    mergeBaseSha
  };
}

function readPullRequest(url, identity, timeout = GH_TIMEOUT_MS) {
  let pullRequest;
  try {
    pullRequest = JSON.parse(execFileSync('gh', [
      'pr', 'view', url, '--json',
      'url,number,baseRefName,baseRefOid,headRefName,headRefOid'
    ], {encoding: 'utf8', maxBuffer: 1024 * 1024, timeout}));
  } catch {
    throw new Error('pull_request_lookup_failed');
  }
  const actual = pullRequestIdentity(pullRequest.url);
  if (actual.url !== identity.url || String(pullRequest.number) !== identity.number
      || typeof pullRequest.baseRefName !== 'string'
      || typeof pullRequest.headRefName !== 'string'
      || !pullRequest.baseRefName || !pullRequest.headRefName) {
    throw new Error('pull_request_identity_mismatch');
  }
  return pullRequest;
}

export async function resolvePullRequestCandidate(root, url, {
  ghTimeoutMs = GH_TIMEOUT_MS,
  fetchTimeoutMs = GIT_FETCH_TIMEOUT_MS
} = {}) {
  const identity = pullRequestIdentity(url);
  try {
    execFileSync('gh', ['auth', 'status'], {
      stdio: 'ignore', timeout: ghTimeoutMs
    });
  } catch {
    throw new Error('github_cli_auth_required');
  }

  const remotes = git(root, ['remote']).split('\n').filter(Boolean);
  const matchingRemotes = remotes.filter((remote) => {
    if (!/^[A-Za-z0-9._-]+$/.test(remote) || remote.startsWith('-')) {
      return false;
    }
    try {
      const remoteUrl = git(root, ['config', '--get', `remote.${remote}.url`]);
      return gitRemoteRepository(remoteUrl) === identity.repository;
    } catch {
      return false;
    }
  });
  if (matchingRemotes.length !== 1) {
    throw new Error(matchingRemotes.length === 0
        ? 'pull_request_base_remote_not_found'
        : 'pull_request_base_remote_ambiguous');
  }

  const remote = matchingRemotes[0];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const before = readPullRequest(identity.url, identity, ghTimeoutMs);
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(before.baseRefOid)
        || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(before.headRefOid)) {
      throw new Error('pull_request_commit_oid_invalid');
    }
    try {
      gitExec([
        '-C', root, 'fetch', '--no-tags', remote,
        `refs/pull/${identity.number}/head`,
        `refs/heads/${before.baseRefName}`
        ], {stdio: 'ignore', timeout: fetchTimeoutMs});
    } catch {
      throw new Error('pull_request_fetch_failed');
    }
    const after = readPullRequest(identity.url, identity, ghTimeoutMs);
    if (before.baseRefOid !== after.baseRefOid
        || before.headRefOid !== after.headRefOid) {
      if (attempt === 0) {
        continue;
      }
      throw new Error('pull_request_changed_during_fetch');
    }
    const candidate = pullRequestCandidate(root, {
      kind: 'pull-request',
      url: identity.url,
      baseSha: after.baseRefOid,
      headSha: after.headRefOid
    });
    const frozen = freezeCandidate(root, undefined, candidate);
    return {
      version: ASSESSMENT_VERSION,
      ...assessPaths(frozen.paths, frozen.executablePaths),
      candidate: frozen.candidate,
      candidateTree: frozen.candidateTree,
      subjectHash: frozen.subjectHash
    };
  }
  throw new Error('pull_request_changed_during_fetch');
}

function candidatePaths(root, candidate, {
  gitStatusTimeoutMs = GIT_STATUS_TIMEOUT_MS,
  gitTimeoutMs = GIT_COMMAND_TIMEOUT_MS
} = {}) {
  if (candidate?.kind === 'pull-request') {
    const target = pullRequestCandidate(root, candidate);
    const changedPaths = gitExec([
      '-C', root, 'diff', '--name-only', '-z', '--no-renames',
      target.mergeBaseSha, target.headSha
    ], {encoding: 'utf8', maxBuffer: GIT_OUTPUT_MAX_BUFFER,
      timeout: gitTimeoutMs}).split('\0').filter(Boolean).sort();
    return {candidate: target, changedPaths};
  }
  if (candidate !== undefined && candidate?.kind !== 'working-tree') {
    throw new Error('candidate_kind_unsupported');
  }

  const status = gitExec([
    '-C', root, '--no-optional-locks', 'status', '--porcelain=v1', '-z',
    '--no-renames', '--untracked-files=all'
  ], {encoding: 'utf8', maxBuffer: GIT_OUTPUT_MAX_BUFFER,
    timeout: gitStatusTimeoutMs});
  const changedPaths = [...new Set(status.split('\0').filter(Boolean).map(
      (entry) => entry.slice(3)))].sort();
  return {candidate: {kind: 'working-tree'}, changedPaths};
}

function trackedExecutablePaths(root, tree, paths, {
  gitTimeoutMs = GIT_COMMAND_TIMEOUT_MS,
  indexEnv
} = {}) {
  if (paths.length === 0) {
    return [];
  }
  const readModes = (env) => gitExec([
    '-C', root, 'ls-files', '--stage', '-z'
  ], {env: {...process.env, ...env}, encoding: 'utf8',
    maxBuffer: GIT_OUTPUT_MAX_BUFFER, timeout: gitTimeoutMs});
  let output;
  if (indexEnv) {
    output = readModes(indexEnv);
  } else {
    const index = path.join(os.tmpdir(),
        `agent-harness-review-${process.pid}-${randomUUID()}.index`);
    try {
      git(root, ['read-tree', tree], {GIT_INDEX_FILE: index}, gitTimeoutMs);
      output = readModes({GIT_INDEX_FILE: index});
    } finally {
      rmSync(index, {force: true});
    }
  }
  const wanted = new Set(paths);
  return output.split('\0').filter(Boolean).flatMap((entry) => {
    const separator = entry.indexOf('\t');
    if (separator < 0 || entry.slice(0, separator).split(' ')[0] !== '100755') {
      return [];
    }
    const file = entry.slice(separator + 1);
    return wanted.has(file) ? [file] : [];
  });
}

function assessPaths(changedPaths, executablePaths = []) {
  const executablePathSet = new Set(executablePaths);
  const high = changedPaths.some((file) => {
    const normalized = file.replace(/\\/g, '/');
    const sensitiveEnvironmentFile = /(^|\/)\.env(?:\.[^/]*)?$/i.test(
        normalized)
        && !/\.(example|sample|template)$/i.test(normalized);
    return executablePathSet.has(file)
        || sensitiveEnvironmentFile
        || /(^|\/)(AGENTS|CLAUDE|GEMINI|COPILOT|INSTRUCTIONS|CONVENTIONS)\.md$/i.test(
            normalized)
        || /(^|\/)\.(cursorrules|windsurfrules|clinerules)$/i.test(normalized)
        || /(^|\/)\.envrc$/i.test(normalized)
        || /(^|\/)(\.husky|\.githooks)(\/|$)/i.test(normalized)
        || /(^|\/)(auth|security|secrets?|credentials?|infra|infrastructure|terraform|k8s|kubernetes|migrations)(\/|\.|$)/i.test(
            normalized)
        || /(^|\/)(Makefile|Taskfile\.ya?ml|\.npmrc)$/i.test(normalized)
        || /(^|\/)(commands|prompts|skills)(\/|$)/i.test(normalized)
        || /(^|\/)(\.github\/(workflows|actions)|\.circleci|\.buildkite)(\/|$)/i.test(
            normalized)
        || /(^|\/)(wrangler\.(toml|jsonc)|vercel\.json)$/i.test(normalized)
        || /(^|\/)(Jenkinsfile|Dockerfile(?:\.[^/]*)?|docker-compose(?:\.[^/]*)?|compose\.ya?ml|\.gitlab-ci\.ya?ml)$/i.test(
            normalized)
        || /(^|\/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.ya?ml|yarn\.lock|bun\.lockb?|cargo\.(toml|lock)|go\.(mod|sum)|pyproject\.toml|poetry\.lock|requirements[^/]*\.txt|gemfile\.lock|composer\.lock|pom\.xml|[^/]+\.csproj|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?)$/i.test(
            normalized)
        || /\.(pem|key|p12|pfx|sh|ps1|psm1|psd1|bat|cmd|mjs|cjs|jsx|tsx|js|ts|py|go|rs|java|kt|kts|swift|c|h|cc|cpp|cxx|hpp|cs|php|rb|tf|tfvars(?:\.json)?|hcl|sql)$/i.test(
            normalized);
  });
  const passive = changedPaths.length === 0 || (!high && changedPaths.every(
      (file) => /\.(md|txt|rst|adoc)$/i.test(file)));
  return {
    risk: passive ? 'passive' : high ? 'high' : 'medium',
    changedPaths,
    changedFiles: changedPaths.length
  };
}

export async function setReviewMode(root, action,
    {configHome, scope = 'global'} = {}) {
  if (!['enable', 'disable'].includes(action)) {
    throw new Error(
        'mode_action_invalid');
  }
  if (!['global', 'clone'].includes(scope)) {
    throw new Error(
        'mode_scope_invalid');
  }
  const file = scope === 'clone' ? cloneConfigPath(root) : configPath(
      configHome);
  const current = (await readJson(file)) ?? {};
  current.global = action === 'enable';
  await writeJson(file, current);
  return {
    version: REVIEW_VERSION,
    status: action === 'enable' ? 'enabled' : 'disabled',
    source: scope
  };
}

export async function reviewStatus(root, {configHome} = {}) {
  const mode = await readJson(configPath(configHome));
  const clone = await readJson(cloneConfigPath(root));
  const state = await readReviewState(root);
  const enabled = mode?.global === true && clone?.global !== false;
  return {
    version: REVIEW_VERSION,
    mode: enabled ? 'enabled' : 'disabled',
    source: clone?.global === false ? 'clone' : mode?.global === true ? 'global'
        : 'default',
    status: state?.status ?? 'unmanaged', ...(state ? {
      lineage: state.lineage,
      revision: state.revision,
      target: state.target,
      subjectHash: state.subjectHash,
      risk: state.risk,
      candidate: state.candidate,
      changedPaths: state.paths,
      reviewers: state.reviewers,
      recovery_transition: state.recovery_transition,
      ...(state.next_transition
          ? {next_transition: state.next_transition} : {})
    } : {})
  };
}

export function assessCandidate(root, requestedCandidate, testOptions = {}) {
  const {candidate, paths, candidateTree, subjectHash, executablePaths} =
      freezeCandidate(root, undefined, requestedCandidate, undefined,
          testOptions);
  return {
    version: ASSESSMENT_VERSION,
    ...assessPaths(paths, executablePaths),
    candidate,
    candidateTree,
    subjectHash
  };
}

function freezeCandidate(root, destination, requestedCandidate,
    localBaseSha, {
      gitAddTimeoutMs = GIT_ADD_TIMEOUT_MS,
      gitStatusTimeoutMs = GIT_STATUS_TIMEOUT_MS,
      gitTimeoutMs = GIT_COMMAND_TIMEOUT_MS
    } = {}) {
  const resolved = candidatePaths(root, requestedCandidate,
      {gitStatusTimeoutMs, gitTimeoutMs});
  const {candidate, changedPaths} = resolved;
  if (candidate.kind === 'pull-request') {
    const candidateTree = git(root,
        ['rev-parse', '--verify', `${candidate.headSha}^{tree}`]);
    const executablePaths = trackedExecutablePaths(root, candidateTree,
        changedPaths, {gitTimeoutMs});
    const subjectHash = digest({
      root: path.resolve(root), candidate, candidateTree, paths: changedPaths
    });
    if (destination) {
      const target = path.join(destination, subjectHash);
      gitExec(
          ['-C', root, 'archive', candidateTree, '-o', `${target}.tar`],
          {encoding: 'utf8', timeout: GIT_ARCHIVE_TIMEOUT_MS});
    }
    return {
      baseSha: candidate.mergeBaseSha,
      candidate,
      candidateTree,
      paths: changedPaths,
      executablePaths,
      subjectHash
    };
  }

  assertNoStagedWorktreeConflicts(root, {gitTimeoutMs});
  const baseSha = localBaseSha ?? git(root, ['rev-parse', 'HEAD']);
  const indexBaseSha = git(root, ['rev-parse', 'HEAD']);
  const index = path.join(os.tmpdir(),
      `agent-harness-review-${process.pid}-${randomUUID()}.index`);
  const env = {GIT_INDEX_FILE: index};
  try {
    git(root, ['read-tree', indexBaseSha], env);
    gitExec(['-C', root, 'add', '-A'],
        {env: {...process.env, ...env}, encoding: 'utf8',
          timeout: gitAddTimeoutMs});
    const tree = git(root, ['write-tree'], env);
    const paths = gitExec([
      '-C', root, 'diff', '--name-only', '-z', '--no-renames', baseSha, tree
    ], {env: {...process.env, ...env}, encoding: 'utf8',
      maxBuffer: GIT_OUTPUT_MAX_BUFFER,
      timeout: gitTimeoutMs}).split('\0').filter(Boolean).sort();
    const executablePaths = trackedExecutablePaths(root, undefined, paths,
        {gitTimeoutMs, indexEnv: env});
    const subjectHash = digest({
      root: path.resolve(root), candidate, baseSha, tree, paths
    });
    if (destination) {
      const target = path.join(destination, subjectHash);
      gitExec(['-C', root, 'archive', tree, '-o', target + '.tar'],
          {encoding: 'utf8', timeout: GIT_ARCHIVE_TIMEOUT_MS});
    }
    return {
      baseSha, candidate, candidateTree: tree, paths, executablePaths, subjectHash
    };
  } finally {
    rmSync(index, {force: true});
  }
}

function assertNoStagedWorktreeConflicts(root,
    {gitTimeoutMs = GIT_COMMAND_TIMEOUT_MS} = {}) {
  const files = (args) => new Set(gitExec(['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: GIT_OUTPUT_MAX_BUFFER,
    timeout: gitTimeoutMs
  }).split('\0').filter(Boolean));
  const staged = files(['diff', '--cached', '--name-only', '-z', '--no-renames']);
  const unstaged = files(['diff', '--name-only', '-z', '--no-renames']);
  const untracked = files(['ls-files', '--others', '--exclude-standard', '-z']);
  if ([...staged].some((file) => unstaged.has(file) || untracked.has(file))) {
    throw new Error('candidate_staged_worktree_conflict');
  }
}

function binding(state) {
  return {
    lineage: state.lineage,
    revision: state.revision,
    target: state.target,
    subjectHash: state.subjectHash
  };
}

function transition(state, action, token = randomUUID()) {
  return {
    action,
    version: REVIEW_VERSION,
    lineage: state.lineage,
    revision: state.revision,
    target: state.target,
    token
  };
}

function requireBinding(state, input) {
  for (const key of
      ['lineage', 'revision', 'target', 'subjectHash']) {
    if (input[key]
        !== state[key]) {
      throw new Error(`binding_${key}_mismatch`);
    }
  }
}

async function invalidateStalePullRequest(root, state) {
  if (state.candidate?.kind !== 'pull-request') {
    return false;
  }
  const identity = pullRequestIdentity(state.candidate.url);
  let current;
  try {
    current = readPullRequest(state.candidate.url, identity);
  } catch {
    throw new Error('pull_request_freshness_check_failed');
  }
  if (current.baseRefOid === state.candidate.baseSha
      && current.headRefOid === state.candidate.headSha) {
    return false;
  }
  state.status = 'invalidated';
  state.invalidatedReason = 'candidate_pull_request_oid_stale';
  state.invalidatedAt = new Date().toISOString();
  delete state.next_transition;
  await writeReviewState(root, state);
  return true;
}

function requireCorrectionPending(state, input) {
  if (!state) {
    throw new Error('transaction_not_found');
  }
  requireBinding(state, input);
  if (state.status !== 'correction_pending' || state.correctionCount >= 1) {
    throw new Error('correction_budget_exhausted');
  }
}

export async function startReview(root,
    {configHome, required = false, candidate: requestedCandidate} = {},
    {
      gitAddTimeoutMs = GIT_ADD_TIMEOUT_MS,
      gitStatusTimeoutMs = GIT_STATUS_TIMEOUT_MS,
      gitTimeoutMs = GIT_COMMAND_TIMEOUT_MS
    } = {}) {
  const mode = await reviewStatus(root, {configHome});
  if (!required && mode.mode !== 'enabled') {
    return {
      version: REVIEW_VERSION,
      status: 'disabled/unmanaged',
      source: mode.source
    };
  }
  return withReviewLock(root, async () => {
  const current = await readReviewState(root);
   const candidate = freezeCandidate(root, undefined, requestedCandidate,
       undefined, {gitAddTimeoutMs, gitStatusTimeoutMs, gitTimeoutMs});
  if (current) {
    if (current.subjectHash === candidate.subjectHash) {
      return {
        version: REVIEW_VERSION,
        status: 'replayed',
        binding: binding(current),
        candidate: current.candidate,
        risk: current.risk,
        changedPaths: current.paths,
        reviewers: current.reviewers,
        next_transition: current.next_transition,
        recovery_transition: current.recovery_transition
      };
    }
    throw new Error('active_transaction_exists');
  }
  const assessment = assessPaths(candidate.paths, candidate.executablePaths);
  const state = {
    version: REVIEW_VERSION,
    status: 'reviewing',
    lineage: randomUUID(),
    revision: 1,
    target: path.resolve(root),
    activation: required ? 'explicit' : 'mode',
    risk: assessment.risk, ...candidate,
    correctionCount: 0
  };
  state.reviewers = state.risk === 'high' ? ['lens', 'mirror'] :
    ['code-reviewer'];
  state.next_transition = transition(state, 'capture');
  state.recovery_transition = transition(state, 'close-without-approval');
  await writeReviewState(root, state);
  return {
    version: REVIEW_VERSION,
    status: state.status,
    binding: binding(state),
    risk: state.risk,
    candidate: state.candidate,
    changedPaths: state.paths,
    reviewers: state.reviewers,
    next_transition: state.next_transition,
    recovery_transition: state.recovery_transition
  };
  });
}

export async function materializeCandidate(root, options = {}, testOptions = {}) {
  return withReviewLock(root,
      () => materializeCandidateUnlocked(root, options, testOptions));
}

async function materializeCandidateUnlocked(root,
    {destination, subjectHash} = {}, {
      archiveTimeoutMs = GIT_ARCHIVE_TIMEOUT_MS,
      tarTimeoutMs = TAR_EXTRACT_TIMEOUT_MS,
      commandRunner
    } = {}) {
  const state = await readReviewState(root);
  if (!state) {
    throw new Error('transaction_not_found');
  }
  if (subjectHash && state.subjectHash !== subjectHash) {
    throw new Error(
        'subject_hash_mismatch');
  }
  const candidatesRoot = path.join(path.dirname(statePath(root)), 'candidates');
  await fs.mkdir(candidatesRoot, {recursive: true});
  const candidatesStat = await fs.lstat(candidatesRoot);
  if (!candidatesStat.isDirectory() || candidatesStat.isSymbolicLink()) {
    throw new Error('candidate_storage_path_invalid');
  }
  const defaultTarget = path.join(candidatesRoot, state.subjectHash);
  const target = destination ? path.resolve(destination) : defaultTarget;
  const relativeTarget = path.relative(candidatesRoot, target);
  if (target !== defaultTarget || !relativeTarget || relativeTarget === '..'
      || relativeTarget.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativeTarget) || relativeTarget.includes(path.sep)) {
    throw new Error('destination_path_traversal');
  }
  await cleanupInterruptedMaterializations(candidatesRoot, state.subjectHash);
  try {
    const targetStat = await fs.lstat(target);
    if (targetStat.isSymbolicLink()) {
      throw new Error('candidate_snapshot_path_invalid');
    }
    const candidatesRealPath = await fs.realpath(candidatesRoot);
    const targetRealPath = await fs.realpath(target);
    if (!isWithinCandidate(candidatesRealPath, targetRealPath)
        || targetRealPath === candidatesRealPath) {
      throw new Error('candidate_snapshot_path_invalid');
    }
    await secureCandidateTree(targetRealPath, targetRealPath, false);
    await assertCandidateMatchesTree(root, state.candidateTree, target);
    return {
      version: REVIEW_VERSION,
      subjectHash: state.subjectHash,
      path: target,
      readOnly: true
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  const staging = path.join(candidatesRoot,
      `${state.subjectHash}.staging-${randomUUID()}`);
  await fs.mkdir(staging);
  const archive = path.join(os.tmpdir(),
      `agent-harness-review-${randomUUID()}.tar`);
  try {
    const entries = gitTreeEntries(root, state.candidateTree);
    if (entries.some((entry) => entry.mode === '160000')) {
      throw new Error('candidate_submodule_not_materializable');
    }
    validateCandidateTreePaths(entries, staging, process.platform);
    if (process.platform === 'win32'
        && entries.some((entry) => entry.mode === '120000')) {
      await assertSymlinkCapability();
    }
    runMaterializationCommand('git',
        ['-C', root, 'archive', state.candidateTree, '-o', archive], {
          encoding: 'utf8', timeout: archiveTimeoutMs
        }, commandRunner);
    runMaterializationCommand('tar', ['-xf', archive, '-C', staging], {
      encoding: 'utf8',
      timeout: tarTimeoutMs
    }, commandRunner);
    await secureCandidateTree(staging, staging, 'validate');
    await repairCandidateFromTree(root, entries, staging);
    await secureCandidateTree(staging, staging, true);
    await assertCandidateMatchesTree(root, state.candidateTree, staging);
    await fs.rename(staging, target);
  } catch (error) {
    await removeCandidateTree(staging);
    throw error;
  } finally {
    await fs.rm(archive, {force: true});
  }
  return {
    version: REVIEW_VERSION,
    subjectHash: state.subjectHash,
    path: target,
    readOnly: true
  };
}

function runMaterializationCommand(command, args, options, commandRunner) {
  const run = () => command === 'git'
      ? gitExec(args, options) : execFileSync(command, args, options);
  return commandRunner ? commandRunner(command, args, options, run) : run();
}

async function cleanupInterruptedMaterializations(candidatesRoot, subjectHash) {
  const prefix = `${subjectHash}.staging-`;
  for (const entry of await fs.readdir(candidatesRoot)) {
    if (entry.startsWith(prefix)) {
      await removeCandidateTree(path.join(candidatesRoot, entry));
    }
  }
}

async function assertSymlinkCapability() {
  const directory = path.join(os.tmpdir(),
      `agent-harness-symlink-probe-${process.pid}-${randomUUID()}`);
  await fs.mkdir(directory);
  try {
    await fs.symlink('target-file', path.join(directory, 'file-link'), 'file');
    await fs.mkdir(path.join(directory, 'target-directory'));
    await fs.symlink('target-directory',
        path.join(directory, 'directory-link'), 'dir');
  } catch {
    throw new Error('candidate_symlink_support_unavailable');
  } finally {
    await fs.rm(directory, {recursive: true, force: true});
  }
}

function gitTreeEntries(root, tree) {
  const output = gitExec([
    '-C', root, 'ls-tree', '-r', '-z', '--full-tree', tree
  ], {maxBuffer: GIT_OUTPUT_MAX_BUFFER, timeout: GIT_COMMAND_TIMEOUT_MS});
  return output.toString('utf8').split('\0').filter(Boolean).map((entry) => {
    const separator = entry.indexOf('\t');
    const [mode, type, oid] = entry.slice(0, separator).split(' ');
    return {mode, type, oid, path: entry.slice(separator + 1)};
  });
}

export function validateCandidateTreePaths(entries, root, platform = process.platform) {
  const rootPath = path.resolve(root);
  const windowsRoot = path.win32.resolve(root);
  const caseSensitivePaths = new Map();
  for (const entry of entries) {
    if (typeof entry.path !== 'string' || entry.path.startsWith('/')) {
      throw new Error('candidate_path_invalid');
    }
    const components = entry.path.split('/');
    if (components.some((component) =>
      !component || component === '.' || component === '..')) {
      throw new Error('candidate_path_invalid');
    }
    const destination = path.resolve(rootPath, ...components);
    if (!isWithinCandidate(rootPath, destination)) {
      throw new Error('candidate_path_escapes_tree');
    }
    if (platform !== 'win32') {
      continue;
    }
    for (let index = 0; index < components.length; index += 1) {
      const component = components[index];
      if (/[\\<>:"|?*]/.test(component) || /[. ]$/.test(component)
          || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(
              component)) {
        throw new Error('candidate_path_unsupported_on_windows');
      }
      const normalized = components.slice(0, index + 1).join('/');
      const key = normalized.toLowerCase();
      const previous = caseSensitivePaths.get(key);
      if (previous && previous !== normalized) {
        throw new Error('candidate_path_collision_on_windows');
      }
      caseSensitivePaths.set(key, normalized);
    }
    const windowsDestination = path.win32.resolve(windowsRoot, ...components);
    const windowsRelative = path.win32.relative(windowsRoot, windowsDestination);
    if (windowsRelative === '..'
        || windowsRelative.startsWith(`..${path.win32.sep}`)
        || path.win32.isAbsolute(windowsRelative)) {
      throw new Error('candidate_path_escapes_tree');
    }
  }
}

async function repairCandidateFromTree(root, entries, directory) {
  const objectFormat = git(root, ['rev-parse', '--show-object-format']);
  const expected = new Map(entries.map((entry) => [entry.path, entry]));
  const actual = await candidateEntries(root, directory, objectFormat);

  for (const file of actual.keys()) {
    if (!expected.has(file)) {
      throw new Error('candidate_materialization_mismatch');
    }
  }

  for (const entry of entries) {
    if (entry.mode === '160000') {
      throw new Error('candidate_submodule_not_materializable');
    }
    const current = actual.get(entry.path);
    if (current && gitModesMatch(entry.mode, current.mode)
        && current.oid === entry.oid) {
      continue;
    }
    const destination = path.resolve(directory, ...entry.path.split('/'));
    const relative = path.relative(directory, destination);
    if (relative === '..' || relative.startsWith(`..${path.sep}`)
        || path.isAbsolute(relative)) {
      throw new Error('candidate_path_escapes_tree');
    }
    await fs.mkdir(path.dirname(destination), {recursive: true});
    if (entry.mode === '120000') {
      if (current) {
        await removeCandidateTree(destination);
      }
      const target = gitExec(
          ['-C', root, 'cat-file', 'blob', entry.oid], {maxBuffer: 8192});
      if (target.length === 0 || target.length > 4096 || target.includes(0)) {
        throw new Error('candidate_symlink_target_invalid');
      }
      const linkTarget = target.toString('utf8');
      await fs.symlink(linkTarget, destination,
          candidateSymlinkType(entry.path, linkTarget, entries));
      continue;
    }
    if (!['100644', '100755'].includes(entry.mode)) {
      throw new Error('candidate_file_mode_unsupported');
    }
    if (current) {
      await removeCandidateTree(destination);
    }
    const contents = gitExec(
        ['-C', root, 'cat-file', 'blob', entry.oid], {maxBuffer: 64 * 1024 * 1024});
    await fs.writeFile(destination, contents, {mode: entry.mode === '100755'
      ? 0o755 : 0o644});
  }
}

export function candidateSymlinkType(linkPath, linkTarget, entries,
    platform = process.platform) {
  const normalizedTarget = platform === 'win32'
      ? linkTarget.replace(/\\/g, '/') : linkTarget;
  const targetPath = path.posix.normalize(path.posix.join(
      path.posix.dirname(linkPath), normalizedTarget));
  if (path.posix.isAbsolute(normalizedTarget) || targetPath === '..'
      || targetPath.startsWith('../')) {
    return 'file';
  }
  const directoryPrefix = targetPath === '.' ? undefined : `${targetPath}/`;
  return entries.some((entry) => directoryPrefix === undefined
      ? entry.path !== linkPath : entry.path.startsWith(directoryPrefix))
      ? 'dir' : 'file';
}

async function candidateEntries(root, directory, objectFormat) {
  const actual = new Map();
  async function collect(current, prefix = '') {
    for (const entry of await fs.readdir(current, {withFileTypes: true})) {
      const file = path.join(current, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const stat = await fs.lstat(file);
      if (stat.isSymbolicLink()) {
        const content = Buffer.from(await fs.readlink(file));
        actual.set(relative, {
          mode: '120000',
          oid: gitBlobHash(objectFormat, content)
        });
      } else if (stat.isDirectory()) {
        await collect(file, relative);
      } else if (stat.isFile()) {
        actual.set(relative, {
          mode: stat.mode & 0o111 ? '100755' : '100644',
          oid: await gitFileHash(objectFormat, file, stat.size)
        });
      } else {
        throw new Error('candidate_file_type_unsupported');
      }
    }
  }
  await collect(directory);
  return actual;
}

function gitBlobHash(objectFormat, content) {
  const header = Buffer.from(`blob ${content.length}\0`);
  return createHash(objectFormat).update(header).update(content).digest('hex');
}

function gitModesMatch(expected, actual) {
  if (process.platform === 'win32'
      && ['100644', '100755'].includes(expected)
      && ['100644', '100755'].includes(actual)) {
    return true;
  }
  return expected === actual;
}

async function gitFileHash(objectFormat, file, size) {
  const hash = createHash(objectFormat).update(Buffer.from(`blob ${size}\0`));
  for await (const chunk of createReadStream(file)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function assertCandidateMatchesTree(root, tree, directory) {
  const objectFormat = git(root, ['rev-parse', '--show-object-format']);
  if (!['sha1', 'sha256'].includes(objectFormat)) {
    throw new Error('candidate_object_format_unsupported');
  }
  const expected = new Map();
  for (const entry of gitTreeEntries(root, tree)) {
    if (entry.mode === '160000') {
      throw new Error('candidate_submodule_not_materializable');
    }
    expected.set(entry.path, {mode: entry.mode, oid: entry.oid});
  }
  const actual = await candidateEntries(root, directory, objectFormat);

  if (actual.size !== expected.size) {
    throw new Error('candidate_materialization_mismatch');
  }
  for (const [file, expectedEntry] of expected) {
    const actualEntry = actual.get(file);
    if (!actualEntry || !gitModesMatch(expectedEntry.mode, actualEntry.mode)
        || actualEntry?.oid !== expectedEntry.oid) {
      throw new Error('candidate_materialization_mismatch');
    }
  }
}

async function removeCandidateTree(directory) {
  let stat;
  try {
    stat = await fs.lstat(directory);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
  if (stat.isSymbolicLink()) {
    await fs.rm(directory, {force: true});
    return;
  }
  if (!stat.isDirectory()) {
    await fs.chmod(directory, 0o600);
    await fs.rm(directory, {force: true});
    return;
  }
  await fs.chmod(directory, 0o700);
  for (const entry of await fs.readdir(directory)) {
    await removeCandidateTree(path.join(directory, entry));
  }
  await fs.rm(directory, {recursive: true, force: true});
}

async function secureCandidateTree(directory, root, makeReadOnly) {
  const directoryEdges = [];
  const rootReal = await fs.realpath(root);
  await inspectCandidateTree(directory, rootReal, makeReadOnly, directoryEdges);
  assertAcyclicCandidateDirectories(directoryEdges);
}

async function inspectCandidateTree(directory, root, makeReadOnly,
    directoryEdges) {
  const actualDirectory = await fs.realpath(directory);
  const stat = await fs.lstat(actualDirectory);
  if (stat.isSymbolicLink()) {
    throw new Error('candidate_symlink_escapes_tree');
  }
  if (!stat.isDirectory()) {
    if (makeReadOnly === true) {
      await fs.chmod(directory, stat.mode & 0o111 ? 0o555 : 0o444);
    } else if (makeReadOnly === false && stat.mode & 0o222) {
      throw new Error('candidate_materialization_not_read_only');
    }
    return;
  }

  for (const entry of await fs.readdir(actualDirectory, {withFileTypes: true})) {
    const file = path.join(actualDirectory, entry.name);
    const childStat = await fs.lstat(file);
    if (childStat.isSymbolicLink()) {
      const link = await fs.readlink(file);
      const resolved = await resolveCandidateLink(root, path.dirname(file), link,
          new Set([file]));
      try {
      const targetStat = await fs.stat(resolved);
      if (targetStat.isDirectory()) {
        const targetDirectory = await fs.realpath(resolved);
        directoryEdges.push([
            path.relative(root, actualDirectory).replace(/\\/g, '/') || '.',
            path.relative(root, targetDirectory).replace(/\\/g, '/') || '.'
        ]);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      continue;
    }
    if (childStat.isDirectory()) {
      const childDirectory = await fs.realpath(file);
      directoryEdges.push([
        path.relative(root, actualDirectory).replace(/\\/g, '/') || '.',
        path.relative(root, childDirectory).replace(/\\/g, '/') || '.'
      ]);
      await inspectCandidateTree(childDirectory, root, makeReadOnly,
          directoryEdges);
    } else if (makeReadOnly === true) {
      await fs.chmod(file, childStat.mode & 0o111 ? 0o555 : 0o444);
    } else if (makeReadOnly === false && childStat.mode & 0o222) {
      throw new Error('candidate_materialization_not_read_only');
    }
  }

  if (makeReadOnly === true) {
    await fs.chmod(actualDirectory, 0o555);
  } else if (makeReadOnly === false && stat.mode & 0o222) {
    throw new Error('candidate_materialization_not_read_only');
  }
}

function assertAcyclicCandidateDirectories(edges) {
  const graph = new Map();
  for (const [from, to] of edges) {
    const adjacent = graph.get(from) ?? [];
    adjacent.push(to);
    graph.set(from, adjacent);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(directory) {
    if (visiting.has(directory)) {
      throw new Error('candidate_symlink_cycle');
    }
    if (visited.has(directory)) {
      return;
    }
    visiting.add(directory);
    for (const next of graph.get(directory) ?? []) {
      visit(next);
    }
    visiting.delete(directory);
    visited.add(directory);
  }
  for (const directory of graph.keys()) {
    visit(directory);
  }
}

async function resolveCandidateLink(root, directory, link, seen) {
  if (path.isAbsolute(link)) {
    throw new Error('candidate_symlink_escapes_tree');
  }
  const rootPath = path.resolve(root);
  let current = path.resolve(directory);
  const parts = link.split(process.platform === 'win32' ? /[\\/]+/ : '/');

  for (const [index, part] of parts.entries()) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      current = path.dirname(current);
      if (!isWithinCandidate(rootPath, current)) {
        throw new Error('candidate_symlink_escapes_tree');
      }
      continue;
    }

    const next = path.resolve(current, part);
    if (!isWithinCandidate(rootPath, next)) {
      throw new Error('candidate_symlink_escapes_tree');
    }
    let stat;
    try {
      stat = await fs.lstat(next);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      current = next;
      continue;
    }
    if (stat.isSymbolicLink()) {
      if (seen.has(next)) {
        throw new Error('candidate_symlink_cycle');
      }
      const target = await fs.readlink(next);
      current = await resolveCandidateLink(rootPath, path.dirname(next), target,
          new Set([...seen, next]));
    } else {
      const remaining = parts.slice(index + 1).filter(
          (component) => component && component !== '.');
      if (remaining.length > 0 && !stat.isDirectory()) {
        throw new Error('candidate_symlink_target_invalid');
      }
      current = next;
    }
  }

  if (!isWithinCandidate(rootPath, current)) {
    throw new Error('candidate_symlink_escapes_tree');
  }
  return current;
}

function isWithinCandidate(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..'
      && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export async function captureReview(root, input) {
  return withReviewLock(root, async () => {
  const state = await readReviewState(root);
  if (!state) {
    throw new Error('transaction_not_found');
  }
  requireBinding(state, input);
  const correctionReview = state.status === 'reviewing_correction';
  if (state.status !== 'reviewing' && !correctionReview) {
    throw new Error('transition_not_allowed');
  }
  if (await invalidateStalePullRequest(root, state)) {
    throw new Error('candidate_pull_request_oid_stale');
  }
  const materialized = await materializeCandidateUnlocked(root, {
    subjectHash: state.subjectHash
  });
  if (input.candidatePath !== materialized.path) {
    throw new Error('candidate_path_binding_mismatch');
  }
  if (!Array.isArray(input.findings)) {
    throw new Error('review_findings_invalid');
  }
  if (!input.findings.every(validReviewFinding)) {
    throw new Error('review_finding_invalid');
  }
  const aggregateFindings = new Map();
  for (const finding of input.findings) {
    const fingerprint = reviewFindingFingerprint(finding);
    if (aggregateFindings.has(finding.id)) {
      throw new Error('review_finding_invalid');
    }
    aggregateFindings.set(finding.id, fingerprint);
  }
  const reviewers = new Set(input.reviewers ?? []);
  const reviewEvidence = Array.isArray(input.reviewEvidence)
      ? input.reviewEvidence : [];
  const evidence = new Map(reviewEvidence.map((item) => [
    item?.reviewer, item
  ]));
  const evidenceFindings = new Map();
  const reviewerFindingsValid = reviewEvidence.every((item) => {
    if (!Array.isArray(item?.findings)
        || !item.findings.every(validReviewFinding)) {
      return false;
    }
    const reviewerFindingIds = new Set();
    for (const finding of item.findings) {
      const fingerprint = reviewFindingFingerprint(finding);
      if (reviewerFindingIds.has(finding.id)) {
        return false;
      }
      reviewerFindingIds.add(finding.id);
      const previous = evidenceFindings.get(finding.id);
      if (previous && previous !== fingerprint) {
        return false;
      }
      evidenceFindings.set(finding.id, fingerprint);
    }
    return true;
  });
  if (!reviewerFindingsValid) {
    throw new Error('review_evidence_incomplete');
  }
  const findingsMatch = reviewerFindingsValid
      && aggregateFindings.size === evidenceFindings.size
      && [...aggregateFindings].every(([id, fingerprint]) =>
        evidenceFindings.get(id) === fingerprint);
  if (!findingsMatch) {
    throw new Error('review_evidence_findings_mismatch');
  }
  const inspectionComplete = reviewers.size === state.reviewers.length
      && state.reviewers.every((reviewer) => {
        const item = evidence.get(reviewer);
        const lenses = Array.isArray(item?.lenses) ? item.lenses : [];
        const lensMap = new Map(lenses.map((lens) => [lens?.lens, lens]));
        const lensFindingLenses = new Set(lenses.filter(
            (lens) => lens?.outcome === 'FINDING').map((lens) => lens.lens));
        const reviewerFindingLenses = new Set((item?.findings ?? []).map(
            (finding) => finding.lens));
        return reviewers.has(reviewer)
            && item?.subjectHash === state.subjectHash
            && item?.candidatePath === materialized.path
            && item?.verdict && ['CLEAN', 'FINDINGS'].includes(item.verdict)
            && (item.verdict === 'FINDINGS') === (item.findings.length > 0)
            && lenses.length === REVIEW_LENSES.length
            && lensMap.size === REVIEW_LENSES.length
            && REVIEW_LENSES.every((lens) => {
              const assessment = lensMap.get(lens);
              return ['PASS', 'FINDING', 'NOT_APPLICABLE'].includes(
                  assessment?.outcome)
                  && typeof assessment.rationale === 'string'
                  && assessment.rationale.trim().length > 0;
            })
            && lensFindingLenses.size === reviewerFindingLenses.size
            && [...reviewerFindingLenses].every(
                (lens) => lensFindingLenses.has(lens));
      })
      && evidence.size === state.reviewers.length;
  if (!inspectionComplete) {
    throw new Error('review_evidence_incomplete');
  }
  const severe = (input.findings ?? []).some(
      (finding) => finding?.candidateCaused === true && ['CRITICAL', 'P0',
        'P1'].includes(normalizedReviewSeverity(finding.severity)));
  state.findings = input.findings;
  state.reviewerEvidence = reviewEvidence;
  state.revision += 1;
  if (!inspectionComplete) {
    state.status = 'escalated';
    delete state.next_transition;
  } else if (severe && !correctionReview && state.correctionCount < 1) {
    state.status = 'correction_pending';
    state.next_transition = transition(state, 'capture-correction');
  } else if (severe) {
    state.status = 'escalated';
    delete state.next_transition;
  } else {
    state.status = 'approved';
    state.next_transition = transition(state, 'acknowledge-approved');
  }
  if (state.status === 'approved') {
    delete state.recovery_transition;
  } else {
    state.recovery_transition = transition(state, 'close-without-approval');
  }
  await writeReviewState(root, state);
  return {
    version: REVIEW_VERSION,
    status: state.status,
    binding: binding(state),
    candidate: state.candidate,
    changedPaths: state.paths,
    recovery_transition: state.recovery_transition, ...(state.next_transition
        ? {next_transition: state.next_transition} : {})
  };
  });
}

export async function captureCorrection(root, input, {
  ghTimeoutMs = GH_TIMEOUT_MS,
  fetchTimeoutMs = GIT_FETCH_TIMEOUT_MS
} = {}) {
  const preparedState = await readReviewState(root);
  requireCorrectionPending(preparedState, input);
  const preparedStateDigest = digest(preparedState);
  let preparedPullRequest;
  if (preparedState.candidate?.kind === 'pull-request') {
    if (!input.candidate) {
      throw new Error('candidate_pull_request_successor_required');
    }
    const requestIdentity = pullRequestIdentity(input.candidate.url);
    if (requestIdentity.url !== preparedState.candidate.url) {
      throw new Error('candidate_pull_request_target_mismatch');
    }
    const hasRequestedOids = input.candidate.baseSha !== undefined
        || input.candidate.headSha !== undefined;
    const requestedCandidate = hasRequestedOids
        ? pullRequestCandidate(root, input.candidate) : undefined;
    if (requestedCandidate) {
      try {
        git(root, ['merge-base', '--is-ancestor',
          preparedState.candidate.headSha, requestedCandidate.headSha]);
      } catch {
        throw new Error('candidate_pull_request_successor_not_descendant');
      }
    }
    const resolved = await resolvePullRequestCandidate(root,
        preparedState.candidate.url, {ghTimeoutMs, fetchTimeoutMs});
    preparedPullRequest = {
      requestUrl: requestIdentity.url,
      requestedCandidate,
      resolvedCandidate: resolved.candidate
    };
  }

  return withReviewLock(root, async () => {
  const state = await readReviewState(root);
  requireCorrectionPending(state, input);
  if (digest(state) !== preparedStateDigest) {
    throw new Error('correction_receipt_changed');
  }
  let successor;
  if (state.candidate?.kind === 'pull-request') {
    if (!preparedPullRequest) {
      throw new Error('candidate_pull_request_successor_required');
    }
    const requested = preparedPullRequest.requestedCandidate
        ?? preparedPullRequest.resolvedCandidate;
    const resolved = preparedPullRequest.resolvedCandidate;
    if (preparedPullRequest.requestUrl !== state.candidate.url
        || requested.url !== state.candidate.url
        || resolved.url !== state.candidate.url) {
      throw new Error('candidate_pull_request_target_mismatch');
    }
    if (requested.baseSha !== resolved.baseSha
        || requested.headSha !== resolved.headSha) {
      throw new Error('candidate_pull_request_not_current');
    }
    try {
      git(root, ['merge-base', '--is-ancestor', state.candidate.headSha,
        requested.headSha]);
    } catch {
      throw new Error('candidate_pull_request_successor_not_descendant');
    }
    successor = freezeCandidate(root, undefined, requested);
  } else {
    successor = freezeCandidate(root, undefined, undefined, state.baseSha);
  }
  if (successor.candidateTree === state.candidateTree) {
    throw new Error('candidate_correction_unchanged');
  }
  if (!['PASS', 'FAIL'].includes(input.validatorStatus)
      || !Array.isArray(input.validationEvidence)
      || input.validationEvidence.length === 0
      || !input.validationEvidence.every((item) => item
        && typeof item.command === 'string' && item.command.trim().length > 0
        && item.candidateTree === successor.candidateTree
        && ['PASS', 'FAIL'].includes(item.status)
        && Number.isInteger(item.exitCode)
        && (item.status === 'PASS' ? item.exitCode === 0 : item.exitCode !== 0))) {
    throw new Error('correction_validation_evidence_incomplete');
  }
  const validationPassed = input.validationEvidence.every((item) =>
    item.status === 'PASS' && item.exitCode === 0);
  if ((input.validatorStatus === 'PASS' && !validationPassed)
      || (input.validatorStatus === 'FAIL' && validationPassed)) {
    throw new Error('correction_validation_evidence_mismatch');
  }
  state.correctionHistory ??= [];
  state.correctionHistory.push({
    subjectHash: state.subjectHash,
    candidate: state.candidate,
    candidateTree: state.candidateTree,
    baseSha: state.baseSha,
    paths: state.paths,
    risk: state.risk,
    reviewers: state.reviewers,
    findings: state.findings,
    reviewerEvidence: state.reviewerEvidence
  });
  state.findings = [];
  state.reviewerEvidence = [];
  state.successorTree = successor.candidateTree;
  state.baseSha = successor.baseSha;
  state.candidate = successor.candidate;
  state.candidateTree = successor.candidateTree;
  state.paths = successor.paths;
  state.subjectHash = successor.subjectHash;
  state.validationEvidence = input.validationEvidence;
  state.correctionCount = 1;
  state.revision += 1;
  state.risk = assessPaths(successor.paths, successor.executablePaths).risk;
  state.reviewers = state.risk === 'high' ? ['lens', 'mirror'] :
    ['code-reviewer'];
  state.status = validationPassed
      ? 'reviewing_correction' : 'escalated';
  if (state.status === 'reviewing_correction') {
    state.next_transition = transition(state, 'capture-correction-review');
  } else {
    delete state.next_transition;
  }
  state.recovery_transition = transition(state, 'close-without-approval');
  await writeReviewState(root, state);
  return {
    version: REVIEW_VERSION,
    status: state.status,
    binding: binding(state),
    candidate: state.candidate,
    risk: state.risk,
    changedPaths: state.paths,
    reviewers: state.reviewers,
    recovery_transition: state.recovery_transition, ...(state.next_transition
        ? {next_transition: state.next_transition} : {})
  };
  });
}

export async function closeReview(root, input) {
  return withReviewLock(root, async () => {
  const file = await safeStatePath(root);
  const state = await readReviewState(root);
  if (!state) {
    throw new Error('transaction_not_found');
  }
  requireBinding(state, input);
  if (!['reviewing', 'correction_pending', 'reviewing_correction',
    'escalated', 'invalidated'].includes(state.status)) {
    throw new Error('close_not_allowed');
  }
  if (typeof input.resolution !== 'string' || !input.resolution.trim()) {
    throw new Error('close_resolution_required');
  }
  if (state.status !== 'invalidated'
      && await invalidateStalePullRequest(root, state)) {
    throw new Error('candidate_pull_request_oid_stale');
  }
  if (typeof state.recovery_transition?.token !== 'string'
      || !state.recovery_transition.token) {
    state.recovery_transition = transition(state, 'close-without-approval');
    await writeReviewState(root, state);
    return {
      version: REVIEW_VERSION,
      status: 'recovery_required',
      binding: binding(state),
      recovery_transition: state.recovery_transition
    };
  }
  if (typeof state.recovery_transition?.token !== 'string'
      || !state.recovery_transition.token
      || input.recoveryToken !== state.recovery_transition.token) {
    throw new Error('recovery_token_invalid');
  }

  const historyDirectory = path.join(path.dirname(file), 'history');
  const historyPath = path.join(historyDirectory,
      `${state.lineage}-${state.revision}-closed.json`);
  let historyDirectoryStat;
  try {
    historyDirectoryStat = await fs.lstat(historyDirectory);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    await fs.mkdir(historyDirectory, {mode: 0o700});
    historyDirectoryStat = await fs.lstat(historyDirectory);
  }
  if (!historyDirectoryStat.isDirectory()
      || historyDirectoryStat.isSymbolicLink()) {
    throw new Error('review_history_path_invalid');
  }
  if (process.platform !== 'win32') {
    await fs.chmod(historyDirectory, 0o700);
  }
  try {
    const historyFileStat = await fs.lstat(historyPath);
    if (!historyFileStat.isFile() || historyFileStat.isSymbolicLink()) {
      throw new Error('review_history_path_invalid');
    }
    if (process.platform !== 'win32') {
      await fs.chmod(historyPath, 0o600);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  const cleanupWarnings = await cleanupCandidateCopies(root, state);
  if (cleanupWarnings.length > 0) {
    return {
      version: REVIEW_VERSION,
      status: 'cleanup_pending',
      binding: binding(state),
      recovery_transition: state.recovery_transition,
      cleanupWarnings
    };
  }
  state.status = 'closed_without_approval';
  state.resolution = input.resolution.trim();
  state.closedAt = new Date().toISOString();
  delete state.next_transition;
  delete state.recovery_transition;
  await safeStatePath(root);
  await writeHistoryReceiptExclusive(historyPath, state);
  await fs.rm(file, {force: true});
  return {
    version: REVIEW_VERSION,
    status: state.status,
    lineage: state.lineage,
    revision: state.revision,
    resolution: state.resolution,
    historyPath
  };
  });
}

export async function acknowledgeApproved(root, input) {
  return withReviewLock(root, async () => {
  const state = await readReviewState(root);
  if (!state) {
    throw new Error('transaction_not_found');
  }
  requireBinding(state, input);
  if (state.status !== 'approved') {
    throw new Error(
        'acknowledgement_not_allowed');
  }
  if (await invalidateStalePullRequest(root, state)) {
    throw new Error('candidate_pull_request_oid_stale');
  }
  if (input.acknowledgement !== state.next_transition?.token) {
    throw new Error(
        'acknowledgement_invalid');
  }
  const stateFile = await safeStatePath(root);
  const historyDirectory = path.join(path.dirname(stateFile), 'history');
  const historyPath = path.join(historyDirectory,
      `${state.lineage}-${state.revision}-approved.json`);
  let historyDirectoryStat;
  try {
    historyDirectoryStat = await fs.lstat(historyDirectory);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    await fs.mkdir(historyDirectory, {mode: 0o700});
    historyDirectoryStat = await fs.lstat(historyDirectory);
  }
  if (!historyDirectoryStat.isDirectory()
      || historyDirectoryStat.isSymbolicLink()) {
    throw new Error('review_history_path_invalid');
  }
  if (process.platform !== 'win32') {
    await fs.chmod(historyDirectory, 0o700);
  }
  try {
    const historyFileStat = await fs.lstat(historyPath);
    if (!historyFileStat.isFile() || historyFileStat.isSymbolicLink()) {
      throw new Error('review_history_path_invalid');
    }
    if (process.platform !== 'win32') {
      await fs.chmod(historyPath, 0o600);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  const cleanupWarnings = await cleanupCandidateCopies(root, state);
  if (cleanupWarnings.length > 0) {
    return {
      version: REVIEW_VERSION,
      status: 'cleanup_pending',
      binding: binding(state),
      cleanupWarnings
    };
  }
  delete state.next_transition;
  delete state.recovery_transition;
  state.acknowledgedAt = new Date().toISOString();
  await writeHistoryReceiptExclusive(historyPath, state);
  await fs.rm(stateFile, {force: true});
  return {
    version: REVIEW_VERSION,
    status: 'burned',
    lineage: state.lineage,
    revision: state.revision,
    historyPath
  };
  });
}

async function cleanupCandidateCopies(root, state) {
  const candidatesRoot = path.join(path.dirname(statePath(root)), 'candidates');
  let candidatesStat;
  try {
    candidatesStat = await fs.lstat(candidatesRoot);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    return [`candidate_cleanup_failed:storage:${error.message}`];
  }
  if (!candidatesStat.isDirectory() || candidatesStat.isSymbolicLink()) {
    return ['candidate_cleanup_failed:storage:unsafe_path'];
  }
  const candidatesRealPath = await fs.realpath(candidatesRoot);
  const hashes = new Set([
    state.subjectHash,
    ...(state.correctionHistory ?? []).map((item) => item.subjectHash)
  ]);
  const warnings = [];
  for (const hash of hashes) {
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) {
      continue;
    }
    try {
      await cleanupInterruptedMaterializations(candidatesRoot, hash);
      const target = path.join(candidatesRoot, hash);
      const targetStat = await fs.lstat(target);
      if (!targetStat.isSymbolicLink()) {
        const targetRealPath = await fs.realpath(target);
        if (!isWithinCandidate(candidatesRealPath, targetRealPath)) {
          throw new Error('unsafe_candidate_path');
        }
      }
      await removeCandidateTree(target);
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      warnings.push(`candidate_cleanup_failed:${hash}:${error.message}`);
    }
  }
  return warnings;
}
