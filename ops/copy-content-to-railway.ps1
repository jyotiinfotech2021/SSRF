# Copies the public site content from the local dev database into the Railway database.
# Usage:  ./ops/copy-content-to-railway.ps1 -Url "<Postgres DATABASE_PUBLIC_URL from Railway>"
# Needs Docker running and the local container `ssrf-pg-dev`. Accounts, private member
# data, submissions and revisions are NOT copied. Existing content rows on Railway are
# cleared first, so run it on a fresh site (it asks before doing anything).
param([string]$Url, [string]$HostPort, [string]$Local = "ssrf-pg-dev")
$ErrorActionPreference = "Stop"
if (-not $Url -and $HostPort) {
  # Build the address from host:port and ask for the Postgres password privately (PGPASSWORD on the Postgres service).
  $sec = Read-Host "Postgres password (PGPASSWORD from Railway, input hidden)" -AsSecureString
  $pw = [System.Net.NetworkCredential]::new("", $sec).Password
  $Url = "postgresql://postgres:" + [uri]::EscapeDataString($pw.Trim()) + "@" + $HostPort.Trim() + "/railway"
}
if (-not $Url) { throw "Give either -Url `"postgresql://...`" or -HostPort `"host:port`"." }
$Url = $Url.Trim().Trim('"').Trim("'")
if ($Url -notmatch '^postgres(ql)?://[^@]+@[^:/]+:\d+/\S+$') {
  $seen = $Url -replace '(://[^:/@]*:)[^@]*@', '${1}****@'
  if ($seen.Length -gt 90) { $seen = $seen.Substring(0, 90) + "..." }
  throw "That is not a full Postgres address. I received: [$seen] ($($Url.Length) characters). It must look like postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway. Copy DATABASE_PUBLIC_URL (not DATABASE_URL) and paste the real value, not the words PASTE_DATABASE_PUBLIC_URL_HERE."
}
$tables = "Campaigns", "Chapters", "Entities", "Places", "Sources", "Claims", "ClaimCitations", "Books", "Quiz", "Events", "Stories", "Site", "ArchiveItems", "LegacyRecords"
$out = Join-Path $env:TEMP "ssrf-content.sql"

# The dump is written to a file INSIDE the container and copied out as raw bytes. Never pipe it
# through PowerShell: that re-encodes non-English text (Hindi, accents, dashes) and corrupts it.
$tflags = ($tables | ForEach-Object { "-t 'public.`"$_`"'" }) -join " "
$trunc = "TRUNCATE " + (($tables | ForEach-Object { "`"$_`"" }) -join ", ") + " CASCADE;"
$sh = @"
set -e
f=/tmp/ssrf-content.sql
echo "SET client_encoding = 'UTF8';" > `$f
echo "SET session_replication_role = replica;" >> `$f
echo '$trunc' >> `$f
pg_dump -U postgres -d ssrf --data-only --inserts --no-owner $tflags >> `$f
"@
$sh = $sh -replace "`r", ""
$shFile = Join-Path $env:TEMP "ssrf-dump.sh"
[IO.File]::WriteAllText($shFile, $sh, (New-Object Text.UTF8Encoding($false)))
docker cp $shFile "${Local}:/tmp/ssrf-dump.sh"
if ($LASTEXITCODE -ne 0) { throw "could not copy the helper into the container" }
docker exec $Local sh /tmp/ssrf-dump.sh
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
docker cp "${Local}:/tmp/ssrf-content.sql" $out
if ($LASTEXITCODE -ne 0) { throw "could not copy the dump out of the container" }
Write-Host "Dumped $($tables.Count) tables to $out ($([math]::Round((Get-Item $out).Length/1KB)) KB)"

if ((Read-Host "Replace the content on the Railway database now? (yes/no)") -ne "yes") { Write-Host "Stopped. Nothing was changed."; return }
$env:SSRF_TARGET_URL = $Url
$log = Join-Path $env:TEMP "ssrf-import.log"
$ErrorActionPreference = "Continue"
docker run --rm -e SSRF_TARGET_URL -v "${out}:/c.sql:ro" postgres:17 sh -c 'psql "$SSRF_TARGET_URL" -v ON_ERROR_STOP=1 -f /c.sql' *> $log
$code = $LASTEXITCODE
$ErrorActionPreference = "Stop"
$env:SSRF_TARGET_URL = $null
if ($code -ne 0) {
  Write-Host "---- what psql said (password hidden) ----" -ForegroundColor Yellow
  (Get-Content $log | Where-Object { $_ -match "ERROR|FATAL|could not|timeout|refused|SSL|DETAIL|HINT|does not exist|permission" } | Select-Object -First 12) -replace '(://[^:/@\s]*:)[^@\s]*@', '${1}****@' | Write-Host
  throw "Import failed (full output saved in $log). Send me the lines printed above."
}
Write-Host "Done. Reload the website."
