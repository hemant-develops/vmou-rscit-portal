$ErrorActionPreference = "Stop"

$changes = git status --porcelain
if (-not $changes) {
  Write-Host "No local changes to undo."
  exit 0
}

git restore --staged .
git restore .
Write-Host "Local uncommitted changes were restored to the last commit."
