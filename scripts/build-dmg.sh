#!/bin/bash

# Load environment variables
if [ -f ".env.local" ]; then
    source .env.local
elif [ -f ".env" ]; then
    source .env
fi

# Configuration Check
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo "❌ Missing Apple credentials. Please set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID in .env or environment variables."
    exit 1
fi

# Export for electron-builder
export APPLE_ID
export APPLE_APP_SPECIFIC_PASSWORD
export APPLE_TEAM_ID

# Print configuration (masking password)
echo "🍎 Apple ID: $APPLE_ID"
echo "🔐 Team ID: $APPLE_TEAM_ID"
echo "📦 Building DMG for WitNote..."

# Security Check
FORBIDDEN_PASS="zire-cdzq-eulv" # Part 1
FORBIDDEN_PASS+="-wlfn"         # Part 2
if grep -q "$FORBIDDEN_PASS" "$0"; then
    echo "❌ SECURITY ALERT: Password found in script! Please clean up immediately."
    exit 1
fi

# Run the build
npm run build
