param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [ValidateSet("events", "learner", "search")]
  [string]$Mode,

  [string]$LearnerKey = "",
  [string]$Query = "",
  [string]$Dob = "",
  [string]$Result = "",
  [string]$EventLabel = "",
  [ValidateRange(0, 10000000)]
  [int]$Offset = 0,
  [ValidateRange(1, 300)]
  [int]$Limit = 100
)

$ErrorActionPreference = "Stop"

function New-AccessConnection([string]$Path) {
  $providers = @(
    "Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$Path;Persist Security Info=False;",
    "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$Path;Persist Security Info=False;",
    "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$Path;Persist Security Info=False;"
  )

  foreach ($connectionString in $providers) {
    try {
      $connection = New-Object System.Data.OleDb.OleDbConnection $connectionString
      $connection.Open()
      return $connection
    } catch {
      if ($connection) {
        $connection.Dispose()
      }
    }
  }

  throw "Could not open '$Path'. Install the Microsoft Access Database Engine or convert the file to CSV/XLSX first."
}

function Read-Rows($Connection, [string]$Sql) {
  $command = $Connection.CreateCommand()
  $command.CommandText = $Sql
  $adapter = New-Object System.Data.OleDb.OleDbDataAdapter $command
  $data = New-Object System.Data.DataTable
  [void]$adapter.Fill($data)

  $rows = New-Object System.Collections.Generic.List[object]
  foreach ($dataRow in $data.Rows) {
    $row = [ordered]@{}
    foreach ($column in $data.Columns) {
      $value = $dataRow[$column.ColumnName]
      $row[$column.ColumnName] = if ($value -eq [DBNull]::Value) { "" } else { "$value" }
    }
    $rows.Add([pscustomobject]$row)
  }

  return $rows
}

$resolved = Resolve-Path -LiteralPath $FilePath
$connection = New-AccessConnection $resolved.Path

try {
  if ($Mode -eq "events") {
    $rows = Read-Rows $connection "SELECT DISTINCT EXAM_EVENT FROM [Master] WHERE EXAM_EVENT IS NOT NULL"
    $rows | ConvertTo-Json -Depth 5 -Compress
    exit
  }

  function Escape-Sql([string]$Value) {
    return ($Value -replace "'", "''")
  }

  function Date-Conditions([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
      return ""
    }

    $safe = Escape-Sql $Value
    $parts = $Value -split "-"
    $extra = @()

    if ($parts.Count -eq 3) {
      $year = $parts[0]
      $month = [int]$parts[1]
      $day = [int]$parts[2]
      $extra += "DOB LIKE '%$month/$day/$year%'"
      $extra += "DOB LIKE '%$day/$month/$year%'"
      $extra += "DOB LIKE '%$($parts[2])/$($parts[1])/$year%'"
      $extra += "DOB LIKE '%$($parts[1])/$($parts[2])/$year%'"
    }

    return "($(@("FORMAT(DOB, 'yyyy-mm-dd') = '$safe'", "DOB LIKE '%$safe%'") + $extra -join " OR "))"
  }

  if ($Mode -eq "search") {
    $conditions = New-Object System.Collections.Generic.List[string]
    $queryText = $Query.Trim()

    if (-not [string]::IsNullOrWhiteSpace($queryText)) {
      $digits = ($queryText -replace "\D", "")

      if ($digits.Length -ge 5 -and $digits.Length -eq $queryText.Length) {
        $safeDigits = Escape-Sql $digits
        $conditions.Add("(LNR_CODE = '$safeDigits' OR ROLLNO = '$safeDigits' OR MOB = '$safeDigits' OR BCODE = '$safeDigits')")
      } else {
        foreach ($token in ($queryText -split "\s+" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })) {
          $safeToken = Escape-Sql $token
          $conditions.Add("(NAME LIKE '%$safeToken%' OR F_NAME LIKE '%$safeToken%' OR LNR_CODE LIKE '%$safeToken%' OR ROLLNO LIKE '%$safeToken%' OR MOB LIKE '%$safeToken%' OR BCODE LIKE '%$safeToken%')")
        }
      }
    }

    $dateCondition = Date-Conditions $Dob
    if ($dateCondition) {
      $conditions.Add($dateCondition)
    }

    if (-not [string]::IsNullOrWhiteSpace($Result) -and $Result -ne "All") {
      $conditions.Add("RESULT = '$(Escape-Sql $Result)'")
    }

    if (-not [string]::IsNullOrWhiteSpace($EventLabel)) {
      $conditions.Add("EXAM_EVENT = '$(Escape-Sql $EventLabel)'")
    }

    if ($conditions.Count -eq 0) {
      "[]" | Write-Output
      exit
    }

    $where = $conditions -join " AND "
    $pageWhere = $where

    if ($Offset -gt 0) {
      $pageWhere = "($where) AND LNR_CODE NOT IN (SELECT TOP $Offset LNR_CODE FROM [Master] WHERE $where ORDER BY LNR_CODE, EXAM_EVENT DESC)"
    }

    $sql = @"
SELECT TOP $Limit
  BCODE, ROLLNO, CENTER, MARKS, NAME, F_NAME, LNR_CODE, DOB, ITGK_CODE,
  ITGKNM, ITGKDST, ITGKSP, TH_MARKS, INT_MARKS, TOTAL_MRKS, PERCENTAGE,
  RESULT, DISTRICT, UFM, STATUS, MOB, EXAM_EVENT, R_DATE, PHASE
FROM [Master]
WHERE $pageWhere
ORDER BY LNR_CODE, EXAM_EVENT DESC
"@

    $rows = Read-Rows $connection $sql
    $rows | ConvertTo-Json -Depth 5 -Compress
    exit
  }

  $safeLearnerKey = ($LearnerKey -replace "'", "''")
  $sql = @"
SELECT
  BCODE, ROLLNO, CENTER, MARKS, NAME, F_NAME, LNR_CODE, DOB, ITGK_CODE,
  ITGKNM, ITGKDST, ITGKSP, TH_MARKS, INT_MARKS, TOTAL_MRKS, PERCENTAGE,
  RESULT, DISTRICT, UFM, STATUS, MOB, EXAM_EVENT, R_DATE, PHASE
FROM [Master]
WHERE LNR_CODE = '$safeLearnerKey'
ORDER BY EXAM_EVENT DESC
"@

  $rows = Read-Rows $connection $sql
  $rows | ConvertTo-Json -Depth 5 -Compress
} finally {
  $connection.Close()
  $connection.Dispose()
}
