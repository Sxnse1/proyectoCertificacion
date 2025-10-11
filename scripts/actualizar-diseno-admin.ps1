# Script para actualizar todos los módulos admin con el diseño estandarizado
# Reemplaza estilos inline con el archivo admin-base.css

Write-Host "🎨 Actualizando diseño de módulos admin..." -ForegroundColor Cyan

$modules = @(
    "cursos-admin.hbs",
    "modulos-admin.hbs",
    "videos-admin.hbs",
    "etiquetas-admin.hbs",
    "usuarios-admin.hbs",
    "membresias-admin.hbs",
    "suscripciones-admin.hbs",
    "compras-admin.hbs",
    "carrito-admin.hbs",
    "favoritos-admin.hbs",
    "historial-pagos-admin.hbs",
    "certificados-admin.hbs",
    "valoraciones-admin.hbs"
)

$updatedCount = 0

foreach ($module in $modules) {
    $filePath = "views\admin\$module"
    
    if (Test-Path $filePath) {
        Write-Host "`n📄 Procesando: $module" -ForegroundColor Yellow
        
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        $originalContent = $content
        
        # Verificar si ya tiene el enlace al CSS base
        if ($content -match '<link rel="stylesheet" href="/stylesheets/admin-base.css">') {
            Write-Host "  ✓ Ya tiene admin-base.css" -ForegroundColor Green
            continue
        }
        
        # Buscar si tiene un bloque <style> con estilos inline
        if ($content -match '<style>[\s\S]*?</style>') {
            # Reemplazar el bloque <style> completo con el enlace al CSS
            $content = $content -replace '<style>[\s\S]*?</style>', 
                '<!-- Admin Base CSS -->
    <link rel="stylesheet" href="/stylesheets/admin-base.css">'
            
            Write-Host "  ✓ Estilos inline reemplazados por admin-base.css" -ForegroundColor Green
            $updatedCount++
        }
        # Si no tiene estilos pero tampoco tiene el CSS base, agregarlo
        elseif ($content -match '<link href="https://fonts\.googleapis\.com/css2\?family=Inter') {
            $content = $content -replace '(<link href="https://fonts\.googleapis\.com/css2\?family=Inter[^>]+>)', 
                '$1
    <!-- Admin Base CSS -->
    <link rel="stylesheet" href="/stylesheets/admin-base.css">'
            
            Write-Host "  ✓ admin-base.css agregado" -ForegroundColor Green
            $updatedCount++
        }
        
        # Guardar solo si hubo cambios
        if ($content -ne $originalContent) {
            Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  ✓ Archivo actualizado" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  Archivo no encontrado: $filePath" -ForegroundColor Red
    }
}

Write-Host "`n📊 Resumen:" -ForegroundColor Yellow
Write-Host "  • Módulos actualizados: $updatedCount" -ForegroundColor White
Write-Host "`n✅ Actualización completada!" -ForegroundColor Green
Write-Host "💡 Todos los módulos ahora usan /stylesheets/admin-base.css" -ForegroundColor Cyan
Write-Host "`n📚 Ver TEMPLATE_ADMIN_BASE.md para más detalles" -ForegroundColor Cyan
