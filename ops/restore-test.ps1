# Restore drill: dumps a database, restores it into a scratch database, and compares row counts table by table.
# Usage: ./ops/restore-test.ps1 -Container ssrf-pg-dev -User postgres -Db ssrf
# The drill FAILS if any count is not a number (so a broken query can never look like a pass).
param(
  [string]$Container = "ssrf-pg-dev",
  [string]$User = "postgres",
  [string]$Db = "ssrf"
)
$ErrorActionPreference = "Continue"  # native stderr (NOTICE lines) must not abort; exit codes are checked explicitly
$scratch = "${Db}_restore_check"

function Invoke-Psql([string]$database, [string]$sql) {
  $out = docker exec $Container psql -U $User -d $database -At -v ON_ERROR_STOP=1 -c $sql 2>&1
  if ($LASTEXITCODE -ne 0) { throw "psql failed on '$database': $out" }
  return $out
}

docker exec $Container sh -c "pg_dump -U $User --format=custom --no-owner -f /tmp/drill.dump $Db"
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
Invoke-Psql "postgres" "DROP DATABASE IF EXISTS $scratch" | Out-Null
Invoke-Psql "postgres" "CREATE DATABASE $scratch" | Out-Null
docker exec $Container sh -c "pg_restore -U $User --no-owner -d $scratch /tmp/drill.dump"
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }

$tables = @(Invoke-Psql $Db "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1")
if ($tables.Count -eq 0) { throw "No tables found; nothing was verified" }
$bad = 0; $rows = 0
foreach ($t in $tables) {
  $q = 'SELECT count(*) FROM \"' + $t + '\"'
  $a = "$(Invoke-Psql $Db $q)".Trim()
  $b = "$(Invoke-Psql $scratch $q)".Trim()
  if ($a -notmatch '^\d+$' -or $b -notmatch '^\d+$') { throw "Non-numeric count for $t ('$a' / '$b')" }
  $rows += [int]$a
  if ($a -ne $b) { Write-Host "MISMATCH $t original=$a restored=$b"; $bad++ } else { Write-Host ("ok       {0,-28} {1}" -f $t, $a) }
}
Invoke-Psql "postgres" "DROP DATABASE $scratch" | Out-Null
if ($bad -gt 0) { Write-Host "RESTORE DRILL FAILED ($bad tables differ)"; exit 1 }
Write-Host "RESTORE DRILL PASSED: $($tables.Count) tables, $rows rows, identical after restore."
