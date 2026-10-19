import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const CHECKER = fileURLToPath(new URL("../scripts/check-refs.mjs", import.meta.url));

function runChecker({ instructions, files = [] }) {
  const root = mkdtempSync(join(tmpdir(), "check-refs-test-"));
  try {
    mkdirSync(join(root, "home"), { recursive: true });
    for (const file of files) {
      const path = join(root, file);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, "test fixture\n");
    }
    writeFileSync(join(root, "home", "shared-rules.md"), "home fixture\n");
    mkdirSync(join(root, "home", "shared-rules-dir"), { recursive: true });
    writeFileSync(join(root, "opencode.json"), JSON.stringify({ instructions }));
    return spawnSync(process.execPath, [CHECKER, "--root", root], {
      encoding: "utf8",
      env: { ...process.env, HOME: join(root, "home") },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("validates matching local instruction globs", () => {
  const result = runChecker({
    instructions: ["guides/**/*.md"],
    files: ["guides/setup.md", "guides/nested/deploy.md"],
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("rejects local instruction globs with no matches", () => {
  const result = runChecker({ instructions: ["guides/*.md"] });
  assert.notEqual(result.status, 0);
});

test("does not treat HTTPS instruction URLs as local files", () => {
  const result = runChecker({ instructions: ["https://example.com/instructions.md"] });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("validates non-OpenCode home paths at their actual home location", () => {
  const valid = runChecker({ instructions: ["~/shared-rules.md"] });
  const missing = runChecker({ instructions: ["~/missing-rules.md"] });
  const directory = runChecker({ instructions: ["~/shared-rules-dir"] });
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
  assert.notEqual(missing.status, 0);
  assert.notEqual(directory.status, 0);
  assert.match(directory.stdout, /is not a file/);
});

test("preserves validation of ordinary local instruction files", () => {
  const valid = runChecker({ instructions: ["rules.md"], files: ["rules.md"] });
  const missing = runChecker({ instructions: ["missing.md"] });
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
  assert.notEqual(missing.status, 0);
});

test("rejects relative instruction paths that escape the bundle", () => {
  const root = mkdtempSync(join(tmpdir(), "check-refs-escape-test-"));
  const outside = join(root, "outside.md");
  const bundle = join(root, "bundle");
  try {
    mkdirSync(bundle, { recursive: true });
    writeFileSync(outside, "outside fixture\n");
    writeFileSync(join(bundle, "opencode.json"), JSON.stringify({ instructions: ["../outside.md"] }));
    const result = spawnSync(process.execPath, [CHECKER, "--root", bundle], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /escapes the bundle root/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects directories used as local instruction files", () => {
  const root = mkdtempSync(join(tmpdir(), "check-refs-directory-test-"));
  try {
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "opencode.json"), JSON.stringify({ instructions: ["docs"] }));
    const result = spawnSync(process.execPath, [CHECKER, "--root", root], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /is not a file/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects directories used as home-relative instruction files", () => {
  const root = mkdtempSync(join(tmpdir(), "check-refs-home-directory-test-"));
  const home = join(root, "home");
  try {
    mkdirSync(join(home, "rules"), { recursive: true });
    writeFileSync(join(root, "opencode.json"), JSON.stringify({ instructions: ["~/rules"] }));
    const result = spawnSync(process.execPath, [CHECKER, "--root", root], {
      encoding: "utf8",
      env: { ...process.env, HOME: home },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /is not a file/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects instruction symlinks that escape the bundle", () => {
  const root = mkdtempSync(join(tmpdir(), "check-refs-symlink-test-"));
  const outside = join(root, "outside.md");
  const bundle = join(root, "bundle");
  try {
    mkdirSync(bundle, { recursive: true });
    writeFileSync(outside, "outside fixture\n");
    symlinkSync(outside, join(bundle, "linked.md"));
    writeFileSync(join(bundle, "opencode.json"), JSON.stringify({ instructions: ["linked.md"] }));
    const result = spawnSync(process.execPath, [CHECKER, "--root", bundle], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /escapes the bundle root/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
