# Remove a inicializacao automatica criada por install-autostart.ps1.
$startupDir = [Environment]::GetFolderPath('Startup')
Remove-Item (Join-Path $startupDir 'CasaFinance-App.vbs') -ErrorAction SilentlyContinue
Remove-Item (Join-Path $startupDir 'CasaFinance-Tunnel.vbs') -ErrorAction SilentlyContinue
Write-Host "Inicializacao automatica removida."
