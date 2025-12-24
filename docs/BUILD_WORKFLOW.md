# Build and Release Workflow for WitNote

This workflow outlines the standard procedure for building WitNote for all target platforms: macOS (DMG), macOS App Store (MAS), and Windows.

## Prerequisites
- Apple Developer Account with valid certificates installed.
- App Specific Password configured in `scripts/build-dmg.sh` or environment variables.
- Window code signing certificate (if applicable for win build).

## 1. Build macOS DMG (Standalone)
This step builds the standard distribution package for macOS, including notarization.

**Command:**
```bash
./scripts/build-dmg.sh
```

**Verification:**
- Check `release/WitNote-X.X.X.dmg`
- Validate notarization success in logs (Look for "✅ 公证成功！").

## 2. Build macOS App Store (MAS)
This step builds the package for Mac App Store submission.

**Command:**
```bash
npm run build:mas
```

**Verification:**
- Check `release/mas/` output.
- Ensure correct provisioning profile and entitlements are used.

## 3. Build Windows
This step builds the Windows installer (NSIS).

**Command:**
```bash
npm run build:win
```

**Verification:**
- Check `release/WitNote-X.X.X-setup.exe`

## Note on Versioning
- Ensure `package.json` version is updated before starting this workflow.
