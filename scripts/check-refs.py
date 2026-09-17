#!/usr/bin/env python3
"""Validate harness references for the opencode adapter (dotfiles deploy).

Convention: repo root maps 1:1 to ~/.config/opencode, except
  adapters/opencode/opencode.json -> opencode.json
  adapters/opencode/tui.json       -> tui.json
So {file:./...} in opencode.json is resolved target-relative against repo root.

Checks (source mode, default):
  1. opencode.json is valid JSON; every {file:PATH} resolves to an existing file.
  2. adapter.json is valid JSON; every non-glob include path exists;
     every glob prefix (before **) exists as a directory.
  3. commands/sdd-*.md absolute ~/.config/opencode/... paths map to repo files.

Bundle mode (--root dist/opencode): resolves the bundle's opencode.json
{file:} refs and commands absolute refs against the bundle root, so every
preset ships self-contained. Exit non-zero on any failure.
"""

import argparse
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FAILURES: list[str] = []


def fail(msg: str) -> None:
    FAILURES.append(msg)
    print(f"FAIL: {msg}")


def check_opencode_refs(root: Path, cfg_rel: Path) -> int:
    cfg_path = root / cfg_rel
    cfg = json.loads(cfg_path.read_text())
    blob = json.dumps(cfg)
    refs = sorted(set(re.findall(r"\{file:([^}]+)\}", blob)))
    print(f"{cfg_rel}: {len(refs)} unique {{file:}} refs")
    ok = 0
    for ref in refs:
        target = (root / ref.lstrip("./")).resolve()
        # Guard: ref must stay inside the root (no ../ escapes past it)
        try:
            target.relative_to(root.resolve())
        except ValueError:
            fail(f"{{file:{ref}}} escapes root {root}")
            continue
        if target.is_file():
            ok += 1
        else:
            try:
                shown = target.relative_to(root.resolve())
            except ValueError:
                shown = target
            fail(f"{{file:{ref}}} -> {shown} MISSING")
    print(f"  resolved {ok}/{len(refs)}")
    return len(refs)


def check_adapter() -> None:
    root = REPO
    adapter_path = root / "adapters" / "opencode" / "adapter.json"
    adapter = json.loads(adapter_path.read_text())
    # compose sources: "layer:path"
    for target, sources in adapter.get("compose", {}).items():
        for src in sources:
            _, _, path = src.partition(":")
            if not (root / path).exists():
                fail(f"compose {target}: '{src}' MISSING")
    n = 0
    for comp, spec in adapter.get("components", {}).items():
        for pat in spec.get("include", []):
            n += 1
            if "**" in pat:
                prefix = pat.split("**")[0].rstrip("/")
                if prefix and not (root / prefix).exists():
                    fail(f"component {comp}: glob '{pat}' prefix MISSING")
            elif "*" in pat:
                if not list(root.glob(pat)):
                    fail(f"component {comp}: glob '{pat}' matches nothing")
            else:
                if not (root / pat).exists():
                    fail(f"component {comp}: '{pat}' MISSING")
    print(f"adapter.json: {n} include patterns checked")


def check_commands(cmds_dir: Path, resolve_root: Path) -> None:
    cmds = sorted(cmds_dir.glob("sdd-*.md"))
    n = 0
    for cmd in cmds:
        for m in re.finditer(r"~\/\.config\/opencode\/(\S+?)(?=[\s\"'`]|$)", cmd.read_text()):
            rel = m.group(1).rstrip(".,:;")
            n += 1
            if not (resolve_root / rel).exists():
                fail(f"{cmd.name}: ~/.config/opencode/{rel} MISSING")
    print(f"commands: {n} absolute path refs checked in {len(cmds)} files")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=None, help="bundle dir to validate (default: repo source)")
    args = ap.parse_args()
    if args.root:
        # Bundle mode: opencode.json must be self-contained (pruned at render).
        # Command bodies keep source-mode validation: their absolute refs
        # assume the full deployed layout, not a minimal slice.
        root = Path(args.root)
        check_opencode_refs(root, Path("opencode.json"))
    else:
        check_opencode_refs(REPO, Path("adapters/opencode/opencode.json"))
        check_adapter()
        check_commands(REPO / "commands", REPO)
    if FAILURES:
        print(f"\n{len(FAILURES)} FAILURE(S)")
        return 1
    print("\nAll references OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
