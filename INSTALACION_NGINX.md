# Instalacion de Nginx como Proxy Reverso

Nginx actua como intermediario entre Cloudflare y tus servidores (Frontend + Backend).

```
Cloudflare (HTTPS)
       ↓
   Nginx :80/443
       ↓
   ├─→ / → Frontend :8080
   └─→ /api → Backend :3000
```

## Opcion 1: Windows (Desarrollo)

### 1. Descargar Nginx para Windows

```powershell
# Ir a http://nginx.org/en/download.html
# Descargar: nginx-1.24.0.zip (stable version)

# O via PowerShell:
Invoke-WebRequest -Uri "http://nginx.org/download/nginx-1.24.0.zip" -OutFile "nginx.zip"
Expand-Archive -Path nginx.zip -DestinationPath C:\nginx
```

### 2. Copiar configuracion

```powershell
# Copiar el archivo nginx.conf a la carpeta de Nginx
Copy-Item nginx.conf C:\nginx\nginx-1.24.0\conf\nginx.conf -Force
```

### 3. Iniciar Nginx

```powershell
# Ir a la carpeta de Nginx
cd C:\nginx\nginx-1.24.0

# Iniciar Nginx
start nginx

# Verificar que esta corriendo
tasklist /fi "imagename eq nginx.exe"
```

### 4. Comandos utiles (Windows)

```powershell
# Detener Nginx
nginx -s stop

# Reiniciar (aplicar cambios de configuracion)
nginx -s reload

# Verificar configuracion
nginx -t

# Ver logs
type logs\error.log
type logs\access.log
```

### 5. Abrir puertos en Firewall de Windows

```powershell
# Ejecutar PowerShell como Administrador
New-NetFirewallRule -DisplayName "Nginx HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Nginx HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

## Opcion 2: Ubuntu/Linux (Produccion)

### 1. Instalar Nginx

```bash
# Actualizar paquetes
sudo apt update

# Instalar Nginx
sudo apt install nginx -y

# Verificar instalacion
nginx -v
```

### 2. Configurar Nginx

```bash
# Eliminar configuracion por defecto
sudo rm /etc/nginx/sites-enabled/default

# Copiar nuestra configuracion
sudo cp nginx.conf /etc/nginx/sites-available/isp

# Crear symlink para habilitar
sudo ln -s /etc/nginx/sites-available/isp /etc/nginx/sites-enabled/isp

# Verificar configuracion
sudo nginx -t
```

### 3. Iniciar Nginx

```bash
# Habilitar inicio automatico
sudo systemctl enable nginx

# Iniciar servicio
sudo systemctl start nginx

# Verificar estado
sudo systemctl status nginx
```

### 4. Comandos utiles (Ubuntu)

```bash
# Reiniciar Nginx
sudo systemctl restart nginx

# Recargar configuracion (sin downtime)
sudo systemctl reload nginx

# Detener Nginx
sudo systemctl stop nginx

# Ver logs en tiempo real
sudo tail -f /var/log/nginx/isp-access.log
sudo tail -f /var/log/nginx/isp-error.log

# Verificar configuracion
sudo nginx -t
```

### 5. Abrir puertos en Firewall (Ubuntu)

```bash
# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# O manualmente:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar estado
sudo ufw status
```

## Configuracion en Cloudflare

Una vez que Nginx este corriendo:

### 1. DNS en Cloudflare

```
Tipo: A
Nombre: @
Contenido: TU_IP_PUBLICA
Proxy: ON (nube naranja) ← IMPORTANTE
TTL: Auto
```

### 2. SSL/TLS en Cloudflare

1. Ve a SSL/TLS → Overview
2. Selecciona: **"Flexible"** o **"Full"**
   - Flexible: Cloudflare ↔ Nginx es HTTP
   - Full: Cloudflare ↔ Nginx es HTTPS (requiere certificado)

Para desarrollo usa **Flexible**.

### 3. Verificar

```bash
# Desde tu computadora
curl https://isp.serviciosqbit.net

