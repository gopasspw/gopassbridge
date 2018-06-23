#!/usr/bin/env bash
set -eu
set -o pipefail

cd $(dirname "$0")

go build test-client.go

echo '{"type":"query", "query": ""}' | ./test-client | gopass jsonapi listen
