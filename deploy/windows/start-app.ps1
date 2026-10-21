# Mantem o servidor do CasaFinance rodando, reiniciando sozinho se cair.
# Usado pela tarefa agendada "CasaFinance - App" (ver install-autostart.ps1).

$ErrorActionPreference = 'Continue'
$env:NODE_ENV = 'production'
# Node escreve UTF-8 no stdout; sem isso o PowerShell interpreta os bytes
# com a code page ANSI do sistema e acentos saem corrompidos no log.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $repoRoot

$logDir = Join-Path $repoRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'app.log'

function Write-Log($message) {
    "$(Get-Date -Format o) $message" | Out-File -FilePath $logFile -Append -Encoding utf8
}

Write-Log "=== Iniciando loop de supervisao do CasaFinance ==="

while ($true) {
    Write-Log "Iniciando servidor Node..."
    & node "server/src/server.js" 2>&1 | ForEach-Object {
        Add-Content -Path $logFile -Value $_.ToString() -Encoding utf8
    }
    Write-Log "Servidor encerrado (codigo $LASTEXITCODE). Reiniciando em 5s..."
    Start-Sleep -Seconds 5
}
