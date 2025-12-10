# Script de instalacion de Coturn TURN/STUN Server para Windows
# Requiere PowerShell como Administrador

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Instalacion de Coturn TURN/STUN Server  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Ejecuta PowerShell como Administrador" -ForegroundColor Red
    exit 1
}

# Verificar Docker Desktop
Write-Host "[1/5] Verificando Docker Desktop..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "Docker Desktop no esta instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones de instalacion:" -ForegroundColor Yellow
    Write-Host "  1. Instalar via winget:" -ForegroundColor White
    Write-Host "     winget install Docker.DockerDesktop" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Descargar desde:" -ForegroundColor White
    Write-Host "     https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    Write-Host ""
    exit 1
} else {
    Write-Host "Docker Desktop instalado correctamente" -ForegroundColor Green
}

# Verificar que Docker este corriendo
Write-Host "[2/5] Verificando que Docker este corriendo..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    Write-Host "Docker esta corriendo" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker no esta corriendo. Inicia Docker Desktop" -ForegroundColor Red
    exit 1
}

# Crear directorios
Write-Host "[3/5] Creando directorios..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "coturn\logs" | Out-Null
Write-Host "Directorios creados" -ForegroundColor Green

# Configurar firewall
Write-Host "[4/5] Configurando firewall de Windows..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "Coturn TURN" -Direction Inbound -LocalPort 3478 -Protocol UDP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "Coturn TURN TLS" -Direction Inbound -LocalPort 5349 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "Coturn Relay Ports" -Direction Inbound -LocalPort 49152-65535 -Protocol UDP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Host "Firewall configurado" -ForegroundColor Green
} catch {
    Write-Host "Advertencia: No se pudo configurar firewall automaticamente" -ForegroundColor Yellow
}

# Iniciar Coturn
Write-Host "[5/5] Iniciando Coturn..." -ForegroundColor Yellow
docker-compose -f docker-compose.coturn.yml up -d

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Coturn instalado correctamente!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Configuracion:" -ForegroundColor Cyan
Write-Host "  - TURN URL: turn:localhost:3478" -ForegroundColor White
Write-Host "  - TURN TLS: turns:localhost:5349" -ForegroundColor White
Write-Host "  - Usuario: ispuser" -ForegroundColor White
Write-Host "  - Password: SecurePassword2024!" -ForegroundColor White
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "  - Ver logs: docker-compose -f docker-compose.coturn.yml logs -f" -ForegroundColor Gray
Write-Host "  - Reiniciar: docker-compose -f docker-compose.coturn.yml restart" -ForegroundColor Gray
Write-Host "  - Detener: docker-compose -f docker-compose.coturn.yml down" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  1. Cambia la password en coturn\turnserver.conf" -ForegroundColor White
Write-Host "  2. Configura tu IP publica en turnserver.conf" -ForegroundColor White
Write-Host "  3. Configura Cloudflare DNS para turn.isp.serviciosqbit.net" -ForegroundColor White
Write-Host ""
