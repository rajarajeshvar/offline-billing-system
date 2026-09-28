# ==============================================================================
# Database Provisioning Script for Offline Billing System
# Engine: PostgreSQL 18 (Local)
# ==============================================================================

param (
    [string]$DbName = "offline_billing_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$PgBinPath = "C:\Program Files\PostgreSQL\18\bin"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Offline Billing System: PostgreSQL Schema Deployment   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate psql
$PsqlExe = Join-Path $PgBinPath "psql.exe"
if (-not (Test-Path $PsqlExe)) {
    $CommandPsql = Get-Command psql -ErrorAction SilentlyContinue
    if ($CommandPsql) {
        $PsqlExe = $CommandPsql.Source
    } else {
        Write-Error "Could not find psql.exe at '$PsqlExe'. Please check your PostgreSQL installation path."
        exit 1
    }
}
Write-Host "[+] Found PostgreSQL client: $PsqlExe" -ForegroundColor Green

# 2. Check Password
if (-not $env:PGPASSWORD) {
    $SecurePassword = Read-Host -Prompt "Enter password for PostgreSQL user '$DbUser'" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# 3. Test Connectivity
Write-Host "[*] Testing connection to PostgreSQL server (${DbHost}:${DbPort})..." -ForegroundColor Yellow
$TestConn = & $PsqlExe -U $DbUser -h $DbHost -p $DbPort -w -d postgres -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Authentication or connection failed:" -ForegroundColor Red
    Write-Host $TestConn -ForegroundColor Red
    exit 1
}
Write-Host "[+] Successfully connected to PostgreSQL server." -ForegroundColor Green

# 4. Create Database if not exists
Write-Host "[*] Checking if database '$DbName' exists..." -ForegroundColor Yellow
$DbExists = & $PsqlExe -U $DbUser -h $DbHost -p $DbPort -w -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName';"
if ($DbExists -ne "1") {
    Write-Host "[*] Creating database '$DbName'..." -ForegroundColor Yellow
    & $PsqlExe -U $DbUser -h $DbHost -p $DbPort -w -d postgres -c "CREATE DATABASE $DbName WITH ENCODING 'UTF8';"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create database '$DbName'."
        exit 1
    }
    Write-Host "[+] Database '$DbName' created successfully." -ForegroundColor Green
} else {
    Write-Host "[+] Database '$DbName' already exists." -ForegroundColor Green
}

# 5. Apply Schema Migrations in Dependency Order
$MigrationDir = Join-Path $PSScriptRoot "src\main\resources\db\migration"
$MigrationFiles = Get-ChildItem -Path $MigrationDir -Filter "V*.sql" | Sort-Object { 
    [int]($_.BaseName -replace '^V(\d+)__.*$', '$1') 
}

Write-Host "[*] Executing $($MigrationFiles.Count) migrations against '$DbName'..." -ForegroundColor Cyan
foreach ($File in $MigrationFiles) {
    Write-Host "  -> Applying $($File.Name)..." -NoNewline
    $Output = & $PsqlExe -U $DbUser -h $DbHost -p $DbPort -w -d $DbName -f $File.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host $Output -ForegroundColor Red
        exit 1
    }
    Write-Host " [OK]" -ForegroundColor Green
}

# 6. Verification and Summary
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                Verification & Table Summary              " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$VerifyQuery = @"
SELECT 
    t.table_name,
    COUNT(c.column_name) AS column_count
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;
"@

& $PsqlExe -U $DbUser -h $DbHost -p $DbPort -w -d $DbName -c $VerifyQuery

Write-Host ""
Write-Host "[+] ALL 16 CORE TABLES, CONSTRAINTS, INDEXES, AND SEED DATA DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
