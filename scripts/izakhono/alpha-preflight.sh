#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo '=== IZAKHONO / CHANCELLOR PREFLIGHT ==='
npm install --ignore-scripts --no-audit --no-fund
npm test

echo '[PASS] Chancellor project preflight completed.'
