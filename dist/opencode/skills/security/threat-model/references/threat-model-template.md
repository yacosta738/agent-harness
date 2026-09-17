# Threat Model Template

Use this template when generating a new repository-scoped threat model. Keep
the tone concrete and repository-specific. Generic OWASP prose is a smell.

## Sections

### 1. Repository at a Glance

- What this repo is, in one paragraph.
- Primary product or runtime surface(s): CLI, library, hosted service, local
  developer UI, MCP/tooling surface, framework, etc.
- Out-of-scope surfaces: examples, tests, fixtures, generated/vendor code,
  local-only developer tools. Explicitly named.

### 2. Assets and Privileges

- Sensitive data handled (credentials, PII, signing keys, billing, source
  code, model weights, etc.).
- Privileged actions or surfaces (admin endpoints, infra access, code
  execution, package publishing, signing).

### 3. Trust Boundaries

List each boundary as `boundary_name: from → to`. Examples:

- `network: external user → app server`
- `auth: unauthenticated request → authenticated session`
- `tenant: tenant A context → tenant B data`
- `tool: app process → shell or filesystem`
- `build: CI → release artifact`

### 4. Attacker-Controlled Inputs

Enumerate the classes of input the threat model considers attacker-controlled:

- HTTP request bodies, headers, query params
- File uploads, parsed documents, archives
- User-supplied templates, expressions, regexes
- Imported config, plugins, extensions
- Cross-tenant identifiers, IDs, slugs
- Identity-provider assertions, OAuth/OIDC tokens
- Cron, webhooks, callback URLs
- Git refs, branch names, commit messages

For each, name the surface that accepts it and the closest control that
guards it (or note "no guard").

### 5. Security Invariants

The code MUST preserve:

- Authn/authz decisions are not bypassed by client-supplied identity.
- Tenant isolation: a request authenticated as tenant A cannot read or
  mutate tenant B's data.
- Secrets, signing keys, and credentials never leave trusted storage and
  never appear in logs, errors, or telemetry.
- User-supplied input cannot achieve code execution, file write outside the
  intended scope, or SSRF to internal-only endpoints.
- Privilege escalation requires explicit re-authentication or admin gate.
- Release artifacts, signed packages, and CI artifacts are not mutable by
  untrusted parties after signing.

### 6. Repository-Wide Failure Modes

The classes of bug that would hurt most in this repo:

- Authn/authz bypass, IDOR, privilege escalation.
- Credential or signing key exposure.
- Cross-tenant data leakage.
- Server-side code execution (RCE, SSTI, deserialization).
- Supply-chain compromise (build, publish, dependencies).
- SSRF reaching internal services or cloud metadata.
- Path traversal or arbitrary file write in executable or config paths.
- Logic flaws in money/billing/quota/permission flows.

### 7. Out-of-Scope Surfaces

Explicitly list:

- Test, fixture, and example code.
- Generated and vendored code.
- Local-only developer tooling.
- Documentation snippets.
- Deprecated or experimental features that the repo flags as unsupported.

### 8. Assumptions and Open Questions

List the operational and deployment assumptions the threat model relies on,
and any open questions that future scans should answer.

- Assumption: TLS terminates at the load balancer; downstream traffic is
  trusted.
- Assumption: dependency upgrades go through Dependabot or manual PR.
- Question: is the public webhook endpoint authenticated by signature or by
  secret in URL?