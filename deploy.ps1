# Script de despliegue automatizado para Heroku (PowerShell)
param(
    [string]$AppName,
    [string]$CommitMessage
)

Write-Host "🚀 Iniciando despliegue en Heroku..." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Verificar que estamos en un repositorio git
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: No es un repositorio Git" -ForegroundColor Red
    Write-Host "Ejecuta: git init" -ForegroundColor Yellow
    exit 1
}

# Verificar que heroku CLI está instalado
if (-not (Get-Command heroku -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Heroku CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala desde: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
    exit 1
}

# Verificar login en Heroku
Write-Host "🔐 Verificando login en Heroku..." -ForegroundColor Blue
try {
    $null = heroku whoami 2>$null
} catch {
    Write-Host "❌ No estás logueado en Heroku" -ForegroundColor Red
    Write-Host "Ejecuta: heroku login" -ForegroundColor Yellow
    exit 1
}

# Agregar cambios a Git
Write-Host "📝 Agregando cambios a Git..." -ForegroundColor Blue
git add .
git status

# Mensaje de commit
if (-not $CommitMessage) {
    $CommitMessage = Read-Host "💬 Mensaje de commit (o Enter para usar mensaje por defecto)"
    if (-not $CommitMessage) {
        $CommitMessage = "Deploy to Heroku - $(Get-Date)"
    }
}

git commit -m $CommitMessage

# Nombre de la app
if (-not $AppName) {
    $AppName = Read-Host "📱 Nombre de tu app en Heroku"
    if (-not $AppName) {
        Write-Host "❌ Error: Debes proporcionar el nombre de la app" -ForegroundColor Red
        exit 1
    }
}

# Configurar remote de Heroku
Write-Host "🔗 Configurando remote de Heroku..." -ForegroundColor Blue
heroku git:remote -a $AppName

# Desplegar
Write-Host "🚀 Desplegando a Heroku..." -ForegroundColor Green
git push heroku main

# Verificar despliegue
Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host "🔍 Verificando estado de la app..." -ForegroundColor Blue
heroku logs --tail --num 50

Write-Host ""
Write-Host "🌐 Tu app está disponible en: https://$AppName.herokuapp.com" -ForegroundColor Cyan
Write-Host "📊 Estado del sistema: https://$AppName.herokuapp.com/system/status" -ForegroundColor Cyan