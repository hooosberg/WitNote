#!/bin/bash

# Configuration
echo "📦 Building Windows Installer (NSIS) for WitNote..."

# Run the build
# This will run `tsc && vite build` and then `electron-builder --win`
# We use --win flag to target Windows specifically
npm run build:win
