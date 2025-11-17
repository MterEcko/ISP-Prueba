# 📧 Configuración de Mailu - Servidor de Correo Self-Hosted

**Mailu** es una solución de correo electrónico completa, self-hosted y basada en Docker que incluye:
- ✅ Servidor SMTP/IMAP completo
- ✅ Webmail moderno (Rainloop/Roundcube)
- ✅ Filtro antispam y antivirus
- ✅ Panel de administración web
- ✅ Soporte para múltiples dominios
- ✅ Interfaz REST API

---

## 🚀 Instalación Rápida con Docker

### Requisitos Previos

- Docker y Docker Compose instalados
- Dominio configurado (ejemplo: `mail.tu-isp.com`)
- Puertos disponibles: 25, 465, 587 (SMTP), 143, 993 (IMAP), 80, 443 (Web)
- Mínimo 2GB RAM, 10GB disco

### 1. Crear Directorio de Mailu

```bash
cd /opt
sudo mkdir -p mailu
cd mailu
```

### 2. Generar Configuración

Usa el asistente web de Mailu:
```bash
# Abrir en navegador:
https://setup.mailu.io/

# O usar configuración predeterminada:
```

### 3. Descargar docker-compose.yml

Crea el archivo `/opt/mailu/docker-compose.yml`:

```yaml
version: '3.7'

services:
  # Servidor Redis (caché)
  redis:
    image: redis:alpine
    restart: always
    volumes:
      - "./data/redis:/data"
    networks:
      - default

  # Servidor Front (Nginx)
  front:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}nginx:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    logging:
      driver: journald
      options:
        tag: mailu-front
    ports:
      - "80:80"
      - "443:443"
      - "25:25"     # SMTP
      - "465:465"   # SMTPS
      - "587:587"   # Submission
      - "110:110"   # POP3
      - "995:995"   # POP3S
      - "143:143"   # IMAP
      - "993:993"   # IMAPS
    networks:
      - default
    volumes:
      - "./certs:/certs"
      - "./overrides/nginx:/overrides:ro"
    depends_on:
      - resolver
    dns:
      - 192.168.203.254

  # Resolver DNS interno
  resolver:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}unbound:${MAILU_VERSION:-2.0}
    env_file: mailu.env
    restart: always
    networks:
      default:
        ipv4_address: 192.168.203.254

  # Servidor IMAP
  imap:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}dovecot:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    volumes:
      - "./data/mail:/mail"
      - "./data/overrides/dovecot:/overrides:ro"
    depends_on:
      - front
    networks:
      - default

  # Servidor SMTP
  smtp:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}postfix:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    volumes:
      - "./data/mailqueue:/queue"
      - "./data/overrides/postfix:/overrides:ro"
    depends_on:
      - front
    networks:
      - default

  # Filtro antispam
  antispam:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}rspamd:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    volumes:
      - "./data/filter:/var/lib/rspamd"
      - "./data/overrides/rspamd:/overrides:ro"
    depends_on:
      - front
      - redis
    networks:
      - default

  # Panel de administración
  admin:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}admin:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    volumes:
      - "./data:/data"
      - "./dkim:/dkim"
    depends_on:
      - redis
    networks:
      - default

  # Webmail (opcional)
  webmail:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}roundcube:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    volumes:
      - "./data/webmail:/data"
    depends_on:
      - front
    networks:
      - default

  # ClamAV Antivirus (opcional, requiere 2GB RAM)
  # antivirus:
  #   image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}clamav:${MAILU_VERSION:-2.0}
  #   restart: always
  #   env_file: mailu.env
  #   volumes:
  #     - "./data/filter:/data"
  #   networks:
  #     - default

networks:
  default:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 192.168.203.0/24
```

### 4. Configurar Variables de Entorno

Crea el archivo `/opt/mailu/mailu.env`:

