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

$t = ($tables | ForEach-Object { "-t", "public.\`"$_\`"" })
$dump = docker exec $Local pg_dump -U postgres -d ssrf --data-only --inserts --no-owner @t
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
$trunc = "TRUNCATE " + (($tables | ForEach-Object { "`"$_`"" }) -join ", ") + " CASCADE;"
@("SET session_replication_role = replica;", $trunc, $dump) | Set-Content -Encoding utf8 $out
Write-Host "Dumped $($tables.Count) tables to $out ($([math]::Round((Get-Item $out).Length/1KB)) KB)"

if ((Read-Host "Replace the content on the Railway database now? (yes/no)") -ne "yes") { Write-Host "Stopped. Nothing was changed."; return }
$env:SSRF_TARGET_URL = $Url
docker run --rm -e SSRF_TARGET_URL -v "${out}:/c.sql:ro" postgres:17 sh -c 'psql "$SSRF_TARGET_URL" -v ON_ERROR_STOP=1 -f /c.sql'
$env:SSRF_TARGET_URL = $null
if ($LASTEXITCODE -ne 0) { throw "Import failed. Check the message above." }
Write-Host "Done. Reload the website."
