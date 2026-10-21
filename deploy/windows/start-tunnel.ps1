# Mantem um Cloudflare Quick Tunnel apontando para o CasaFinance local,
# reiniciando sozinho se cair. Cada reinicio gera uma URL publica nova
# (https://palavras-aleatorias.trycloudflare.com) - este script grava a URL
# atual em current-tunnel-url.txt e, se houver um Gist configurado
# (gist-id.txt), atualiza o Gist tambem, para você sempre achar o endereço
# certo por um link fixo.
# Usado pela tarefa agendada "CasaFinance - Tunnel" (ver install-autostart.ps1).

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$logDir = Join-Path $PSScriptRoot '..\..\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'tunnel.log'
$urlFile = Join-Path $PSScriptRoot 'current-tunnel-url.txt'
$gistIdFile = Join-Path $PSScriptRoot 'gist-id.txt'

function Write-Log($message) {
    "$(Get-Date -Format o) $message" | Out-File -FilePath $logFile -Append -Encoding utf8
}

function Find-Exe($names, $extraPaths) {
    foreach ($p in $extraPaths) {
        if (Test-Path $p) { return $p }
    }
    foreach ($n in $names) {
        $cmd = Get-Command $n -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

$cloudflared = Find-Exe @('cloudflared') @(
    "$env:ProgramFiles\cloudflared\cloudflared.exe",
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe"
)
if (-not $cloudflared) {
    Write-Log "ERRO: cloudflared.exe nao encontrado. Instale com: winget install Cloudflare.cloudflared"
    throw "cloudflared nao encontrado"
}

$gh = Find-Exe @('gh') @("$env:ProgramFiles\GitHub CLI\gh.exe")

function Update-Gist($url) {
    if (-not $gh) { return }
    if (-not (Test-Path $gistIdFile)) { return }
    $gistId = (Get-Content $gistIdFile -Raw).Trim()
    if (-not $gistId) { return }

    $content = @"
# CasaFinance - URL de acesso atual

$url

Atualizado em: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')

(Esta URL muda toda vez que o tunel reinicia, por exemplo apos reiniciar o PC.
Sempre confira este Gist para pegar o endereco valido no momento.)
"@
    $tmpFile = Join-Path $env:TEMP 'casafinance-url.md'
    Set-Content -Path $tmpFile -Value $content -Encoding utf8
    & $gh gist edit $gistId --filename "casafinance-url.md" $tmpFile *>> $logFile
}

Write-Log "=== Iniciando loop de supervisao do tunel Cloudflare ==="

while ($true) {
    Write-Log "Iniciando cloudflared..."
    $urlFound = $false

    & $cloudflared tunnel --url http://localhost:3000 --no-autoupdate 2>&1 | ForEach-Object {
        $line = $_.ToString()
        Add-Content -Path $logFile -Value $line -Encoding utf8
        if (-not $urlFound -and $line -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
            $urlFound = $true
            $url = $Matches[1]
            Set-Content -Path $urlFile -Value $url -Encoding utf8
            Write-Log "Nova URL publica: $url"
            Update-Gist $url
        }
    }

    Write-Log "cloudflared encerrado. Reiniciando em 5s..."
    Start-Sleep -Seconds 5
}
