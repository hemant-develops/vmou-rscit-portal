param(
  [string]$Message = "Update project"
)

$ErrorActionPreference = "Stop"

git add -A

$changes = git status --porcelain
if (-not $changes) {
  Write-Host "No changes to commit."
  exit 0
}

git commit -m $Message
git push