```env
###################################
# CONFIGURACIÓN GENERAL
###################################

# Versión de Mailu
MAILU_VERSION=2.0

# Ruta de instalación (no cambiar si sigues esta guía)
ROOT=/opt/mailu

# Dominio principal del servidor
DOMAIN=tu-isp.com

# Hostname del servidor de correo
HOSTNAMES=mail.tu-isp.com

# Subnet de Docker (debe coincidir con docker-compose.yml)
SUBNET=192.168.203.0/24

# IP del front (Nginx)
WEBMAIL=rainloop
TLS_FLAVOR=letsencrypt

###################################
# CERTIFICADOS SSL
###################################

# Opciones: letsencrypt, cert, notls, mail, mail-letsencrypt
# letsencrypt = Certificados automáticos de Let's Encrypt
TLS_FLAVOR=letsencrypt

# Email para Let's Encrypt
INITIAL_ADMIN_ACCOUNT=admin
INITIAL_ADMIN_DOMAIN=tu-isp.com
INITIAL_ADMIN_PW=TuPasswordSeguro123!

###################################
# AUTENTICACIÓN Y SEGURIDAD
###################################

# Clave secreta (generar con: openssl rand -hex 16)
SECRET_KEY=CAMBIA_ESTO_POR_UNA_CLAVE_ALEATORIA_DE_32_CARACTERES

# Contraseña de la base de datos
DB_PW=PasswordBaseDeDatos123!

# Permitir relay de correo (útil para el sistema ISP)
RELAYHOST=
RELAY_USER=
RELAY_PASSWORD=

###################################
# LÍMITES Y CUOTAS
###################################

# Cuota de buzón por defecto (GB)
DEFAULT_QUOTA=10

# Límite de tamaño de mensaje (MB)
MESSAGE_SIZE_LIMIT=50

# Límites de tasa (mensajes por minuto)
MESSAGE_RATELIMIT=200/day

###################################
# FUNCIONES OPCIONALES
###################################

# Habilitar webmail
WEBMAIL=rainloop

# Habilitar antivirus (requiere 2GB RAM)
# ANTIVIRUS=clamav

# Habilitar filtro de spam
ANTISPAM=rspamd

# Registros de actividad
LOG_DRIVER=json-file

###################################
# RED
###################################

# IP pública del servidor (opcional)
# BIND_ADDRESS4=TU_IP_PUBLICA

# Subnet interna de Docker
SUBNET=192.168.203.0/24

###################################
# WEBMAIL
###################################

# rainloop o roundcube
WEBMAIL=rainloop

###################################
# ADVANCED
###################################

# Timezone
TZ=America/Mexico_City

# Organización
SITENAME=Sistema ISP

# Website URL
WEBSITE=https://tu-isp.com

# Deshabilitar estadísticas
DISABLE_STATISTICS=True
```

### 5. Iniciar Mailu

```bash
cd /opt/mailu

# Crear directorios
sudo mkdir -p data/redis data/mail data/filter data/webmail dkim certs

# Asignar permisos
sudo chown -R root:root .
sudo chmod -R 755 data

# Iniciar servicios
sudo docker-compose up -d

# Ver logs
sudo docker-compose logs -f
```

### 6. Acceder al Panel de Administración

```
URL: https://mail.tu-isp.com/admin
Usuario: admin@tu-isp.com
Contraseña: (definida en INITIAL_ADMIN_PW)
```

---

## 🔧 Configuración de DNS

Para que Mailu funcione correctamente, configura estos registros DNS:

```dns
# Registro A
mail.tu-isp.com.        A       TU_IP_PUBLICA

# Registro MX (prioridad 10)
tu-isp.com.             MX      10 mail.tu-isp.com.

# Registro SPF
tu-isp.com.             TXT     "v=spf1 mx ~all"

# Registro DMARC
_dmarc.tu-isp.com.      TXT     "v=DMARC1; p=quarantine; rua=mailto:postmaster@tu-isp.com"

# Registro DKIM (obtener del panel de Mailu)
default._domainkey.tu-isp.com.  TXT  "v=DKIM1; k=rsa; p=MIGfMA0GCS..."

# Registro PTR inverso (configurar con tu proveedor)
TU_IP_PUBLICA           PTR     mail.tu-isp.com.
```

---

## 🔗 Integración con el Sistema ISP

### Configurar Plugin de Email

1. **Acceder al panel de plugins**:
   ```
   Sistema ISP > Configuración > Plugins > Email
   ```

2. **Configurar SMTP**:
   ```json
   {
     "provider": "smtp",
     "from": {
       "name": "Sistema ISP",
       "email": "noreply@tu-isp.com"
     },
     "smtp": {
       "host": "mail.tu-isp.com",
       "port": 587,
       "secure": false,
       "auth": {
         "user": "noreply@tu-isp.com",
         "pass": "PasswordDelUsuario"
       }
     }
   }
   ```

3. **Crear cuenta de envío en Mailu**:
   - Panel Mailu > Users > Add user
   - Email: `noreply@tu-isp.com`
   - Password: (guardar para configuración)
   - Permisos: Solo envío

### Script de Prueba

Prueba la integración con este script:

