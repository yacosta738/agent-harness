import fs from 'node:fs';import path from 'node:path';import { createHash } from 'node:crypto';import { spawnSync } from 'node:child_process';
export function normalizeImpactPath(value){if(typeof value!=='string'||!value||value.includes('\0'))throw Error('invalid_impact_path');const p=value.replaceAll('\\','/');if(p.startsWith('/')||/^[A-Za-z]:\//.test(p)||p.split('/').some(x=>x==='.'||x==='..'))throw Error('path_traversal_or_absolute');const n=p.split('/').filter(Boolean).join('/');if(!n)throw Error('invalid_impact_path');return n}
export function calculateGitImpact({projectRoot,baseSha,headSha,allowDirty=false}={}){let root;try{root=fs.realpathSync(path.resolve(projectRoot||process.cwd()));if(!fs.statSync(root).isDirectory())throw Error('project_not_directory')}catch(e){return unavailable('project_unavailable',e)}if(!baseSha||!headSha)return unavailable('git_identity_required');const b=commit(root,baseSha),h=commit(root,headSha);if(!b.ok||!h.ok)return unavailable(!b.ok?b.reason:h.reason);const d=run(root,['diff','--name-status','-z','--no-renames',b.value,h.value]);if(!d.ok)return unavailable('impact_diff_unavailable',d.error);const entries=[];try{const f=d.stdout.split('\0');for(let i=0;i<f.length-1;){const s=f[i++];if(!s)continue;const p=normalizeImpactPath(f[i++]);inside(root,p);entries.push({status:s[0],path:p})}}catch(e){return blocked('impact_path_rejected',e)}entries.sort((a,z)=>a.path.localeCompare(z.path)||a.status.localeCompare(z.status));const dirty=readDirty(root);if(!dirty.ok)return unavailable('dirty_state_unavailable',dirty.error);const impact={scope:'changed-files',base_sha:b.value,head_sha:h.value,changed:[...new Set(entries.map(x=>x.path))],entries,affected:[],affected_scope:'UNAVAILABLE:function-boundary-adapter-not-registered'};impact.impact_digest=digest(impact);const blocking=dirty.paths.length&&!allowDirty;return {status:blocking?'BLOCKED':'AVAILABLE',reason:blocking?'dirty_worktree':'git_diff_available',blocking:Boolean(blocking),dirty:Boolean(dirty.paths.length),dirty_paths:dirty.paths,...impact}}
export function validateScopeEvidence({scope, reported = [], expected, impact, projectRoot} = {}) {
  if (!['project', 'changed-files'].includes(scope)) throw Error('scope_unsupported');
  let root;
  try { root = projectRoot ? fs.realpathSync(path.resolve(projectRoot)) : null; } catch (error) { return unavailable('scope_project_unavailable', error); }
  let normalizedReported;
  try {
    normalizedReported = [...new Set(reported.map(normalizeImpactPath))].sort();
    if (root) normalizedReported.forEach((value) => inside(root, value));
  } catch (error) { return blocked('scope_path_rejected', error); }
  if (scope === 'project') return { status: 'AVAILABLE', scope, paths: normalizedReported };
  const impactPaths = impact?.scope === 'changed-files' ? impact.changed : expected;
  if (!Array.isArray(impactPaths)) return unavailable('changed_files_impact_missing');
  let normalizedExpected;
  try {
    normalizedExpected = [...new Set(impactPaths.map(normalizeImpactPath))].sort();
    if (root) normalizedExpected.forEach((value) => inside(root, value));
  } catch (error) { return blocked('scope_expected_path_rejected', error); }
  if (normalizedReported.length !== normalizedExpected.length || normalizedReported.some((value, index) => value !== normalizedExpected[index])) return blocked('changed_files_scope_incomplete');
  if (impact && (impact.scope !== 'changed-files' || typeof impact.impact_digest !== 'string' || !impact.impact_digest)) return unavailable('changed_files_impact_invalid');
  return { status: 'AVAILABLE', scope, paths: normalizedReported, impact_digest: impact?.impact_digest };
}
export const impactDigest=digest;
function commit(root,ref){if(typeof ref!=='string'||!ref.trim()||ref.includes('\0'))return {ok:false,reason:'git_ref_invalid'};const r=run(root,['rev-parse','--verify','--end-of-options',`${ref}^{commit}`]);return r.ok&&/^[0-9a-f]{40,64}$/i.test(r.stdout.trim())?{ok:true,value:r.stdout.trim()}:{ok:false,reason:'git_ref_unavailable'}}
function readDirty(root){const r=run(root,['status','--porcelain=v1','-z']);if(!r.ok)return r;const paths=[];for(const x of r.stdout.split('\0'))if(x){try{paths.push(normalizeImpactPath(x.slice(2).trimStart().split(' -> ').at(-1)))}catch(e){return {ok:false,error:e}}}return {ok:true,paths:[...new Set(paths)].sort()}}
function inside(root,p){const rr=fs.realpathSync(root),a=path.join(root,...p.split('/'));let q=a;while(!fs.existsSync(q)&&q!==root)q=path.dirname(q);const real=fs.realpathSync(q);if(real!==rr&&!real.startsWith(`${rr}${path.sep}`))throw Error('path_symlink_outside_project')}
function run(root,args){const r=spawnSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:4*1024*1024});return r.error?{ok:false,error:r.error}:r.status?{ok:false,error:Error((r.stderr||'').trim()||'git_command_failed')}:{ok:true,stdout:r.stdout||''}}
function digest(v){return createHash('sha256').update(stable(v)).digest('hex')};function stable(v){if(Array.isArray(v))return`[${v.map(stable).join(',')}]`;if(v&&typeof v==='object')return`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;return JSON.stringify(v)}
function unavailable(reason,error){return {status:'UNAVAILABLE',blocking:false,reason,error:error?.message,scope:'changed-files',changed:[],affected:[]}}function blocked(reason,error){return {status:'BLOCKED',blocking:true,reason,error:error?.message,scope:'changed-files',changed:[],affected:[]}}
