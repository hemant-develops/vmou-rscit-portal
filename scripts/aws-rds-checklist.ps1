param(
  [string]$Region = $env:AWS_REGION,
  [string]$DbIdentifier = $env:RDS_DB_IDENTIFIER
)

$ErrorActionPreference = "Stop"

$AwsCommand = (Get-Command aws -ErrorAction SilentlyContinue).Source
if (-not $AwsCommand) {
  $Candidates = @(
    "$env:ProgramFiles\Amazon\AWSCLIV2\aws.exe",
    "$env:LOCALAPPDATA\Programs\Amazon\AWSCLIV2\aws.exe"
  )
  $AwsCommand = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $AwsCommand) {
  Write-Error "AWS CLI is not installed or not available on PATH."
}

if (-not $Region) {
  Write-Error "Set AWS_REGION, for example: `$env:AWS_REGION='ap-south-1'"
}

Write-Host "AWS caller identity:"
$Identity = & $AwsCommand sts get-caller-identity --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error $Identity
}
$Identity

Write-Host ""
Write-Host "RDS instances:"
if ($DbIdentifier) {
  & $AwsCommand rds describe-db-instances --region $Region --db-instance-identifier $DbIdentifier --query "DBInstances[].{Id:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint.Address,Port:Endpoint.Port,Public:PubliclyAccessible,Vpc:DBSubnetGroup.VpcId,SecurityGroups:VpcSecurityGroups[].VpcSecurityGroupId}" --output table
} else {
  & $AwsCommand rds describe-db-instances --region $Region --query "DBInstances[].{Id:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint.Address,Port:Endpoint.Port,Public:PubliclyAccessible,Vpc:DBSubnetGroup.VpcId,SecurityGroups:VpcSecurityGroups[].VpcSecurityGroupId}" --output table
}

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Set DATABASE_URL and INGEST_DATABASE_URL to the endpoint above, then run:"
Write-Host "npm run db:migrate"
Write-Host "npm run status:db"
