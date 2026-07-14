#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/tmp/gopass-jsonapi.log"

touch "$LOG_FILE"
tail -f "$LOG_FILE" | sed 's/^/[JSONAPI LOG] /' &

tests/e2e/setup/configure_gopass_test.sh

npm run test:e2e:internal
