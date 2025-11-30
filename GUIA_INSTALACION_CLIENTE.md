# Guia de Instalacion para Clientes - Sistema ISP

Esta guia esta diseñada para clientes que han adquirido el sistema ISP como servicio (SaaS/Membresia). **No necesitas ver el codigo fuente ni modificar archivos.**

## Contenido

1. [Requisitos del Sistema](#requisitos)
2. [Instalacion Inicial](#instalacion)
3. [Configuracion del Dominio](#dominio)
4. [Configuracion de Servicios](#servicios)
5. [Despliegue en Produccion](#produccion)
6. [Soporte](#soporte)

---

## 1. Requisitos del Sistema {#requisitos}

### Servidor (Requerido)

**Minimo:**
- OS: Ubuntu 20.04 LTS o Windows Server 2019
- RAM: 4 GB
- CPU: 2 cores
- Disco: 50 GB SSD
- Ancho de banda: 100 Mbps

**Recomendado:**
- OS: Ubuntu 22.04 LTS
- RAM: 8 GB
- CPU: 4 cores
- Disco: 100 GB NVMe SSD
- Ancho de banda: 1 Gbps

### Software Requerido

```bash
# Ubuntu
- Node.js 18 LTS o superior
- PostgreSQL 14 o superior
- Nginx (opcional, recomendado)
- Docker (opcional, para Coturn)

# Windows
- Node.js 18 LTS o superior
- PostgreSQL 14 o superior
- Nginx for Windows (opcional)
```

### Dominio

- Dominio propio (ej: `tuisp.com`)
- Acceso a configuracion DNS (Cloudflare recomendado)

---

## 2. Instalacion Inicial {#instalacion}

### Opcion A: Ubuntu (Recomendado)

#### Paso 1: Instalar Dependencias

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2
```

#### Paso 2: Configurar Base de Datos

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear usuario y base de datos
CREATE USER ispuser WITH PASSWORD 'tu_password_segura';
CREATE DATABASE ispdb OWNER ispuser;
GRANT ALL PRIVILEGES ON DATABASE ispdb TO ispuser;
\q
```

#### Paso 3: Descomprimir y Configurar Sistema

```bash
# Descomprimir archivo recibido
unzip sistema-isp.zip
cd sistema-isp

# Instalar dependencias del backend
cd backend
npm install

# Crear archivo .env
nano .env
```

Contenido del archivo `.env`:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ispdb
DB_USER=ispuser
DB_PASSWORD=tu_password_segura

# Servidor
PORT=3000
NODE_ENV=production

# Seguridad (genera una clave aleatoria segura)
JWT_SECRET=tu_clave_jwt_muy_segura_aqui
ENCRYPTION_KEY=tu_clave_encriptacion_muy_segura_aqui
```

**IMPORTANTE:** Genera claves seguras con:
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Paso 4: Instalar y Configurar Frontend

```bash
cd ../frontend
npm install

# Build para produccion
npm run build

# Los archivos quedan en: frontend/dist
```

#### Paso 5: Configurar Nginx

```bash
# Copiar configuracion
sudo cp nginx.conf /etc/nginx/sites-available/isp

# Editar dominio
sudo nano /etc/nginx/sites-available/isp
# Cambiar: server_name tudominio.com;

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/isp /etc/nginx/sites-enabled/

# Eliminar default
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuracion
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

#### Paso 6: Iniciar Backend con PM2

```bash
cd backend

# Iniciar con PM2
pm2 start index.js --name isp-backend

# Guardar configuracion
pm2 save

# Habilitar inicio automatico
pm2 startup
# Ejecutar el comando que PM2 te muestra

# Ver logs
pm2 logs isp-backend
```

### Opcion B: Windows

#### Paso 1: Instalar Software

1. **Node.js**: https://nodejs.org (version LTS)
2. **PostgreSQL**: https://www.postgresql.org/download/windows/
3. **Nginx**: http://nginx.org/download/nginx-1.24.0.zip

#### Paso 2: Configurar PostgreSQL

```powershell
# Acceder a psql desde cmd
cd C:\Program Files\PostgreSQL\14\bin
psql -U postgres

# Crear usuario y DB
CREATE USER ispuser WITH PASSWORD 'tu_password_segura';
CREATE DATABASE ispdb OWNER ispuser;
GRANT ALL PRIVILEGES ON DATABASE ispdb TO ispuser;
\q
```

#### Paso 3: Instalar Sistema

```powershell
# Descomprimir sistema-isp.zip a C:\isp-sistema

cd C:\isp-sistema\backend
npm install

# Crear .env (mismo contenido que Ubuntu)
notepad .env

# Build del frontend
cd ..\frontend
npm install
npm run build
```

#### Paso 4: Configurar Nginx

```powershell
# Descomprimir nginx a C:\nginx

# Copiar configuracion
Copy-Item C:\isp-sistema\nginx.conf C:\nginx\conf\nginx.conf

# Editar dominio
notepad C:\nginx\conf\nginx.conf
# Cambiar: server_name tudominio.com;

# Iniciar Nginx
cd C:\nginx
start nginx
```

#### Paso 5: Iniciar Backend

```powershell
cd C:\isp-sistema\backend

# Instalar PM2 para Windows
npm install -g pm2
npm install -g pm2-windows-service

# Configurar como servicio
pm2-service-install -n ISP-Backend

# Iniciar
pm2 start index.js --name isp-backend
pm2 save
```

---

## 3. Configuracion del Dominio {#dominio}

### Paso 1: Configurar DNS

**En Cloudflare (o tu proveedor DNS):**

```
Tipo: A
Nombre: @
Contenido: IP_PUBLICA_DE_TU_SERVIDOR
Proxy: ON (nube naranja) - Activar SSL automatico
TTL: Auto
```

**Opcional - Subdominio API:**
```
Tipo: A
Nombre: api
Contenido: IP_PUBLICA_DE_TU_SERVIDOR
Proxy: ON
TTL: Auto
```

### Paso 2: Configurar en el Sistema

**Accede a tu sistema:**
```
https://tudominio.com
```

**Login inicial:**
```
Usuario: admin
Password: admin123
```

**⚠️ IMPORTANTE:** Cambia la contraseña inmediatamente desde: Configuracion → Usuarios

### Paso 3: Configurar Dominio en Settings

1. Ve a: **Configuracion → Sistema → Dominio**
2. Configura:
   ```
   Dominio Principal: tudominio.com
   Origenes Permitidos:
   - https://tudominio.com
   - https://www.tudominio.com
   ```
3. Click **Guardar**
4. Click **Recargar CORS**

**¡Listo!** Ahora tu dominio funciona correctamente sin errores de CORS.

---

## 4. Configuracion de Servicios {#servicios}

### Email (SMTP)

**Configuracion → Email**

```
Host: smtp.gmail.com
Puerto: 587
Usuario: tu-email@gmail.com
Password: tu_app_password
From Name: ISP TuNombre
From Address: noreply@tudominio.com
```

**Probar:** Click en "Enviar Prueba"

### Telegram

**Configuracion → Telegram**

1. Crea un bot con @BotFather en Telegram
2. Copia el token
3. Configura:
   ```
   Bot Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   Chat ID: -100123456789 (grupo donde enviara notificaciones)
   ```
4. Click **Probar Conexion**

### WhatsApp

**Configuracion → WhatsApp**

**Opcion 1: Twilio (Mas facil)**
```
Metodo: Twilio
Account SID: ACxxxxxxxxxx
Auth Token: xxxxxxxxxx
Numero: +52xxxxxxxxxx
```

**Opcion 2: WhatsApp Business API (Gratis, mas complejo)**
```
Metodo: WhatsApp Business API
API URL: https://graph.facebook.com/v17.0/
Phone Number ID: 123456789012345
API Token: EAAxxxxxxxxxx
```

**Probar:** Click en "Enviar Prueba"

### SMS (Telefono Android)

**Configuracion → SMS**

1. Instala "SMS Gateway API" en un Android
2. Conecta el telefono a la red
3. Configura:
   ```
   Gateway Type: smsgateway
   URL: http://IP_DEL_TELEFONO:8080
   Token: (generado por la app)
   ```
4. Click **Probar Conexion**

### Videollamadas (TURN Server)

**Opcional - Solo si tienes usuarios remotos**

```bash
# Instalar Coturn
bash install-coturn.sh

# Configurar en Cloudflare
Tipo: A
Nombre: turn
Contenido: IP_PUBLICA
Proxy: OFF (gris, no naranja)

# Abrir puertos en router
3478/UDP
5349/TCP
49152-65535/UDP
```

---

## 5. Despliegue en Produccion {#produccion}

### SSL/TLS (HTTPS)

**Opcion 1: Cloudflare (Recomendado - Gratis)**

1. Agrega tu dominio a Cloudflare
2. Cambia los nameservers de tu dominio
3. En Cloudflare:
   - SSL/TLS → Full
   - Always Use HTTPS: ON
   - Automatic HTTPS Rewrites: ON

**Opcion 2: Let's Encrypt (Manual)**

```bash
# Ubuntu
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com

# Auto-renovacion
sudo systemctl enable certbot.timer
```

### Firewall

```bash
# Ubuntu
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3478/udp  # TURN (si usas)
sudo ufw allow 5349/tcp  # TURN TLS (si usas)
sudo ufw enable

# Windows
# Panel de Control → Firewall → Reglas de entrada
# Agregar: 80, 443, 3478/UDP, 5349/TCP
```

### Backup Automatico

```bash
# Crear script de backup
nano /home/user/backup-isp.sh
```

Contenido:
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/home/user/backups"

mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -U ispuser ispdb > $BACKUP_DIR/ispdb-$DATE.sql

# Backup de uploads
tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz /home/user/sistema-isp/backend/uploads

# Eliminar backups antiguos (>30 dias)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completado: $DATE"
```

```bash
# Hacer ejecutable
chmod +x /home/user/backup-isp.sh

# Agregar a cron (diario a las 2am)
crontab -e
# Agregar: 0 2 * * * /home/user/backup-isp.sh
```

### Monitoreo

```bash
# Ver logs del backend
pm2 logs isp-backend

# Ver logs de Nginx
sudo tail -f /var/log/nginx/isp-access.log
sudo tail -f /var/log/nginx/isp-error.log

# Reiniciar servicios
pm2 restart isp-backend
sudo systemctl restart nginx
```

---

## 6. Soporte {#soporte}

### Problemas Comunes

#### "Invalid Host header"
- **Solucion:** Configura tu dominio en Configuracion → Sistema → Dominio

#### Error 502 Bad Gateway
```bash
# Verificar que el backend este corriendo
pm2 list
pm2 restart isp-backend
```

#### Error de CORS
- **Solucion:** Configuracion → Sistema → Dominio → Recargar CORS

#### Base de datos no conecta
- Verifica credenciales en `.env`
- Verifica que PostgreSQL este corriendo:
  ```bash
  sudo systemctl status postgresql
  ```

### Comandos Utiles

```bash
# Ver estado de servicios
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Reiniciar servicios
pm2 restart isp-backend
sudo systemctl restart nginx

# Ver logs
pm2 logs isp-backend --lines 100
sudo tail -f /var/log/nginx/error.log

# Actualizar sistema
cd /home/user/sistema-isp
git pull  # Si usas Git
pm2 restart isp-backend
```

### Contacto de Soporte

- **Email:** soporte@tuproveedor.com
- **Telegram:** @soporte_isp
- **Horario:** Lunes a Viernes 9am - 6pm

---

## Proximos Pasos

1. ✅ Instalar sistema
2. ✅ Configurar dominio
3. ✅ Configurar servicios (Email, WhatsApp, SMS)
4. ✅ Configurar SSL/TLS
5. ✅ Configurar backups
6. ⏭️ Comenzar a usar el sistema:
   - Agregar clientes
   - Configurar planes de servicio
   - Generar facturas
   - Gestionar tickets de soporte

**¡Felicidades! Tu sistema ISP esta listo para produccion.**
