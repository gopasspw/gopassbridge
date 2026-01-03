#!/usr/bin/env bash
set -euo pipefail

function log {
    echo "[CONFIGURE TEST] $1"
}

GOPASS_AGE_PASSWORD="$(openssl rand -base64 16)"
export GOPASS_AGE_PASSWORD

gopass version
gopass setup --crypto age

gopass-jsonapi version

mkdir -p /root/.config/gopass
echo "y" | gopass-jsonapi configure --browser chromium --global --path /root/.config/gopass

# Expected global manifest path for Chromium
MANIFEST_PATH="/etc/chromium/native-messaging-hosts/com.justwatch.gopass.json"

if [ ! -f "$MANIFEST_PATH" ]; then
    log "Error: Manifest not found at $MANIFEST_PATH"
    exit 1
fi

PROD_ID="kkhfnlkhiapbiehimabddjbimfaijdhk"
DEV_ID="nmlipgjeejicjaapphmmonmlfkecmnoi"

# Use dev package extension ID in browser manifest
sed -i 's/'$PROD_ID'/'$DEV_ID'/g' "$MANIFEST_PATH"

# Enable debug logging in the wrapper script
WRAPPER_PATH="$(jq -r '.path' "$MANIFEST_PATH")"
sed -i 's/# export GOPASS_DEBUG_LOG/export GOPASS_DEBUG_LOG/g' "$WRAPPER_PATH"
log "Enabled debug logging in $WRAPPER_PATH"

# output wrapper script content with [WRAPPER] prefix
sed 's/^/[WRAPPER SCRIPT] /' "$WRAPPER_PATH"
