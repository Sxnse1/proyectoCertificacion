# Script de Verificación y Corrección de Rutas de Importación
# StartEducation Platform - Verificación completa

Write-Host "🔍 Verificando todas las rutas de importación..." -ForegroundColor Cyan

$errorsFound = 0
$filesFixed = 0

# ============================================================
# FUNCIÓN PARA VERIFICAR Y CORREGIR IMPORTS
# ============================================================

function Fix-ImportPaths {
    param(
        [string]$FilePath,
        [string]$OldPattern,
        [string]$NewPattern,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        if ($content -match [regex]::Escape($OldPattern)) {
            Write-Host "  ⚠️  Encontrado en $FilePath - $Description" -ForegroundColor Yellow
            $content = $content -replace [regex]::Escape($OldPattern), $NewPattern
            Set-Content -Path $FilePath -Value $content -NoNewline
            Write-Host "  ✅ Corregido: $OldPattern → $NewPattern" -ForegroundColor Green
            return 1
        }
    }
    return 0
}

# ============================================================
# VERIFICAR ROUTES/PUBLIC/
# ============================================================

Write-Host "`n📁 Verificando routes/public/..." -ForegroundColor Yellow

# auth.js
$fixed = 0
$fixed += Fix-ImportPaths "routes\public\auth.js" "require('../services/twoFactorService')" "require('../../services/twoFactorService')" "twoFactorService"
$fixed += Fix-ImportPaths "routes\public\auth.js" "require('../services/emailService')" "require('../../services/emailService')" "emailService"
$filesFixed += $fixed
if ($fixed -eq 0) { Write-Host "  ✅ auth.js - OK" -ForegroundColor Green }

# register.js
$fixed = 0
$fixed += Fix-ImportPaths "routes\public\register.js" "require('../config/database')" "require('../../config/database')" "database"
$filesFixed += $fixed
if ($fixed -eq 0) { Write-Host "  ✅ register.js - OK" -ForegroundColor Green }

# two-factor.js
$fixed = 0
$fixed += Fix-ImportPaths "routes\public\two-factor.js" "require('../services/twoFactorService')" "require('../../services/twoFactorService')" "twoFactorService"
$fixed += Fix-ImportPaths "routes\public\two-factor.js" "require('../middleware/auth')" "require('../../middleware/auth')" "auth middleware"
$filesFixed += $fixed
if ($fixed -eq 0) { Write-Host "  ✅ two-factor.js - OK" -ForegroundColor Green }

# ============================================================
# VERIFICAR ROUTES/PROTECTED/
# ============================================================

Write-Host "`n📁 Verificando routes/protected/..." -ForegroundColor Yellow

$protectedFiles = @(
    "cursos.js",
    "cursos-db.js",
    "dashboard.js",
    "users.js",
    "usuarios.js",
    "video.js"
)

foreach ($file in $protectedFiles) {
    $fixed = 0
    $fixed += Fix-ImportPaths "routes\protected\$file" "require('../config/database')" "require('../../config/database')" "database"
    $fixed += Fix-ImportPaths "routes\protected\$file" "require('../services/" "require('../../services/" "services"
    $fixed += Fix-ImportPaths "routes\protected\$file" "require('../middleware/" "require('../../middleware/" "middleware"
    $filesFixed += $fixed
    if ($fixed -eq 0) { Write-Host "  ✅ $file - OK" -ForegroundColor Green }
}

# ============================================================
# VERIFICAR ROUTES/ADMIN/
# ============================================================

Write-Host "`n📁 Verificando routes/admin/..." -ForegroundColor Yellow

$adminFiles = @(
    "categorias-admin.js",
    "cursos-admin.js",
    "etiquetas-admin.js",
    "modulos-admin.js",
    "usuarios-admin.js",
    "videos-admin.js",
    "membresias-admin.js",
    "suscripciones-admin.js",
    "carrito-admin.js",
    "favoritos-admin.js",
    "historial-pagos-admin.js",
    "certificados-admin.js",
    "compras-admin.js",
    "valoraciones-admin.js"
)

foreach ($file in $adminFiles) {
    $fixed = 0
    $fixed += Fix-ImportPaths "routes\admin\$file" "require('../config/database')" "require('../../config/database')" "database"
    $fixed += Fix-ImportPaths "routes\admin\$file" "require('../services/" "require('../../services/" "services"
    $fixed += Fix-ImportPaths "routes\admin\$file" "require('../middleware/" "require('../../middleware/" "middleware"
    $filesFixed += $fixed
    if ($fixed -eq 0) { Write-Host "  ✅ $file - OK" -ForegroundColor Green }
}

# ============================================================
# RESUMEN
# ============================================================

Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host ("="*60) -ForegroundColor Cyan

if ($filesFixed -eq 0) {
    Write-Host "✅ ¡Todas las rutas de importación están correctas!" -ForegroundColor Green
    Write-Host "   No se encontraron problemas." -ForegroundColor Green
} else {
    Write-Host "⚠️  Se corrigieron $filesFixed rutas de importación" -ForegroundColor Yellow
    Write-Host "   Reinicia el servidor para aplicar los cambios." -ForegroundColor Yellow
}

Write-Host "`n🚀 Servidor listo para iniciar con: npm start" -ForegroundColor Cyan
