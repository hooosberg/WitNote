#!/bin/bash

# Configuration
echo "📦 Building Linux Packages (AppImage & Deb) for WitNote..."

# Run the build
# This will run `tsc && vite build` and then `electron-builder --linux`
# We use --linux flag to target Linux specifically
npm run build:linux
