# 🚀 Guía de Despliegue - Sistema ISP

Esta guía te ayudará a configurar el sistema para que funcione desde:
- ✅ `localhost` (desarrollo)
- ✅ `10.10.0.121` (red local)
- ✅ `ISP.serviciosqbit.net` (dominio público)

---

## 📋 Requisitos Previos

- Node.js v16+ instalado
- npm o yarn instalado
- Puerto 3000 (backend) y 8080 (frontend) disponibles
- (Opcional) Dominio configurado apuntando al servidor

---

## 1️⃣ Configuración del Backend

### Paso 1: Variables de Entorno

```bash
cd backend
cp .env.example .env
```

### Paso 2: Editar `.env` según tu escenario

#### Escenario A: Solo desarrollo local (localhost)
```env
PORT=3000
NODE_ENV=development
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
CORS_ORIGIN=http://localhost:8080
```

#### Escenario B: Red local (10.10.0.121)
```env
PORT=3000
NODE_ENV=development
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
CORS_ORIGIN=http://localhost:8080,http://10.10.0.121:8080
```

#### Escenario C: Producción con dominio
```env
PORT=3000
NODE_ENV=production
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=isp_user
DB_PASSWORD=tu_password_seguro
DB_NAME=isp_database
CORS_ORIGIN=https://isp.serviciosqbit.net,http://isp.serviciosqbit.net
```

### Paso 3: Instalar dependencias y arrancar

```bash
npm install
npm start
```

El backend estará corriendo en: `http://0.0.0.0:3000`

---

## 2️⃣ Configuración del Frontend

### Paso 1: Variables de Entorno (OPCIONAL)

El frontend **detecta automáticamente** la URL del backend, pero puedes forzarla:

```bash
cd frontend
cp .env.example .env.local
```

#### Opción A: Detección Automática (RECOMENDADO)
No configures nada. El sistema detectará automáticamente:
- Si accedes desde `localhost` → usará `http://localhost:3000/api/`
- Si accedes desde `10.10.0.121` → usará `http://10.10.0.121:3000/api/`
- Si accedes desde `isp.serviciosqbit.net` → usará `https://isp.serviciosqbit.net/api/`

#### Opción B: Manual Override
En `.env.local`:
```env
# Para red local
VUE_APP_API_URL=http://10.10.0.121:3000/api/

# O para dominio
VUE_APP_API_URL=https://isp.serviciosqbit.net/api/
```

### Paso 2: Instalar dependencias y arrancar

```bash
npm install
npm run serve
```

El frontend estará corriendo en: `http://0.0.0.0:8080`

---

## 3️⃣ Acceder al Sistema

### Desde tu computadora (desarrollo)
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000/api`

### Desde otro equipo en la red local
Reemplaza `<IP_DEL_SERVIDOR>` con la IP del servidor (ej: 10.10.0.121):

- Frontend: `http://10.10.0.121:8080`
- Backend API: `http://10.10.0.121:3000/api`

**⚠️ IMPORTANTE:** El backend debe estar escuchando en `0.0.0.0` (todas las interfaces), no solo en `localhost`.

Para verificar:
```bash
cd backend
node src/index.js
# Debe decir: "Servidor corriendo en el puerto 3000"
```

### Desde el dominio público (producción)

1. **Configurar DNS**: Apuntar `isp.serviciosqbit.net` a la IP pública del servidor

2. **Configurar Nginx como reverse proxy**:

```nginx
# /etc/nginx/sites-available/isp
server {
    listen 80;
    server_name isp.serviciosqbit.net;

    # Redirigir todo a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name isp.serviciosqbit.net;

    # Certificado SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/isp.serviciosqbit.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/isp.serviciosqbit.net/privkey.pem;

    # Frontend (Vue build)
    location / {
        root /var/www/isp-frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSockets (para videollamadas y notificaciones)
    location /ws/ {
        proxy_pass http://localhost:3000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. **Habilitar el sitio**:
```bash
sudo ln -s /etc/nginx/sites-available/isp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Obtener certificado SSL**:
```bash
sudo certbot --nginx -d isp.serviciosqbit.net
```

5. **Build del frontend para producción**:
```bash
cd frontend
npm run build
sudo cp -r dist/* /var/www/isp-frontend/dist/
```

---

## 4️⃣ Verificar Conectividad

### Test Backend
```bash
curl http://localhost:3000/api/setup/status
# Debe devolver: {"setupCompleted":false,"progress":0}
```

Desde otro equipo en la red:
```bash
curl http://10.10.0.121:3000/api/setup/status
```

### Test Frontend
Abre el navegador en: `http://10.10.0.121:8080`

Abre la consola del navegador (F12) y deberías ver:
```
🔗 API URL configurada: http://10.10.0.121:3000/api/
📍 Hostname actual: 10.10.0.121
🌐 Protocolo: http:
```

---

## 5️⃣ Modo Producción

### Backend como servicio (systemd)

```bash
sudo nano /etc/systemd/system/isp-backend.service
```

```ini
[Unit]
Description=ISP Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/isp-backend
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable isp-backend
sudo systemctl start isp-backend
sudo systemctl status isp-backend
```

---

## 🐛 Solución de Problemas

### Problema: Frontend no conecta con backend en red local

**Síntoma**: Error de CORS o "Network Error"

**Solución**:
1. Verificar que backend está en `0.0.0.0:3000`, no solo `localhost:3000`
2. Verificar firewall:
   ```bash
   sudo ufw allow 3000
   sudo ufw allow 8080
   ```
3. Verificar CORS en backend (ya configurado automáticamente)

### Problema: Dominio no funciona

**Síntoma**: 502 Bad Gateway o Connection Refused

**Solución**:
1. Verificar que backend está corriendo: `systemctl status isp-backend`
2. Verificar Nginx: `sudo nginx -t && sudo systemctl status nginx`
3. Verificar DNS: `nslookup isp.serviciosqbit.net`
4. Verificar logs: `sudo tail -f /var/log/nginx/error.log`

### Problema: API URL incorrecta en frontend

**Síntoma**: Frontend intenta conectar a URL equivocada

**Solución**:
Forzar la URL correcta en `.env.local`:
```env
VUE_APP_API_URL=http://10.10.0.121:3000/api/
```

Luego reconstruir:
```bash
npm run serve
# O para producción
npm run build
```

---

## 📊 Resumen de Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Backend API | 3000 | Servidor Express |
| Frontend Dev | 8080 | Vue Dev Server |
| Frontend Prod | 80/443 | Nginx (HTTP/HTTPS) |
| Base de Datos | 5432 | PostgreSQL (si se usa) |
| Servidor de Correo | 8025 | Mailserver (si se usa local) |
| WebSockets | 3000/ws | Notificaciones tiempo real |

---

## ✅ Checklist de Despliegue

- [ ] Backend configurado y corriendo
- [ ] Frontend configurado y corriendo
- [ ] Conectividad localhost verificada
- [ ] Conectividad red local verificada (10.10.0.121)
- [ ] DNS configurado para dominio
- [ ] Nginx configurado como reverse proxy
- [ ] Certificado SSL instalado
- [ ] Servicios systemd creados
- [ ] Firewall configurado
- [ ] Base de datos respaldada
- [ ] Variables de entorno en producción configuradas

---

**¿Necesitas ayuda?** Revisa los logs:
```bash
# Backend
tail -f backend/logs/app.log

# Nginx
sudo tail -f /var/log/nginx/error.log
```
