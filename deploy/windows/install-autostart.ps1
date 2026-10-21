# Faz o CasaFinance e o tunel Cloudflare iniciarem sozinhos sempre que voce
# entrar no Windows - sem precisar abrir nada manualmente depois disso.
#
# Usa a pasta "Inicializar" do proprio usuario (nao precisa ser
# administrador). Rode este script UMA UNICA VEZ:
#   powershell -ExecutionPolicy Bypass -File deploy\windows\install-autostart.ps1

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$startupDir = [Environment]::GetFolderPath('Startup')

function New-SilentLauncher($name, $targetScript) {
    $vbsPath = Join-Path $startupDir "$name.vbs"
    $psPath = Join-Path $scriptDir $targetScript
    $vbsContent = @"
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ""$psPath""", 0, False
"@
    Set-Content -Path $vbsPath -Value $vbsContent -Encoding ASCII
    return $vbsPath
}

$appLauncher = New-SilentLauncher 'CasaFinance-App' 'start-app.ps1'
$tunnelLauncher = New-SilentLauncher 'CasaFinance-Tunnel' 'start-tunnel.ps1'

Write-Host "Criado: $appLauncher"
Write-Host "Criado: $tunnelLauncher"
Write-Host ""
Write-Host "A partir do proximo login no Windows, o CasaFinance e o tunel"
Write-Host "Cloudflare iniciam sozinhos (sem janela visivel)."
Write-Host ""
Write-Host "Para iniciar AGORA, sem precisar logar de novo, rode:"
Write-Host "  wscript.exe `"$appLauncher`""
Write-Host "  wscript.exe `"$tunnelLauncher`""
