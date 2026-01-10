#!/usr/bin/env bash
set -euo pipefail

TEST_NAME="Test User"
TEST_EMAIL="user@example.test"

git config --global user.email "$TEST_EMAIL"
git config --global user.name "$TEST_NAME"

gpg --version
gpg --batch --passphrase '' --quick-gen-key "${TEST_NAME} <${TEST_EMAIL}>"

gopass version
gopass init --crypto gpg "$TEST_EMAIL"

gopass-jsonapi version
echo "y" | gopass-jsonapi configure --browser chromium --global --path /root/.config/gopass

# Expected global manifest path for Chromium
MANIFEST_PATH="/etc/chromium/native-messaging-hosts/com.justwatch.gopass.json"

if [ ! -f "$MANIFEST_PATH" ]; then
    echo "Error: Manifest not found at $MANIFEST_PATH"
    exit 1
fi

PROD_ID="kkhfnlkhiapbiehimabddjbimfaijdhk"
DEV_ID="nmlipgjeejicjaapphmmonmlfkecmnoi"

# Use dev package extension ID in browser manifest
sed -i 's/'$PROD_ID'/'$DEV_ID'/g' "$MANIFEST_PATH"

# Enable debug logging in the wrapper script
WRAPPER_PATH="$(jq -r '.path' "$MANIFEST_PATH")"
sed -i 's/# export GOPASS_DEBUG_LOG/export GOPASS_DEBUG_LOG/g' "$WRAPPER_PATH"

# output wrapper script content with [WRAPPER] prefix
sed 's/^/[WRAPPER SCRIPT] /' "$WRAPPER_PATH"
