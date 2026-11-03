#!/usr/bin/env node
import {
  acknowledgeApproved,
  assessCandidate,
  captureCorrection,
  captureReview,
  closeReview,
  materializeCandidate,
  resolvePullRequestCandidate,
  reviewStatus,
  setReviewMode,
  startReview
} from './review-lib.mjs';

const args = process.argv.slice(2);
const command = args.shift();
const root = value('--cwd') ?? process.cwd();
const configHome = value('--config-home');
const scope = value('--scope') ?? 'global';

function value(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function reviewCandidate({resolve = true} = {}) {
  const url = value('--pr-url');
  const baseSha = value('--base-sha');
  const headSha = value('--head-sha');
  if (!url && !baseSha && !headSha) {
    return undefined;
  }
  if (!url || Boolean(baseSha) !== Boolean(headSha)) {
    throw new Error('pull_request_target_requires_url_base_sha_head_sha');
  }
  if (!resolve) {
    return {kind: 'pull-request', url, ...(baseSha ? {baseSha, headSha} : {})};
  }
  const resolved = await resolvePullRequestCandidate(root, url);
  if (baseSha && (baseSha !== resolved.candidate.baseSha
      || headSha !== resolved.candidate.headSha)) {
    throw new Error('pull_request_oid_mismatch');
  }
  return resolved.candidate;
}

function json(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function binding() {
  return {
    lineage: value('--lineage'),
    revision: Number(value('--revision')),
    target: value('--target'),
    subjectHash: value('--subject-hash')
  };
}

try {
  let result;
  if (command === 'mode') {
    const action = args.shift();
    result = action === 'status' ? await reviewStatus(root, {configHome})
        : await setReviewMode(root, action, {configHome, scope});
  } else if (command === 'assess') {
    result = assessCandidate(root, await reviewCandidate());
  } else if (command === 'prepare-pr') {
    result = await resolvePullRequestCandidate(root, value('--pr-url'));
  } else if (command === 'status') {
    result = await reviewStatus(root,
        {configHome});
  } else if (command === 'start') {
    result = await startReview(root, {
      configHome,
      required: args.includes('--required'),
      candidate: await reviewCandidate()
    });
  } else if (command === 'materialize') {
    result = await materializeCandidate(root,
        {
          subjectHash: value('--subject-hash'),
          destination: value('--destination')
        });
  } else if (command === 'capture') {
    result = await captureReview(root, {
      ...binding(),
      findings: JSON.parse(value('--findings') ?? '[]'),
      reviewers: value('--reviewers')?.split(',').filter(Boolean),
      candidatePath: value('--candidate-path'),
      reviewEvidence: JSON.parse(value('--review-evidence') ?? '[]'),
      configHome
    });
  } else if (command === 'capture-correction') {
    result = await captureCorrection(
        root,
      {
          ...binding(),
          validatorStatus: value('--validator-status'),
          candidate: await reviewCandidate({resolve: false}),
          validationEvidence: JSON.parse(value('--validation-evidence') ?? '[]'),
          configHome
        });
  } else if (command === 'close') {
    result = await closeReview(root, {
      ...binding(),
      recoveryToken: value('--recovery-token'),
      resolution: value('--resolution')
    });
  } else if (command
      === 'acknowledge-approved') {
    result = await acknowledgeApproved(root,
        {
          ...binding(),
          acknowledgement: value('--acknowledgement'),
          configHome
        });
  } else {
    throw new Error(
        'usage: review.mjs mode|assess|prepare-pr|status|start|materialize|capture|capture-correction|acknowledge-approved|close');
  }
  json(result);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
