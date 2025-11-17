# ISP Manager - Aplicación Móvil y Desktop

Esta es la aplicación móvil (iOS/Android) y desktop (Windows/Mac/Linux) para el Sistema de Gestión ISP.

## Tecnologías Utilizadas

- **React Native**: Framework para desarrollo móvil multiplataforma
- **Expo**: Herramientas y servicios para React Native
- **Electron**: Framework para aplicaciones desktop
- **React Navigation**: Navegación entre pantallas
- **React Native Paper**: Componentes UI con Material Design
- **Axios**: Cliente HTTP para API
- **AsyncStorage**: Almacenamiento local

## Estructura del Proyecto

```
app/
├── src/
│   ├── screens/          # Pantallas de la aplicación
│   ├── components/       # Componentes reutilizables
│   ├── services/         # Servicios (API, Auth, etc.)
│   ├── utils/            # Utilidades y helpers
│   └── navigation/       # Configuración de navegación
├── assets/               # Imágenes, íconos, fuentes
├── App.js                # Componente principal
├── index.js              # Punto de entrada para móvil
├── electron.js           # Punto de entrada para desktop
├── package.json          # Dependencias y scripts
└── app.json              # Configuración de Expo

## Instalación

1. Instalar dependencias:
```bash
cd app
npm install
```

## Desarrollo

### Móvil (iOS/Android)

```bash
# Iniciar servidor de desarrollo
npm start

# Iniciar en Android
npm run android

# Iniciar en iOS
npm run ios

# Iniciar en navegador web
npm run web
```

### Desktop (Electron)

```bash
# Modo desarrollo
npm run dev

# Build para producción
npm run electron:build
```

## Funcionalidades Implementadas

### Portal del Cliente
- ✅ Dashboard con estado de cuenta
- ✅ Gestión de facturas
- ✅ Sistema de tickets de soporte
- ✅ Estadísticas de consumo
- ✅ Perfil de usuario

### Características
- 🔐 Autenticación segura
- 📱 Diseño responsive
- 🌐 Sincronización con backend
- 💾 Almacenamiento local
- 🎨 UI/UX moderna con Material Design
- 📊 Gráficas de consumo

## Pantallas

1. **LoginScreen**: Pantalla de inicio de sesión
2. **DashboardScreen**: Dashboard principal del cliente
3. **InvoicesScreen**: Lista de facturas
4. **InvoiceDetailScreen**: Detalle de factura individual
5. **TicketsScreen**: Lista de tickets de soporte
6. **TicketDetailScreen**: Detalle de ticket con comentarios
7. **UsageScreen**: Estadísticas de consumo de internet
8. **ProfileScreen**: Perfil y configuración del usuario

## API

La aplicación se conecta al backend en:
- Desarrollo: http://localhost:3001/api
- Producción: Configurar en `src/services/api.js`

## Build para Producción

### Android (APK/AAB)
```bash
expo build:android
```

### iOS (IPA)
```bash
expo build:ios
```

### Desktop
```bash
npm run electron:build
```

## Despliegue

### Móvil
- **Android**: Google Play Store
- **iOS**: Apple App Store

### Desktop
- **Windows**: Instalador .exe
- **Mac**: Aplicación .app / .dmg
- **Linux**: AppImage / .deb / .rpm

## Próximas Características

- [ ] Notificaciones push
- [ ] Pago de facturas integrado
- [ ] Chat en vivo con soporte
- [ ] Modo offline
- [ ] Reportes descargables
- [ ] Múltiples idiomas

## Licencia

MIT
