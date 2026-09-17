#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
node --test scripts/tests/*.test.mjs
node scripts/harness-config.mjs check
git diff --check
printf 'ODD/RDD smoke: PASS\n'
