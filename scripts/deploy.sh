#!/usr/bin/env bash
# Render + verify the deployable bundle. dist/ is gitignored by design —
# run this after cloning/pulling, before (re)running dotter.
# Usage: scripts/deploy.sh [--preset recommended] [--output dist/opencode]
set -euo pipefail

PRESET="${1:-${PRESET:-recommended}}"
OUTPUT="${2:-${OUTPUT:-dist/opencode}}"

# allow --preset X / --output Y flags too
while [[ $# -gt 0 ]]; do
  case "$1" in
    --preset) PRESET="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/generate-bundle.mjs render --preset "$PRESET" --output "$OUTPUT"
python3 scripts/check-refs.py --root "$OUTPUT"
echo "bundle ready: $OUTPUT (preset: $PRESET) — now run dotter deploy"
