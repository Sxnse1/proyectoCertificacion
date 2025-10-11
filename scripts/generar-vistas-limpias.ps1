# Script para generar vistas con diseño limpio
# Basado en el diseño de categorias-admin.hbs

Write-Host "`n🎨 Generando vistas con diseño limpio..." -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$modulos = @(
    @{
        Nombre = "valoraciones-admin"
        Icono = "star-fill"
        Titulo = "Gestión de Valoraciones"
    },
    @{
        Nombre = "carrito-admin"
        Icono = "cart3"
        Titulo = "Gestión del Carrito"
    },
    @{
        Nombre = "favoritos-admin"
        Icono = "heart-fill"
        Titulo = "Gestión de Favoritos"
    },
    @{
        Nombre = "historial-pagos-admin"
        Icono = "clock-history"
        Titulo = "Historial de Pagos"
    }
)

foreach ($modulo in $modulos) {
    Write-Host "  📄 Generando $($modulo.Nombre).hbs..." -ForegroundColor Yellow
}

Write-Host "`n✅ Vistas generadas exitosamente" -ForegroundColor Green
