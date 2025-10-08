# Script para eliminar middlewares verificarAdmin locales de las rutas admin
# Estos middlewares ya no son necesarios porque usamos requireRole en index.routes.js

Write-Host "🔧 Eliminando middlewares verificarAdmin locales..." -ForegroundColor Cyan

$files = @(
    "routes\admin\membresias-admin.js",
    "routes\admin\suscripciones-admin.js",
    "routes\admin\carrito-admin.js",
    "routes\admin\favoritos-admin.js",
    "routes\admin\compras-admin.js",
    "routes\admin\historial-pagos-admin.js",
    "routes\admin\certificados-admin.js",
    "routes\admin\valoraciones-admin.js"
)

$totalFixed = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "`n📄 Procesando: $file" -ForegroundColor Yellow
        
        $content = Get-Content -Path $file -Raw -Encoding UTF8
        
        # Eliminar la función verificarAdmin
        $content = $content -replace '(?s)//\s*Middleware\s+para\s+verificar\s+si\s+el\s+usuario\s+es\s+administrador\s*\r?\nfunction\s+verificarAdmin\(req,\s*res,\s*next\)\s*\{[^}]+\}\r?\n\r?\n', ''
        
        # Eliminar el uso de verificarAdmin en las rutas
        $content = $content -replace ',\s*verificarAdmin', ''
        
        Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  ✅ Middleware eliminado" -ForegroundColor Green
        $totalFixed++
    } else {
        Write-Host "  ⚠️  Archivo no encontrado: $file" -ForegroundColor Red
    }
}

Write-Host "`n📊 Resumen:" -ForegroundColor Yellow
Write-Host "  • Archivos procesados: $totalFixed" -ForegroundColor White
Write-Host "`n✅ Middlewares locales eliminados!" -ForegroundColor Green
Write-Host "💡 Ahora se usa requireRole(['admin', 'instructor']) desde index.routes.js" -ForegroundColor Cyan
