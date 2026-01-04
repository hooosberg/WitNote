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

8. Create GitHub release via CLI or web UI with the tag and paste release notes.

---

## Quick Command (After Editing version in package.json)

```bash
# All-in-one (replace X.X.X with version)
git add -A && git commit -m "chore: release vX.X.X" && git tag vX.X.X && git push origin main --tags
```
