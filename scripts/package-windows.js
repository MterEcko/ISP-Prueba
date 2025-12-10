/**
 * Script para empaquetar el sistema ISP para Windows
 * Crea un instalador .exe con NSIS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('  Empaquetado para Windows - Sistema ISP');
console.log('='.repeat(60));
console.log('');

// Paso 1: Build del frontend
console.log('[1/5] Building frontend...');
try {
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend buildeado correctamente\n');
} catch (error) {
  console.error('❌ Error building frontend:', error.message);
  process.exit(1);
}

// Paso 2: Crear ejecutable con pkg
console.log('[2/5] Creando ejecutable standalone...');
try {
  execSync('npx pkg backend/index.js --targets node18-win-x64 --output dist/isp-sistema.exe', { stdio: 'inherit' });
  console.log('✅ Ejecutable creado: dist/isp-sistema.exe\n');
} catch (error) {
  console.error('❌ Error creando ejecutable:', error.message);
  process.exit(1);
}

// Paso 3: Copiar archivos necesarios
console.log('[3/5] Copiando archivos...');
const distDir = path.join(__dirname, '../dist');
const packageDir = path.join(distDir, 'package');

// Crear directorio de empaquetado
if (!fs.existsSync(packageDir)) {
  fs.mkdirSync(packageDir, { recursive: true });
}

// Copiar ejecutable
fs.copyFileSync(
  path.join(distDir, 'isp-sistema.exe'),
  path.join(packageDir, 'isp-sistema.exe')
);

// Copiar frontend
const frontendSource = path.join(__dirname, '../frontend/dist');
const frontendDest = path.join(packageDir, 'frontend/dist');
if (!fs.existsSync(frontendDest)) {
  fs.mkdirSync(frontendDest, { recursive: true });
}
copyFolderRecursiveSync(frontendSource, frontendDest);

// Crear archivo .env de ejemplo
const envExample = `# Configuración de Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ispdb
DB_USER=ispuser
DB_PASSWORD=CAMBIAR_ESTO

# Servidor
PORT=3000
NODE_ENV=production

# Seguridad (generar claves aleatorias)
JWT_SECRET=GENERAR_CLAVE_ALEATORIA_64_CARACTERES
ENCRYPTION_KEY=GENERAR_CLAVE_ALEATORIA_32_CARACTERES
`;

fs.writeFileSync(path.join(packageDir, '.env.example'), envExample);

// Crear README para cliente
const readme = `# Sistema ISP - Instalación

## Requisitos Previos

1. PostgreSQL 14 o superior instalado
2. Puerto 3000 disponible

## Instalación

1. Instalar PostgreSQL y crear base de datos:
   \`\`\`sql
   CREATE USER ispuser WITH PASSWORD 'tu_password';
   CREATE DATABASE ispdb OWNER ispuser;
   \`\`\`

2. Copiar .env.example a .env y configurar:
   - DB_PASSWORD: tu password de PostgreSQL
   - JWT_SECRET: clave aleatoria (64 caracteres)
   - ENCRYPTION_KEY: clave aleatoria (32 caracteres)

3. Ejecutar isp-sistema.exe

4. Abrir navegador en: http://localhost:3000

## Login Inicial

Usuario: admin
Password: admin123

## Soporte

Email: soporte@tuproveedor.com
`;

fs.writeFileSync(path.join(packageDir, 'README.txt'), readme);

console.log('✅ Archivos copiados\n');

// Paso 4: Crear script de instalación
console.log('[4/5] Creando script de instalación...');

const installScript = `@echo off
echo ============================================
echo   Sistema ISP - Instalador
echo ============================================
echo.

REM Verificar si existe .env
if not exist .env (
    echo [ERROR] Archivo .env no encontrado
    echo.
    echo Por favor:
    echo 1. Copia .env.example a .env
    echo 2. Edita .env con tus configuraciones
    echo 3. Ejecuta este script nuevamente
    echo.
    pause
    exit /b 1
)

echo [OK] Configuracion encontrada
echo.

REM Crear carpeta de uploads
if not exist uploads mkdir uploads
echo [OK] Carpeta uploads creada
echo.

REM Iniciar sistema
echo Iniciando Sistema ISP...
echo.
echo Servidor corriendo en: http://localhost:3000
echo.
echo Para detener: Ctrl+C
echo.

isp-sistema.exe

pause
`;

fs.writeFileSync(path.join(packageDir, 'iniciar.bat'), installScript);

console.log('✅ Script de instalación creado\n');

// Paso 5: Crear ZIP
console.log('[5/5] Creando archivo ZIP...');
try {
  const zipName = `isp-sistema-windows-v1.0.0.zip`;
  const zipPath = path.join(distDir, zipName);

  // Usar PowerShell para crear ZIP en Windows
  if (process.platform === 'win32') {
    execSync(`powershell Compress-Archive -Path "${packageDir}\\*" -DestinationPath "${zipPath}" -Force`, { stdio: 'inherit' });
  } else {
    // En Linux/Mac
    execSync(`cd "${packageDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  }

  console.log(`✅ Paquete creado: ${zipName}\n`);
} catch (error) {
  console.error('❌ Error creando ZIP:', error.message);
}

console.log('='.repeat(60));
console.log('  ✅ Empaquetado completado');
console.log('='.repeat(60));
console.log('');
console.log('Archivo generado:');
console.log(`  📦 dist/isp-sistema-windows-v1.0.0.zip`);
console.log('');
console.log('Contenido del paquete:');
console.log('  - isp-sistema.exe');
console.log('  - iniciar.bat');
console.log('  - .env.example');
console.log('  - README.txt');
console.log('  - frontend/dist/');
console.log('');
console.log('Entrega este ZIP a tus clientes.');
console.log('');

// Función auxiliar para copiar carpetas
function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);

      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}
