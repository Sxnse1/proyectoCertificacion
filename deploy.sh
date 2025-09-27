#!/bin/bash
# Script de despliegue automatizado para Heroku

echo "🚀 Iniciando despliegue en Heroku..."
echo "======================================"

# Verificar que estamos en un repositorio git
if [ ! -d ".git" ]; then
    echo "❌ Error: No es un repositorio Git"
    echo "Ejecuta: git init"
    exit 1
fi

# Verificar que heroku CLI está instalado
if ! command -v heroku &> /dev/null; then
    echo "❌ Error: Heroku CLI no está instalado"
    echo "Instala desde: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Verificar login en Heroku
echo "🔐 Verificando login en Heroku..."
if ! heroku whoami &> /dev/null; then
    echo "❌ No estás logueado en Heroku"
    echo "Ejecuta: heroku login"
    exit 1
fi

# Agregar cambios a Git
echo "📝 Agregando cambios a Git..."
git add .
git status

# Preguntar por mensaje de commit
read -p "💬 Mensaje de commit (o Enter para usar mensaje por defecto): " commit_message
if [ -z "$commit_message" ]; then
    commit_message="Deploy to Heroku - $(date)"
fi

git commit -m "$commit_message"

# Preguntar nombre de la app
read -p "📱 Nombre de tu app en Heroku: " app_name
if [ -z "$app_name" ]; then
    echo "❌ Error: Debes proporcionar el nombre de la app"
    exit 1
fi

# Configurar remote de Heroku
echo "🔗 Configurando remote de Heroku..."
heroku git:remote -a $app_name

# Desplegar
echo "🚀 Desplegando a Heroku..."
git push heroku main

# Verificar despliegue
echo "✅ Despliegue completado!"
echo "🔍 Verificando estado de la app..."
heroku logs --tail --num 50

echo ""
echo "🌐 Tu app está disponible en: https://$app_name.herokuapp.com"
echo "📊 Estado del sistema: https://$app_name.herokuapp.com/system/status"