# Guía de Configuración de Conectividad

Este documento explica cómo configurar el sistema para que funcione en diferentes entornos: localhost, red local y dominio público.

## 🎯 Resumen Rápido

El sistema está **pre-configurado** para detectar automáticamente la URL correcta del API según desde dónde se accede. En la mayoría de casos, **no necesitas configurar nada manualmente**.

## 🔧 Configuración del Backend

### 1. Copiar archivo de configuración

```bash
cd backend
cp .env.example .env
```

### 2. Editar `.env` según tu entorno

#### Desarrollo Local (localhost)
```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:8080,http://127.0.0.1:8080
```

#### Red Local (LAN)
```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:8080,http://10.10.0.121:8080,http://192.168.1.100:8080
```

**Nota:** Reemplaza `10.10.0.121` y `192.168.1.100` con tu IP real.

#### Producción (Dominio)
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://isp.serviciosqbit.net,https://www.isp.serviciosqbit.net
PUBLIC_URL=https://isp.serviciosqbit.net
API_URL=https://isp.serviciosqbit.net/api
```

### 3. Iniciar el backend

```bash
npm install
npm start
```

El servidor estará disponible en:
- Local: `http://localhost:3001`
- LAN: `http://TU_IP:3001`

---

## 🎨 Configuración del Frontend

### 1. Copiar archivo de configuración

```bash
cd frontend
cp .env.example .env
```

### 2. Configuración Automática (Recomendado)

**Dejar el archivo `.env` vacío o con:**
```env
VUE_APP_API_URL=
```

El sistema detectará automáticamente la URL correcta del API.

### 3. Configuración Manual (Opcional)

Si prefieres especificar manualmente la URL del API:

#### Para localhost:
```env
VUE_APP_API_URL=http://localhost:3001/api/
```

#### Para red local:
```env
VUE_APP_API_URL=http://10.10.0.121:3001/api/
```

#### Para dominio:
```env
VUE_APP_API_URL=https://isp.serviciosqbit.net/api/
```

### 4. Iniciar el frontend

```bash
npm install
npm run serve
```

El frontend estará disponible en:
- Local: `http://localhost:8080`
- LAN: `http://TU_IP:8080`

---

## 🌐 Cómo Funciona la Detección Automática

El frontend detecta automáticamente la URL del API según el hostname desde el que se accede:

| Acceso desde | Frontend | Backend detectado |
|--------------|----------|-------------------|
| `localhost:8080` | http://localhost:8080 | http://localhost:3001/api/ |
| `10.10.0.121:8080` | http://10.10.0.121:8080 | http://10.10.0.121:3001/api/ |
| `isp.serviciosqbit.net` | https://isp.serviciosqbit.net | https://isp.serviciosqbit.net/api/ |

---

## 🔍 Verificar Conectividad

### 1. Verificar que el backend responde

```bash
curl http://localhost:3001
```

Debe responder:
```json
{"message": "API del Sistema ISP funcionando correctamente desde src/index"}
```

### 2. Verificar desde red local

```bash
curl http://10.10.0.121:3001
```

### 3. Verificar CORS

Abre el frontend en el navegador y revisa la consola (F12). Debes ver:
```
🔗 API URL configurada: http://localhost:3001/api/
📍 Hostname actual: localhost
🌐 Protocolo: http:
```

---

## 🚨 Solución de Problemas

### Error: "Network Error" o "CORS policy"

**Causa:** El backend no permite requests desde tu origen.

**Solución:**
1. Verifica que el backend esté corriendo
2. Agrega tu URL al `CORS_ORIGIN` en `backend/.env`
3. Reinicia el backend

Ejemplo:
```env
CORS_ORIGIN=http://localhost:8080,http://10.10.0.121:8080,http://192.168.1.100:8080
```

### Error: "Cannot connect to backend"

**Causa:** Frontend no encuentra el backend en la URL esperada.

**Solución:**
1. Verifica que el backend esté corriendo en el puerto correcto (3001)
2. Especifica manualmente la URL en `frontend/.env`:
   ```env
   VUE_APP_API_URL=http://TU_IP:3001/api/
   ```
3. Reconstruye el frontend:
   ```bash
   npm run serve
   ```

### El sistema funciona en localhost pero no en red local

**Causa:** Firewall bloqueando puertos o configuración de red.

**Solución:**
1. **Abrir puertos en el firewall:**
   - Windows: `netsh advfirewall firewall add rule name="ISP Backend" protocol=TCP localport=3001 dir=in action=allow`
   - Linux: `sudo ufw allow 3001`
   - Mac: Configurar en Preferencias → Seguridad → Firewall

2. **Obtener tu IP local:**
   - Windows: `ipconfig`
   - Linux/Mac: `ifconfig` o `ip addr`

3. **Iniciar backend escuchando en todas las interfaces:**
   ```javascript
   // En backend/src/index.js cambiar:
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Servidor escuchando en http://0.0.0.0:${PORT}`);
   });
   ```

4. **Acceder desde otro dispositivo:**
   ```
   http://TU_IP_LOCAL:8080
   ```

---

## 🌍 Configuración para Producción con Dominio

### 1. Configurar DNS

Apuntar tu dominio al servidor:
```
A Record: isp.serviciosqbit.net → TU_IP_SERVIDOR
```

### 2. Configurar Nginx como proxy reverso

```nginx
server {
    listen 80;
    server_name isp.serviciosqbit.net;

    # Frontend
    location / {
        root /var/www/isp-frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSockets (para notificaciones en tiempo real)
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Configurar SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d isp.serviciosqbit.net
```

### 4. Variables de entorno para producción

**Backend (.env):**
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://isp.serviciosqbit.net
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=isp_user
DB_PASSWORD=password_seguro
DB_NAME=isp_production
```

**Frontend (.env.production):**
```env
NODE_ENV=production
VUE_APP_API_URL=https://isp.serviciosqbit.net/api/
VUE_APP_PUBLIC_URL=https://isp.serviciosqbit.net
```

### 5. Build y Deploy

```bash
# Backend
cd backend
npm install --production
npm start # O usar PM2: pm2 start src/index.js --name isp-backend

# Frontend
cd frontend
npm install
npm run build
# Copiar dist/ a /var/www/isp-frontend/
```

---

## 📱 Configuración de la App Móvil

La app móvil necesita saber dónde está el backend.

Edita `app/src/services/api.js`:

```javascript
const API_URL = __DEV__
  ? 'http://10.10.0.121:3001/api/' // Tu IP local para desarrollo
  : 'https://isp.serviciosqbit.net/api/'; // Dominio para producción
```

**Nota:** En desarrollo, usa la IP de tu computadora en la red local, NO `localhost` (porque localhost en el móvil apunta al móvil mismo, no a tu computadora).

---

## ✅ Checklist de Configuración

- [ ] Backend corriendo en puerto 3001
- [ ] Frontend corriendo en puerto 8080
- [ ] Archivos `.env` configurados
- [ ] CORS permite el origen del frontend
- [ ] Firewall permite puertos 3001 y 8080
- [ ] DNS configurado (solo producción)
- [ ] SSL configurado (solo producción)
- [ ] Nginx configurado (solo producción)
- [ ] Frontend ve la URL correcta del API (revisar consola F12)

---

## 🆘 Soporte

Si sigues teniendo problemas, revisa:
1. Logs del backend: Busca mensajes como `⚠️ CORS bloqueó origen:`
2. Consola del navegador (F12): Busca errores de red o CORS
3. Variables de entorno: Asegúrate que estén cargadas correctamente

Para más ayuda, contacta al equipo de desarrollo.
