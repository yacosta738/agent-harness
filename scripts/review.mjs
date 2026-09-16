#!/usr/bin/env node
import { assessCandidate, startReview, captureReview, captureCorrection, acknowledgeApproved, setReviewMode, reviewStatus, materializeCandidate } from './review-lib.mjs';

const args = process.argv.slice(2); const command = args.shift();
const root = value('--cwd') ?? process.cwd(); const configHome = value('--config-home'); const scope = value('--scope') ?? 'global';
function value(flag) { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; }
function json(result) { process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); }
function binding() { return { lineage: value('--lineage'), revision: Number(value('--revision')), target: value('--target'), subjectHash: value('--subject-hash') }; }

try {
  let result;
  if (command === 'mode') { const action = args.shift(); result = action === 'status' ? await reviewStatus(root, { configHome }) : await setReviewMode(root, action, { configHome, scope }); }
  else if (command === 'assess') result = assessCandidate(root);
  else if (command === 'status') result = await reviewStatus(root, { configHome });
  else if (command === 'start') result = await startReview(root, { configHome });
  else if (command === 'materialize') result = await materializeCandidate(root, { subjectHash: value('--subject-hash'), destination: value('--destination') });
  else if (command === 'capture') result = await captureReview(root, { ...binding(), findings: JSON.parse(value('--findings') ?? '[]'), reviewers: value('--reviewers')?.split(',').filter(Boolean), configHome });
  else if (command === 'capture-correction') result = await captureCorrection(root, { ...binding(), validatorStatus: value('--validator-status'), configHome });
  else if (command === 'acknowledge-approved') result = await acknowledgeApproved(root, { ...binding(), acknowledgement: value('--acknowledgement'), configHome });
  else throw new Error('usage: review.mjs mode|assess|status|start|materialize|capture|capture-correction|acknowledge-approved');
  json(result);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
