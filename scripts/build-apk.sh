#!/bin/bash
# Script para generar APK de PARKIT
# Usa GitHub Actions o EAS Build para evitar instalar Android SDK localmente

echo "🔧 PARKIT - Generador de APK"
echo "=============================="
echo ""

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    echo "   Instala desde: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado"
    exit 1
fi

# Cambiar al directorio del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "📂 Directorio del proyecto: $PROJECT_DIR"
echo ""

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --quiet

# Construir la app web
echo "🔨 Construyendo app web..."
npm run build

echo ""
echo "✅ Build web completado!"
echo ""
echo "📱 Opciones para generar APK:"
echo ""
echo "1. GitHub Actions (automático):"
echo "   - Push a GitHub y usa el workflow .github/workflows/build-apk.yml"
echo "   - APK se generará automáticamente en Actions > Artifacts"
echo ""
echo "2. Expo/EAS Build (alternativa):"
echo "   - npm install -g eas-cli"
echo "   - eas build --platform android"
echo ""
echo "3. Local (requiere Android SDK):"
echo "   - npx cap copy android"
echo "   - cd android"
echo "   - ./gradlew assembleDebug"
echo "   - APK: app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "❓ Preguntas? Abre un issue en GitHub"