#!/bin/bash

# Script para iniciar el Store

cd "$(dirname "$0")"

echo "🚀 Iniciando ISP Store..."
echo "========================="

# Verificar que exista .env
if [ ! -f ".env" ]; then
    echo "❌ Error: No se encontró archivo .env"
    echo "   Por favor copia .env.example a .env y configúralo"
    exit 1
fi

# Verificar que existan node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Iniciar el servidor
echo "✅ Iniciando servidor en puerto 3001..."
npm start
