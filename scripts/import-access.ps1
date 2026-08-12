param(
  [string]$SourcePath = ".\full-data",
  [string]$OutPath = ".\data\results.json"
)

$ErrorActionPreference = "Stop"

function Normalize-Header([string]$Value) {
  return ($Value -replace '[^A-Za-z0-9]', '').ToLowerInvariant()
}

function Get-ValueByAliases($Row, [string[]]$Aliases) {
  foreach ($alias in $Aliases) {
    $key = Normalize-Header $alias
    if ($Row.ContainsKey($key)) {
      $value = $Row[$key]
      if ($null -ne $value -and "$value".Trim() -ne "") {
        return "$value".Trim()
      }
    }
  }
  return ""
}

function Format-Dob([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  $text = $Value.Trim()
  $date = [datetime]::MinValue
  if ([datetime]::TryParse($text, [ref]$date)) {
    return $date.ToString("dd-MM-yyyy")
  }

  return $text
}

function Resolve-ExamEvent([string]$Value, [string]$Fallback) {
  if (-not [string]::IsNullOrWhiteSpace($Value)) {
    return $Value.Trim()
  }

  $name = [IO.Path]::GetFileNameWithoutExtension($Fallback)
  $clean = ($name -replace '[_-]+', ' ').Trim()
  return $clean
}

function New-Connection([string]$FilePath) {
  $providers = @(
    "Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$FilePath;Persist Security Info=False;",
    "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$FilePath;Persist Security Info=False;",
    "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$FilePath;Persist Security Info=False;"
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

  throw "Could not open '$FilePath'. Install the Microsoft Access Database Engine or convert the file to CSV/XLSX first."
}

$source = Resolve-Path $SourcePath -ErrorAction SilentlyContinue
if (-not $source) {
  throw "Source path not found: $SourcePath. Put .mdb/.accdb files in .\full-data or pass -SourcePath."
}

$files = Get-ChildItem -LiteralPath $source -Recurse -File -Include *.mdb, *.accdb
if (-not $files) {
  throw "No Access files found under $SourcePath."
}

$rowsByAttempt = [ordered]@{}
$sourceIndex = 0

foreach ($file in $files) {
  $sourceIndex += 1
  Write-Host "Reading $($file.FullName)"
  $connection = New-Connection $file.FullName

  try {
    $schema = $connection.GetOleDbSchemaTable([System.Data.OleDb.OleDbSchemaGuid]::Tables, $null)
    $tables = @($schema.Rows | Where-Object {
      $_["TABLE_TYPE"] -eq "TABLE" -and "$($_["TABLE_NAME"])" -notlike "MSys*"
    } | ForEach-Object { "$($_["TABLE_NAME"])" })

    foreach ($table in $tables) {
      $command = $connection.CreateCommand()
      $escapedTable = $table.Replace("]", "]]")
      $command.CommandText = "SELECT * FROM [$escapedTable]"
      $adapter = New-Object System.Data.OleDb.OleDbDataAdapter $command
      $data = New-Object System.Data.DataTable
      [void]$adapter.Fill($data)

      foreach ($dataRow in $data.Rows) {
        $normalized = @{}
        foreach ($column in $data.Columns) {
          $normalized[(Normalize-Header $column.ColumnName)] = "$($dataRow[$column.ColumnName])"
        }

        $learnerKey = Get-ValueByAliases $normalized @(
          "scholar number", "scholar no", "scholarno", "scholar",
          "learner code", "learnercode", "learner id", "learnerid",
          "enrollment", "enrolment", "roll no scholar"
        )

        if ([string]::IsNullOrWhiteSpace($learnerKey)) {
          continue
        }

        $eventRaw = Get-ValueByAliases $normalized @(
          "exam event", "examevent", "event", "exam month", "exammonth",
          "exam date", "examdate", "month", "result book"
        )
        $event = Resolve-ExamEvent $eventRaw "$($file.BaseName) $table"
        $attemptKey = "$learnerKey|$event"

        $record = [ordered]@{
          learnerKey = $learnerKey
          name = Get-ValueByAliases $normalized @("learner name", "learnername", "name", "student name", "candidate name")
          father = Get-ValueByAliases $normalized @("father name", "fathername", "fathers name", "father", "guardian name")
          dob = Format-Dob (Get-ValueByAliases $normalized @("dob", "date of birth", "dateofbirth", "birth date"))
          event = $event
          result = (Get-ValueByAliases $normalized @("result", "status", "result status", "pass fail")).ToUpperInvariant()
          internal = Get-ValueByAliases $normalized @("internal", "internal marks", "internalmarks", "practical")
          theory = Get-ValueByAliases $normalized @("theory", "theory marks", "theorymarks", "external")
          total = Get-ValueByAliases $normalized @("total", "total marks", "totalmarks", "marks")
          roll = Get-ValueByAliases $normalized @("roll number", "roll no", "rollno", "roll")
          examCentre = Get-ValueByAliases $normalized @("exam centre", "exam center", "examcentre", "examcenter", "centre")
          mobile = Get-ValueByAliases $normalized @("mobile", "mobile no", "mobileno", "phone", "contact")
          itgkCode = Get-ValueByAliases $normalized @("itgk code", "itgkcode", "center code", "centre code")
          itgk = Get-ValueByAliases $normalized @("itgk", "itgk name", "center name", "centre name", "institute")
          barcode = Get-ValueByAliases $normalized @("barcode", "bar code")
          bookletSeries = Get-ValueByAliases $normalized @("booklet series", "bookletseries", "series")
          sourceFile = $file.FullName
          sourceTable = $table
          sourceOrder = $sourceIndex
        }

        $rowsByAttempt[$attemptKey] = $record
      }
    }
  } finally {
    $connection.Close()
    $connection.Dispose()
  }
}

$outFullPath = Join-Path (Get-Location) $OutPath
$outDir = Split-Path $outFullPath -Parent
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$rows = @($rowsByAttempt.Values)
$rows | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $outFullPath -Encoding UTF8

$learnerCount = @($rows | Select-Object -ExpandProperty learnerKey -Unique).Count
Write-Host "Imported $($rows.Count) result attempts for $learnerCount learners into $outFullPath"
