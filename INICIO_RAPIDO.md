# 🚀 Inicio Rápido - Sistema ISP

Esta guía te ayudará a poner en marcha el sistema ISP en menos de 5 minutos.

## ⚡ Configuración Rápida

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd ISP-Prueba
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
npm start
```

El backend estará disponible en:
- **Local:** http://localhost:3001
- **Red Local:** http://TU_IP:3001

### 3. Frontend
```bash
cd frontend
npm install
npm run serve
```

El frontend estará disponible en:
- **Local:** http://localhost:8080
- **Red Local:** http://TU_IP:8080

### 4. App Móvil/Desktop (Opcional)
```bash
cd app
npm install
npm start  # Para móvil
npm run electron  # Para desktop
```

## ✅ Verificar Conectividad

Ejecuta el script de verificación:
```bash
./scripts/verify-connectivity.sh
```

## 🌐 Acceso desde Red Local

### Paso 1: Obtener tu IP local

**Windows:**
```bash
ipconfig
```
Busca "IPv4 Address" bajo tu adaptador de red activo.

**Mac/Linux:**
```bash
ifconfig
# o
ip addr
```

### Paso 2: Configurar Firewall

**Windows:**
```powershell
netsh advfirewall firewall add rule name="ISP Backend" protocol=TCP localport=3001 dir=in action=allow
netsh advfirewall firewall add rule name="ISP Frontend" protocol=TCP localport=8080 dir=in action=allow
```

**Linux (Ubuntu/Debian):**
```bash
sudo ufw allow 3001/tcp
sudo ufw allow 8080/tcp
```

**Mac:**
- Ve a Preferencias del Sistema → Seguridad y Privacidad → Firewall
- Click en "Opciones de Firewall"
- Agrega Node.js y permite conexiones entrantes

### Paso 3: Acceder desde otro dispositivo

Abre en el navegador de cualquier dispositivo en la misma red:
```
http://TU_IP:8080
```

Ejemplo:
```
http://192.168.1.100:8080
```

## 🔑 Usuarios por Defecto

**Administrador:**
- Email: `admin@example.com`
- Password: `admin123`

**Cliente:**
- Email: `cliente@example.com`
- Password: `cliente123`

## 📱 App Móvil

Para probar la app móvil en tu teléfono:

1. Asegúrate de que tu computadora y teléfono estén en la misma red WiFi
2. Edita `app/src/services/api.js`:
   ```javascript
   const API_URL = 'http://TU_IP:3001/api/'; // Reemplaza TU_IP
   ```
3. Ejecuta `npm start` en la carpeta `app`
4. Escanea el código QR con la app Expo Go

## 🛠️ Solución de Problemas Comunes

### "Cannot connect to backend"

✅ **Solución:**
1. Verifica que el backend esté corriendo: `curl http://localhost:3001`
2. Revisa la configuración de CORS en `backend/.env`
3. Asegúrate de que no haya otro proceso usando el puerto 3001

### "Network Error" o errores de CORS

✅ **Solución:**
1. Agrega tu URL al CORS en `backend/.env`:
   ```env
   CORS_ORIGIN=http://localhost:8080,http://TU_IP:8080
   ```
2. Reinicia el backend

### El sistema funciona en localhost pero no en la red

✅ **Solución:**
1. Verifica tu firewall (ver Paso 2 arriba)
2. Asegúrate de que el backend escuche en `0.0.0.0` (ya configurado)
3. Usa tu IP real, no localhost

### No puedo acceder desde mi teléfono

✅ **Solución:**
1. Teléfono y computadora deben estar en la MISMA red WiFi
2. Desactiva VPN si la tienes activada
3. Algunos routers bloquean comunicación entre dispositivos (modo "aislamiento AP")

## 📚 Documentación Completa

- **[Conectividad Detallada](docs/CONECTIVIDAD.md)** - Guía completa de configuración de red
- **[API Documentation](docs/API.md)** - Documentación de endpoints (si existe)
- **[Deployment](docs/DEPLOYMENT.md)** - Cómo desplegar en producción (si existe)

## 🆘 Ayuda

Si sigues teniendo problemas:

1. Revisa los logs del backend en la consola
2. Abre la consola del navegador (F12) y busca errores
3. Ejecuta el script de verificación: `./scripts/verify-connectivity.sh`
4. Consulta `docs/CONECTIVIDAD.md` para configuración avanzada

## 🎯 Próximos Pasos

Una vez que el sistema esté funcionando:

1. **Explora el sistema:** Navega por todas las secciones
2. **Crea datos de prueba:** Agrega clientes, paquetes, facturas
3. **Configura MikroTik:** Si tienes routers MikroTik, configura la conexión
4. **Personaliza:** Modifica logos, colores, nombres según tu ISP
5. **Producción:** Consulta `docs/CONECTIVIDAD.md` sección "Producción"

---

**¿Todo funcionando? ¡Excelente! 🎉**

Ahora puedes empezar a gestionar tu ISP de manera profesional.
