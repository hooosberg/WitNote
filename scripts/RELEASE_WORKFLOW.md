# Release Push Workflow

Standard workflow for pushing new version releases.

## Pre-flight Checks

1. Run security scan:
```bash
bash scripts/check-security.sh
```

2. Check current git status:
```bash
git status --short
```

## Commit & Tag

3. Stage all changes:
```bash
git add -A
```

4. Commit with version message:
```bash
git commit -m "chore: release vX.X.X with [brief description]"
```

5. Create version tag:
```bash
git tag vX.X.X
```

## Push to Remote

6. Push commits:
```bash
git push origin main
```

7. Push tags:
```bash
git push origin --tags
```

## GitHub Release

8. Create GitHub release via CLI or web UI with the tag

9. Upload release assets from `release/` folder:
   - **macOS**: `WitNote-X.X.X.dmg`
   - **Windows x64**: `WitNote-X.X.X-setup-x64.exe`
   - **Windows ARM64**: `WitNote-X.X.X-setup-arm64.exe`
   - **Linux x64 AppImage**: `WitNote-X.X.X-x86_64.AppImage`
   - **Linux x64 Deb**: `WitNote-X.X.X-amd64.deb`
   - **Linux ARM64 AppImage**: `WitNote-X.X.X-arm64.AppImage`
   - **Linux ARM64 Deb**: `WitNote-X.X.X-arm64.deb`

10. Paste release notes from `scripts/RELEASE_vX.X.X.md`

---

## Quick Command (After Editing version in package.json)

```bash
# All-in-one (replace X.X.X with version)
git add -A && git commit -m "chore: release vX.X.X" && git tag vX.X.X && git push origin main --tags
```