# Debe mostrar el HTML del frontend
```

## Configuracion del Router

Si tu servidor esta detras de un router, abre estos puertos:

```
Puerto externo: 80 → IP_SERVIDOR:80
Puerto externo: 443 → IP_SERVIDOR:443
```

**Ejemplo TP-Link:**
1. Accede a `192.168.1.1`
2. Advanced → NAT Forwarding → Virtual Servers
3. Agrega:
   ```
   Service Port: 80
   Internal Port: 80
   IP Address: 192.168.1.X (tu servidor)
   Protocol: TCP

   Service Port: 443
   Internal Port: 443
   IP Address: 192.168.1.X (tu servidor)
   Protocol: TCP
   ```

## Iniciar Servicios en Orden

```bash
# 1. Iniciar Backend
cd backend
npm run dev
# Debe estar en puerto 3000

# 2. Iniciar Frontend
cd frontend
npm run serve
# Debe estar en puerto 8080

# 3. Iniciar Nginx
# Windows:
start nginx

# Ubuntu:
sudo systemctl start nginx
```

## Verificar que Todo Funciona

### 1. Verificar servicios locales

```bash
# Backend
curl http://localhost:3000/api/test

# Frontend
curl http://localhost:8080

# Nginx
curl http://localhost
```

### 2. Verificar via Cloudflare

```bash
# Acceder desde navegador:
https://isp.serviciosqbit.net

# Verificar API:
curl https://isp.serviciosqbit.net/api/test

# Ver consola del navegador (F12)
# No debe haber errores de CORS
```

### 3. Verificar WebSocket (Socket.io)

En la consola del navegador (F12):

```javascript
// Debe conectar sin errores
// Busca: "Usuario conectado" en los logs
```

## Troubleshooting

### Error: "Invalid Host header"
- ✅ Nginx resuelve esto. El header Host se pasa correctamente.

### Error: 502 Bad Gateway
```bash
# Verificar que backend este corriendo
curl http://localhost:3000

# Verificar que frontend este corriendo
curl http://localhost:8080

# Ver logs de Nginx
sudo tail -f /var/log/nginx/isp-error.log
```

### Error: CORS
```bash
# Verificar que backend tenga configurado CORS para el dominio
# backend/index.js debe incluir:
# 'https://isp.serviciosqbit.net'
```

### Error: WebSocket no conecta
```bash
# Verificar que nginx.conf tenga:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";

# Reiniciar Nginx
sudo systemctl reload nginx
```

### Nginx no inicia (Windows)
```powershell
# Ver error
type C:\nginx\nginx-1.24.0\logs\error.log

# Puerto ocupado?
netstat -ano | findstr :80
netstat -ano | findstr :443

# Matar proceso que ocupa el puerto
taskkill /PID NUMERO_PID /F
```

### Nginx no inicia (Ubuntu)
```bash
# Ver error
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Puerto ocupado?
sudo netstat -tulpn | grep :80

# Verificar configuracion
sudo nginx -t
```

## Alternativa: Usar Cloudflare Tunnel (Sin abrir puertos)

Si no puedes abrir puertos en tu router, usa Cloudflare Tunnel:

```bash
# Instalar cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Autenticar
cloudflared tunnel login

# Crear tunnel
cloudflared tunnel create isp-tunnel

# Configurar
nano ~/.cloudflared/config.yml
```

Contenido de `config.yml`:
```yaml
tunnel: TU_TUNNEL_ID
credentials-file: /home/user/.cloudflared/TU_TUNNEL_ID.json

ingress:
  - hostname: isp.serviciosqbit.net
    service: http://localhost:80
  - service: http_status:404
```

```bash
# Iniciar tunnel
cloudflared tunnel run isp-tunnel

# Instalar como servicio
sudo cloudflared service install
```

## Arquitectura Final

```
Internet
    ↓
Cloudflare CDN (SSL/TLS)
    ↓
Nginx (Proxy Reverso)
    ↓
    ├─→ / → Vue.js :8080
    ├─→ /api → Node.js :3000
    ├─→ /socket.io → Socket.io :3000
    └─→ /uploads → Node.js :3000
```

## Ventajas de esta Configuracion

1. ✅ Un solo dominio: `https://isp.serviciosqbit.net`
2. ✅ No mas problemas de CORS
3. ✅ No mas "Invalid Host header"
4. ✅ WebSocket funciona correctamente
5. ✅ SSL/TLS gratis via Cloudflare
6. ✅ Facil de escalar (agregar mas backends)
7. ✅ Logs centralizados