```bash
cd /home/user/ISP-Prueba
node -e "
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.tu-isp.com',
  port: 587,
  secure: false,
  auth: {
    user: 'noreply@tu-isp.com',
    pass: 'PasswordDelUsuario'
  }
});

transporter.sendMail({
  from: 'Sistema ISP <noreply@tu-isp.com>',
  to: 'tu-email@gmail.com',
  subject: 'Prueba de Mailu',
  html: '<h1>¡Funciona!</h1><p>Mailu está correctamente configurado.</p>'
}, (error, info) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Email enviado:', info.messageId);
  }
});
"
```

---

## 📊 Monitoreo y Mantenimiento

### Ver Logs

```bash
# Logs de todos los servicios
docker-compose logs -f

# Logs de SMTP
docker-compose logs -f smtp

# Logs de admin
docker-compose logs -f admin
```

### Backup

```bash
#!/bin/bash
# Script de backup para Mailu

BACKUP_DIR="/backup/mailu"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear directorio de backup
mkdir -p $BACKUP_DIR

# Backup de datos
cd /opt/mailu
tar -czf $BACKUP_DIR/mailu_data_$DATE.tar.gz data/
tar -czf $BACKUP_DIR/mailu_dkim_$DATE.tar.gz dkim/
tar -czf $BACKUP_DIR/mailu_config_$DATE.tar.gz mailu.env docker-compose.yml

# Eliminar backups antiguos (más de 30 días)
find $BACKUP_DIR -name "mailu_*.tar.gz" -mtime +30 -delete

echo "Backup completado: $BACKUP_DIR"
```

### Actualización

```bash
cd /opt/mailu

# Backup antes de actualizar
./backup.sh

# Actualizar imágenes
docker-compose pull

# Recrear contenedores
docker-compose up -d

# Verificar
docker-compose ps
```

---

## 🛡️ Seguridad y Mejores Prácticas

### Firewall (UFW)

```bash
# Permitir puertos de email
sudo ufw allow 25/tcp   # SMTP
sudo ufw allow 587/tcp  # Submission
sudo ufw allow 465/tcp  # SMTPS
sudo ufw allow 143/tcp  # IMAP
sudo ufw allow 993/tcp  # IMAPS
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Habilitar firewall
sudo ufw enable
```

### Fail2Ban

Protege contra ataques de fuerza bruta:

```bash
sudo apt-get install fail2ban

# Configurar jail para Mailu
sudo nano /etc/fail2ban/jail.d/mailu.conf
```

```ini
[mailu]
enabled = true
filter = mailu
logpath = /opt/mailu/data/admin/mail.log
maxretry = 5
bantime = 3600
findtime = 600
```

### Certificados SSL Renovables

Mailu con `TLS_FLAVOR=letsencrypt` renueva automáticamente los certificados.

Verificar renovación:
```bash
docker-compose logs front | grep -i "certificate"
```

---

## 🔍 Troubleshooting

### Email no se envía

```bash
# Verificar logs de SMTP
docker-compose logs smtp | tail -100

# Verificar cola de correo
docker-compose exec smtp postqueue -p

# Limpiar cola
docker-compose exec smtp postsuper -d ALL
```

### No se reciben emails

```bash
# Verificar que los puertos estén abiertos
sudo netstat -tulpn | grep -E '25|587|465'

# Verificar DNS
dig MX tu-isp.com
dig mail.tu-isp.com

# Verificar SPF/DKIM/DMARC
dig TXT tu-isp.com
dig TXT default._domainkey.tu-isp.com
```

### Panel de administración no carga

```bash
# Reiniciar servicio admin
docker-compose restart admin

# Verificar logs
docker-compose logs admin
```

---

## 📚 Recursos Adicionales

- [Documentación oficial de Mailu](https://mailu.io)
- [Generador de configuración](https://setup.mailu.io)
- [Foro de la comunidad](https://github.com/Mailu/Mailu/discussions)
- [Validador de correo](https://mxtoolbox.com/)

---

## ✅ Checklist de Verificación

- [ ] Docker y Docker Compose instalados
- [ ] Dominio configurado (mail.tu-isp.com)
- [ ] Puertos abiertos en firewall
- [ ] DNS configurado (A, MX, SPF, DKIM, DMARC)
- [ ] Mailu iniciado correctamente
- [ ] Panel de administración accesible
- [ ] Usuario de envío creado (noreply@tu-isp.com)
- [ ] Plugin de email configurado en Sistema ISP
- [ ] Email de prueba enviado exitosamente
- [ ] Backup configurado
- [ ] Monitoreo configurado

---

**¡Mailu está listo para usarse con el Sistema ISP!** 🎉
