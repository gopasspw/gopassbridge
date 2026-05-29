#!/usr/bin/env bash
set -euo pipefail

make develop

docker build -t gopassbridge-e2e-test -f tests/e2e/setup/Dockerfile .

docker run --rm -i \
  --init \
  -v "$(pwd):/workspace" \
  gopassbridge-e2e-test
