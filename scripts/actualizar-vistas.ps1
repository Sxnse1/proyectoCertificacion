# Script para actualizar todas las referencias de vistas
# StartEducation Platform - Actualización masiva de rutas

Write-Host "🔄 Actualizando referencias de vistas..." -ForegroundColor Cyan

# ============================================================
# RUTAS PÚBLICAS (routes/public/)
# ============================================================

Write-Host "`n📁 Actualizando routes/public/auth.js..." -ForegroundColor Yellow

# auth.js - login-bootstrap
(Get-Content "routes\public\auth.js") -replace "res\.render\('login-bootstrap'", "res.render('auth/login-bootstrap'" | Set-Content "routes\public\auth.js"

# auth.js - change-password
(Get-Content "routes\public\auth.js") -replace "res\.render\('change-password'", "res.render('auth/change-password'" | Set-Content "routes\public\auth.js"

# auth.js - forgot-password y reset-password
(Get-Content "routes\public\auth.js") -replace "res\.render\('forgot-password'", "res.render('auth/forgot-password'" | Set-Content "routes\public\auth.js"
(Get-Content "routes\public\auth.js") -replace "res\.render\('reset-password'", "res.render('auth/reset-password'" | Set-Content "routes\public\auth.js"

Write-Host "✅ auth.js actualizado" -ForegroundColor Green

Write-Host "`n📁 Actualizando routes/public/register.js..." -ForegroundColor Yellow

# register.js - register-bootstrap
(Get-Content "routes\public\register.js") -replace "res\.render\('register-bootstrap'", "res.render('auth/register-bootstrap'" | Set-Content "routes\public\register.js"

Write-Host "✅ register.js actualizado" -ForegroundColor Green

Write-Host "`n📁 Actualizando routes/public/two-factor.js..." -ForegroundColor Yellow

# two-factor.js
(Get-Content "routes\public\two-factor.js") -replace "res\.render\('two-factor-setup'", "res.render('auth/two-factor-setup'" | Set-Content "routes\public\two-factor.js"
(Get-Content "routes\public\two-factor.js") -replace "res\.render\('two-factor-verify'", "res.render('auth/two-factor-verify'" | Set-Content "routes\public\two-factor.js"
(Get-Content "routes\public\two-factor.js") -replace "res\.render\('two-factor-manage'", "res.render('auth/two-factor-manage'" | Set-Content "routes\public\two-factor.js"

Write-Host "✅ two-factor.js actualizado" -ForegroundColor Green

# ============================================================
# RUTAS PROTEGIDAS (routes/protected/)
# ============================================================

Write-Host "`n📁 Actualizando routes/protected/dashboard.js..." -ForegroundColor Yellow

(Get-Content "routes\protected\dashboard.js") -replace "res\.render\('dashboard'", "res.render('estudiante/dashboard'" | Set-Content "routes\protected\dashboard.js"
(Get-Content "routes\protected\dashboard.js") -replace "res\.render\('instructor-dashboard'", "res.render('instructor/instructor-dashboard'" | Set-Content "routes\protected\dashboard.js"
(Get-Content "routes\protected\dashboard.js") -replace "res\.render\('admin-dashboard'", "res.render('admin/admin-dashboard'" | Set-Content "routes\protected\dashboard.js"

Write-Host "✅ dashboard.js actualizado" -ForegroundColor Green

Write-Host "`n📁 Actualizando routes/protected/cursos.js..." -ForegroundColor Yellow

(Get-Content "routes\protected\cursos.js") -replace "res\.render\('cursos-estudiante'", "res.render('estudiante/cursos-estudiante'" | Set-Content "routes\protected\cursos.js"
(Get-Content "routes\protected\cursos.js") -replace "res\.render\('curso-detalle'", "res.render('estudiante/curso-detalle'" | Set-Content "routes\protected\cursos.js"
(Get-Content "routes\protected\cursos.js") -replace "res\.render\('mis-cursos'", "res.render('estudiante/mis-cursos'" | Set-Content "routes\protected\cursos.js"

Write-Host "✅ cursos.js actualizado" -ForegroundColor Green

Write-Host "`n📁 Actualizando routes/protected/cursos-db.js..." -ForegroundColor Yellow

(Get-Content "routes\protected\cursos-db.js") -replace "res\.render\('cursos-estudiante-db'", "res.render('estudiante/cursos-estudiante-db'" | Set-Content "routes\protected\cursos-db.js"
(Get-Content "routes\protected\cursos-db.js") -replace "res\.render\('curso-detalle-db'", "res.render('estudiante/curso-detalle-db'" | Set-Content "routes\protected\cursos-db.js"

Write-Host "✅ cursos-db.js actualizado" -ForegroundColor Green

Write-Host "`n📁 Actualizando routes/protected/video.js..." -ForegroundColor Yellow

(Get-Content "routes\protected\video.js") -replace "res\.render\('video-player'", "res.render('estudiante/video-player'" | Set-Content "routes\protected\video.js"

Write-Host "✅ video.js actualizado" -ForegroundColor Green

Write-Host "`n📁 Actualizando routes/protected/users.js..." -ForegroundColor Yellow

(Get-Content "routes\protected\users.js") -replace "res\.render\('change-password'", "res.render('auth/change-password'" | Set-Content "routes\protected\users.js"

Write-Host "✅ users.js actualizado" -ForegroundColor Green

Write-Host "`n📁 Actualizando routes/protected/usuarios.js..." -ForegroundColor Yellow

(Get-Content "routes\protected\usuarios.js") -replace "res\.render\('gestion-usuarios'", "res.render('admin/gestion-usuarios'" | Set-Content "routes\protected\usuarios.js"

Write-Host "✅ usuarios.js actualizado" -ForegroundColor Green

# ============================================================
# RUTAS RAÍZ
# ============================================================

Write-Host "`n📁 Actualizando routes/system.js..." -ForegroundColor Yellow

(Get-Content "routes\system.js") -replace "res\.render\('system-", "res.render('admin/system-" | Set-Content "routes\system.js"

Write-Host "✅ system.js actualizado" -ForegroundColor Green

Write-Host "`n✅ ¡Todas las vistas actualizadas exitosamente!" -ForegroundColor Green
Write-Host "📝 Ahora puedes reiniciar el servidor con: npm start" -ForegroundColor Cyan
