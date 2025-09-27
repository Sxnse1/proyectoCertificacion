# Script para desplegar y probar inmediatamente en Heroku
param(
    [string]$AppName = "",
    [switch]$SkipDeploy
)

if (-not $AppName) {
    $AppName = Read-Host "📱 Nombre de tu app en Heroku"
}

if (-not $SkipDeploy) {
    Write-Host "🚀 Desplegando cambios..." -ForegroundColor Green
    git add .
    git commit -m "Mejoras en diagnóstico de base de datos - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git push heroku main
    
    Write-Host "⏳ Esperando que la app se inicie..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

Write-Host ""
Write-Host "🔍 PROBANDO LA APLICACIÓN EN HEROKU" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

$baseUrl = "https://$AppName.herokuapp.com"

Write-Host ""
Write-Host "1. 💚 Health Check..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/system/health" -Method Get
    Write-Host "   ✅ OK: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. 📊 Estado del Sistema..." -ForegroundColor Blue
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/system/status" -Method Get
    Write-Host "   ✅ Entorno: $($status.data.environment)" -ForegroundColor Green
    Write-Host "   📍 Base de datos configurada: $($status.data.database.configured)" -ForegroundColor Green
    Write-Host "   🔗 Base de datos conectada: $($status.data.database.connected)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. 🗃️ Prueba de Base de Datos..." -ForegroundColor Magenta
try {
    $dbTest = Invoke-RestMethod -Uri "$baseUrl/system/db-test" -Method Get
    if ($dbTest.success) {
        Write-Host "   ✅ Conexión exitosa!" -ForegroundColor Green
        Write-Host "   📅 Fecha servidor: $($dbTest.data.fecha_servidor)" -ForegroundColor Green
        Write-Host "   🗃️ Base de datos: $($dbTest.data.base_datos)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Conexión falló: $($dbTest.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Esto indica problema de conexión a la base de datos" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "4. 🔧 Ver logs recientes..." -ForegroundColor Yellow
Write-Host "   Ejecutando: heroku logs --tail --num 20 -a $AppName" -ForegroundColor Gray
heroku logs --tail --num 20 -a $AppName

Write-Host ""
Write-Host "🌐 URLS ÚTILES:" -ForegroundColor Cyan
Write-Host "   • App principal: $baseUrl" -ForegroundColor White
Write-Host "   • Diagnóstico web: $baseUrl/system/diagnostic" -ForegroundColor White
Write-Host "   • Estado del sistema: $baseUrl/system/status" -ForegroundColor White
Write-Host "   • Prueba de BD: $baseUrl/system/db-test" -ForegroundColor White
Write-Host ""
Write-Host "🔧 COMANDOS ÚTILES:" -ForegroundColor Cyan
Write-Host "   • Ver config: heroku config -a $AppName" -ForegroundColor White
Write-Host "   • Ver logs: heroku logs --tail -a $AppName" -ForegroundColor White
Write-Host "   • Reiniciar: heroku restart -a $AppName" -ForegroundColor White