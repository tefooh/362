#!/usr/bin/env bash
# project-362 — AI that knows everything you've seen, said, or heard
# https://project362.com
# Build Project 362 (debug, no bundle) then run cross-platform E2E tests.
# Run from app root: ./e2e/run.sh   or from e2e: ./run.sh
set -e
APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_ROOT"
echo "Building Project 362 (debug, no bundle, with e2e webdriver)..."
# NEXT_PUBLIC_SCREENPIPE_E2E bypasses the billing gate by default so the suite
# exercises real features; the dedicated entitlement-gate spec re-enables it.
NEXT_PUBLIC_SCREENPIPE_E2E=true bun tauri build --no-sign --debug --verbose --no-bundle -- --features e2e
echo "Running E2E..."
bun run test:e2e
