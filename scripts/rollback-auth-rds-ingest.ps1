$ErrorActionPreference = "Stop"

$backup = Join-Path $PSScriptRoot "..\.codex-backups\auth-rds-ingest-20260807-051710"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Test-Path $backup)) {
  throw "Backup folder not found: $backup"
}

$createdFiles = @(
  ".env.local",
  "proxy.ts",
  "app\sign-in\[[...sign-in]]\page.tsx",
  "app\unauthorized\page.tsx",
  "scripts\lib\sources.ts",
  "scripts\lib\loader.ts",
  "src\types\pg-copy-streams.d.ts",
  "drizzle\0001_rds_trigram_ingest.sql"
)

foreach ($file in $createdFiles) {
  $target = Join-Path $root $file
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Force
  }
}

Get-ChildItem -Path $backup -File -Recurse | ForEach-Object {
  $relative = $_.FullName.Substring((Resolve-Path $backup).Path.Length + 1)
  $target = Join-Path $root $relative
  New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
  Copy-Item -LiteralPath $_.FullName -Destination $target -Force
}

$emptyDirs = @(
  "app\sign-in\[[...sign-in]]",
  "app\sign-in",
  "app\unauthorized",
  "scripts\lib",
  "src\types"
)

foreach ($dir in $emptyDirs) {
  $target = Join-Path $root $dir
  if ((Test-Path -LiteralPath $target) -and -not (Get-ChildItem -LiteralPath $target -Force)) {
    Remove-Item -LiteralPath $target -Force
  }
}

Write-Host "Rollback restored files from $backup"
