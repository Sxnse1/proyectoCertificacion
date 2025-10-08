# Script para actualizar todas las referencias de URLs admin en archivos .hbs
# Actualiza las URLs antiguas al nuevo formato /admin/*

Write-Host "🔧 Actualizando URLs admin en archivos .hbs..." -ForegroundColor Cyan

$replacements = @{
    '"/cursos-admin"' = '"/admin/cursos"'
    "'/cursos-admin'" = "'/admin/cursos'"
    '"/cursos-admin?' = '"/admin/cursos?'
    "'/cursos-admin?" = "'/admin/cursos?"
    '`/cursos-admin/' = '`/admin/cursos/'
    
    '"/modulos-admin"' = '"/admin/modulos"'
    "'/modulos-admin'" = "'/admin/modulos'"
    '"/modulos-admin?' = '"/admin/modulos?'
    "'/modulos-admin?" = "'/admin/modulos?"
    '`/modulos-admin/' = '`/admin/modulos/'
    
    '"/videos-admin"' = '"/admin/videos"'
    "'/videos-admin'" = "'/admin/videos'"
    '"/videos-admin?' = '"/admin/videos?'
    "'/videos-admin?" = "'/admin/videos?"
    '`/videos-admin/' = '`/admin/videos/'
    
    '"/categorias-admin"' = '"/admin/categorias"'
    "'/categorias-admin'" = "'/admin/categorias'"
    '"/categorias-admin?' = '"/admin/categorias?'
    "'/categorias-admin?" = "'/admin/categorias?"
    '`/categorias-admin/' = '`/admin/categorias/'
    
    '"/etiquetas-admin"' = '"/admin/etiquetas"'
    "'/etiquetas-admin'" = "'/admin/etiquetas'"
    '"/etiquetas-admin?' = '"/admin/etiquetas?'
    "'/etiquetas-admin?" = "'/admin/etiquetas?"
    '`/etiquetas-admin/' = '`/admin/etiquetas/'
    
    '"/usuarios-admin"' = '"/admin/usuarios"'
    "'/usuarios-admin'" = "'/admin/usuarios'"
    '"/usuarios-admin?' = '"/admin/usuarios?'
    "'/usuarios-admin?" = "'/admin/usuarios?"
    '`/usuarios-admin/' = '`/admin/usuarios/'
}

$files = Get-ChildItem -Path "views" -Recurse -Filter "*.hbs"
$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($key in $replacements.Keys) {
        $oldPattern = [regex]::Escape($key)
        if ($content -match $oldPattern) {
            $content = $content -replace $oldPattern, $replacements[$key]
            $matches = ([regex]::Matches($originalContent, $oldPattern)).Count
            $fileReplacements += $matches
            Write-Host "  ✅ $($file.Name): Reemplazado '$key' -> '$($replacements[$key])' ($matches ocurrencias)" -ForegroundColor Green
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $totalFiles++
        $totalReplacements += $fileReplacements
    }
}

Write-Host "`n📊 Resumen:" -ForegroundColor Yellow
Write-Host "  • Archivos modificados: $totalFiles" -ForegroundColor White
Write-Host "  • Total de reemplazos: $totalReplacements" -ForegroundColor White
Write-Host "`n✅ Actualización completada!" -ForegroundColor Green

# Verificación
Write-Host "`n🔍 Verificando URLs restantes..." -ForegroundColor Cyan
$remaining = Select-String -Path "views\**\*.hbs" -Pattern "/(cursos|modulos|videos|categorias|etiquetas|usuarios)-admin" | Where-Object { $_.Line -notmatch "/admin/(cursos|modulos|videos|categorias|etiquetas|usuarios)" }

if ($remaining) {
    Write-Host "⚠️  Aún hay $($remaining.Count) referencias con URLs antiguas:" -ForegroundColor Yellow
    $remaining | ForEach-Object {
        Write-Host "  - $($_.Filename):$($_.LineNumber)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ No se encontraron más URLs antiguas!" -ForegroundColor Green
}
