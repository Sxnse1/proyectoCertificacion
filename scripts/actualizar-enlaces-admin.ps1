# Script para actualizar enlaces en vistas admin
# StartEducation Platform - Corrección de URLs

Write-Host "🔄 Actualizando enlaces en vistas admin..." -ForegroundColor Cyan

$updated = 0

# ============================================================
# ACTUALIZAR ENLACES EN ADMIN-DASHBOARD.HBS
# ============================================================

Write-Host "`n📁 Actualizando admin-dashboard.hbs..." -ForegroundColor Yellow

$file = "views\admin\admin-dashboard.hbs"
$content = Get-Content $file -Raw

# Actualizar enlaces de monetización (deben tener prefijo /admin/)
$replacements = @{
    '"/membresias-admin"' = '"/admin/membresias"'
    '"/suscripciones-admin"' = '"/admin/suscripciones"'
    '"/compras-admin"' = '"/admin/compras"'
    '"/pagos-admin"' = '"/admin/pagos"'
    '"/carrito-admin"' = '"/admin/carritos"'
    '"/favoritos-admin"' = '"/admin/favoritos"'
    '"/valoraciones-admin"' = '"/admin/valoraciones"'
    '"/certificados-admin"' = '"/admin/certificados"'
}

foreach ($old in $replacements.Keys) {
    $new = $replacements[$old]
    if ($content -match [regex]::Escape($old)) {
        $count = ([regex]::Matches($content, [regex]::Escape($old))).Count
        $content = $content -replace [regex]::Escape($old), $new
        Write-Host "  ✅ Reemplazado $old → $new ($count ocurrencias)" -ForegroundColor Green
        $updated += $count
    }
}

Set-Content -Path $file -Value $content -NoNewline
Write-Host "  ✅ admin-dashboard.hbs actualizado" -ForegroundColor Green

# ============================================================
# ACTUALIZAR OTRAS VISTAS ADMIN QUE PUEDAN TENER ENLACES
# ============================================================

$adminViews = @(
    "membresias-admin.hbs",
    "suscripciones-admin.hbs",
    "carrito-admin.hbs",
    "favoritos-admin.hbs",
    "historial-pagos-admin.hbs",
    "certificados-admin.hbs",
    "compras-admin.hbs",
    "valoraciones-admin.hbs"
)

Write-Host "`n📁 Verificando enlaces en vistas individuales..." -ForegroundColor Yellow

foreach ($viewFile in $adminViews) {
    $filePath = "views\admin\$viewFile"
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        $changed = $false
        
        foreach ($old in $replacements.Keys) {
            $new = $replacements[$old]
            if ($content -match [regex]::Escape($old)) {
                $content = $content -replace [regex]::Escape($old), $new
                $changed = $true
            }
        }
        
        if ($changed) {
            Set-Content -Path $filePath -Value $content -NoNewline
            Write-Host "  ✅ $viewFile actualizado" -ForegroundColor Green
            $updated++
        } else {
            Write-Host "  ℹ️  $viewFile - sin cambios necesarios" -ForegroundColor Gray
        }
    }
}

# ============================================================
# RESUMEN
# ============================================================

Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE ACTUALIZACIÓN" -ForegroundColor Cyan
Write-Host ("="*60) -ForegroundColor Cyan

if ($updated -gt 0) {
    Write-Host "✅ Se actualizaron $updated enlaces" -ForegroundColor Green
    Write-Host "`nRutas corregidas:" -ForegroundColor Yellow
    Write-Host "  /membresias-admin      → /admin/membresias" -ForegroundColor White
    Write-Host "  /suscripciones-admin   → /admin/suscripciones" -ForegroundColor White
    Write-Host "  /compras-admin         → /admin/compras" -ForegroundColor White
    Write-Host "  /pagos-admin           → /admin/pagos" -ForegroundColor White
    Write-Host "  /carrito-admin         → /admin/carritos" -ForegroundColor White
    Write-Host "  /favoritos-admin       → /admin/favoritos" -ForegroundColor White
    Write-Host "  /valoraciones-admin    → /admin/valoraciones" -ForegroundColor White
    Write-Host "  /certificados-admin    → /admin/certificados" -ForegroundColor White
} else {
    Write-Host "ℹ️  No se encontraron enlaces para actualizar" -ForegroundColor Yellow
}

Write-Host "`n🚀 Recarga la página para ver los cambios" -ForegroundColor Cyan
