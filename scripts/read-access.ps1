param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [string]$OutDir = ""
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

function Normalize-Header([string]$Value) {
  return ($Value -replace '[^A-Za-z0-9]', '').ToLowerInvariant()
}

function Has-LearnerColumn($Connection, [string]$TableName) {
  $columns = $Connection.GetOleDbSchemaTable(
    [System.Data.OleDb.OleDbSchemaGuid]::Columns,
    @($null, $null, $TableName, $null)
  )

  $learnerAliases = @(
    "scholarnumber", "scholarno", "scholar", "learnercode",
    "learnerid", "enrollment", "enrolment", "lnrcode"
  )

  foreach ($column in $columns.Rows) {
    if ($learnerAliases -contains (Normalize-Header "$($column["COLUMN_NAME"])")) {
      return $true
    }
  }

  return $false
}

function Get-ImportColumns($Connection, [string]$TableName) {
  $columns = $Connection.GetOleDbSchemaTable(
    [System.Data.OleDb.OleDbSchemaGuid]::Columns,
    @($null, $null, $TableName, $null)
  )

  $wanted = @(
    "bcode", "barcode", "rollno", "rollnumber", "roll", "center", "centre",
    "marks", "name", "learnername", "studentname", "candidatename",
    "fname", "f_name", "fathername", "father", "guardianname",
    "lnrcode", "learnercode", "scholarnumber", "scholarno", "scholar",
    "dob", "dateofbirth", "itgkcode", "itgk_code", "itgknm", "itgkname",
    "itgkdst", "itgksp", "spcentre", "spcenter", "thmarks", "th_marks",
    "intmarks", "int_marks", "totalmrks", "total_mrks", "totalmarks",
    "percentage", "result", "district", "ufm", "status", "mob", "mobile",
    "examevent", "exam_event", "rdate", "r_date", "phase", "bookletseries"
  )

  $selected = New-Object System.Collections.Generic.List[string]
  foreach ($column in $columns.Rows) {
    $name = "$($column["COLUMN_NAME"])"
    if ($wanted -contains (Normalize-Header $name)) {
      $selected.Add($name)
    }
  }

  return $selected
}

function ConvertTo-CsvValue($Value) {
  if ($null -eq $Value -or $Value -eq [DBNull]::Value) {
    return '""'
  }

  $text = "$Value"
  return '"' + $text.Replace('"', '""') + '"'
}

$resolved = Resolve-Path -LiteralPath $FilePath
$connection = New-AccessConnection $resolved.Path
$tables = New-Object System.Collections.Generic.List[object]

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path ([IO.Path]::GetTempPath()) ([IO.Path]::GetRandomFileName())
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

try {
  $schema = $connection.GetOleDbSchemaTable([System.Data.OleDb.OleDbSchemaGuid]::Tables, $null)
  $tableNames = @(
    $schema.Rows |
      Where-Object {
        $_["TABLE_TYPE"] -eq "TABLE" -and
        "$($_["TABLE_NAME"])" -notlike "MSys*" -and
        "$($_["TABLE_NAME"])" -notlike "~*"
      } |
      ForEach-Object { "$($_["TABLE_NAME"])" }
  )

  foreach ($tableName in $tableNames) {
    if (-not (Has-LearnerColumn $connection $tableName)) {
      continue
    }

    $columns = Get-ImportColumns $connection $tableName
    if ($columns.Count -eq 0) {
      continue
    }

    $selectList = @(
      $columns | ForEach-Object {
        "[" + $_.Replace("]", "]]") + "]"
      }
    ) -join ", "

    $command = $connection.CreateCommand()
    $escapedTable = $tableName.Replace("]", "]]")
    $command.CommandText = "SELECT $selectList FROM [$escapedTable]"
    $reader = $command.ExecuteReader()
    $csvPath = Join-Path $OutDir (($tableName -replace '[^A-Za-z0-9_.-]', '_') + ".csv")
    $writer = New-Object System.IO.StreamWriter($csvPath, $false, [System.Text.Encoding]::UTF8)

    try {
      $headers = for ($i = 0; $i -lt $reader.FieldCount; $i += 1) {
        ConvertTo-CsvValue $reader.GetName($i)
      }
      $writer.WriteLine(($headers -join ","))

      $rowCount = 0
      while ($reader.Read()) {
        $values = for ($i = 0; $i -lt $reader.FieldCount; $i += 1) {
          ConvertTo-CsvValue $reader.GetValue($i)
        }
        $writer.WriteLine(($values -join ","))
        $rowCount += 1
      }
    } finally {
      $writer.Close()
      $reader.Close()
    }

    $tables.Add([pscustomobject]@{
      tableName = $tableName
      csvPath = $csvPath
      rowCount = $rowCount
    })
  }
} finally {
  $connection.Close()
  $connection.Dispose()
}

$tables | ConvertTo-Json -Depth 8 -Compress
