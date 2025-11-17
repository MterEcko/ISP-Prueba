# 📧 Configuración del Servidor de Correo Corporativo

## Resumen

Este sistema te permite **OFRECER correo electrónico personalizado** a tus clientes ISP como un servicio adicional, similar a Google Workspace pero usando **software de código abierto**.

### ¿Qué obtienes?

- ✅ Correos personalizados para tus clientes: `juan@empresa-cliente.com`
- ✅ Webmail moderno (Roundcube) accesible desde navegador
- ✅ SMTP, IMAP, POP3 configurados automáticamente
- ✅ Panel de administración completo
- ✅ Antispam y filtros de correo
- ✅ Gestión desde tu sistema ISP
- ✅ 100% open source y gratis

---

## Opción 1: Mailu (RECOMENDADO) ⭐

**Mailu** es la solución más completa y fácil de instalar para ofrecer correo como servicio.

### Características:

- Webmail (Roundcube) integrado
- Panel de administración web
- Soporte para múltiples dominios
- Antispam (Rspamd)
- Autenticación segura
- API REST para integración
- Docker-based (fácil de desplegar)

### Instalación:

#### Paso 1: Clonar configuración

```bash
cd /home/user/ISP-Prueba
git clone https://github.com/Mailu/Mailu.git mail-server
cd mail-server
```

#### Paso 2: Configuración del asistente

Ejecuta el asistente de configuración:

```bash
# Ir a: https://setup.mailu.io/
# O usar la herramienta de setup local

./setup.sh
```

**Configuración recomendada:**
- **Main mail domain**: El dominio principal (ej: `serviciosqbit.net`)
- **Hostnames**: `mail.serviciosqbit.net`
- **IPv6**: Deshabilitado si no tienes
- **Webmail**: Roundcube
- **Antivirus**: Deshabilitado (opcional, consume recursos)
- **Webdav**: Habilitado (calendario y contactos)
- **Admin**: Crear cuenta admin

#### Paso 3: Levantar servicios

```bash
docker-compose up -d
```

#### Paso 4: Crear primer admin

```bash
docker-compose exec admin flask mailu admin \
  admin serviciosqbit.net TuPasswordSegura123!
```

#### Paso 5: Acceder al panel

- **Panel Admin**: `https://mail.serviciosqbit.net/admin`
- **Webmail**: `https://mail.serviciosqbit.net/webmail`

---

## Configuración DNS

Para que funcione correctamente, debes configurar estos registros DNS:

### Registros A

```
mail.serviciosqbit.net.     A    TU_IP_SERVIDOR
```

### Registros MX (correo entrante)

```
serviciosqbit.net.          MX   10 mail.serviciosqbit.net.
```

### Registro SPF (anti-spam)

```
serviciosqbit.net.          TXT  "v=spf1 mx ~all"
```

### Registro DKIM (firmas)

Después de instalar Mailu, obtén la clave DKIM:

```bash
cat mail-server/dkim/serviciosqbit.net.txt
```

Copia el contenido y créalo como registro TXT.

### Registro DMARC

```
_dmarc.serviciosqbit.net.   TXT  "v=DMARC1; p=quarantine; rua=mailto:postmaster@serviciosqbit.net"
```

---

## Integración con el Sistema ISP

### API de Mailu

Mailu tiene una API REST que puedes usar desde tu sistema ISP:

```bash
# Crear usuario
curl -X POST https://mail.serviciosqbit.net/api/v1/user/juan.perez \
  -H "Authorization: Bearer TU_TOKEN_API" \
  -d '{
    "email": "juan.perez@serviciosqbit.net",
    "raw_password": "password123",
    "comment": "Empleado Juan Pérez"
  }'

# Listar usuarios
curl https://mail.serviciosqbit.net/api/v1/user \
  -H "Authorization: Bearer TU_TOKEN_API"

# Eliminar usuario
curl -X DELETE https://mail.serviciosqbit.net/api/v1/user/juan.perez@serviciosqbit.net \
  -H "Authorization: Bearer TU_TOKEN_API"
```

### Generar Token API

```bash
docker-compose exec admin flask mailu api-token --name "ISP-System"
```

---

## Opción 2: Mail-in-a-Box (Alternativa Simple)

Si prefieres algo más automático, **Mail-in-a-Box** configura todo con un solo comando.

### Instalación:

```bash
# En un servidor Ubuntu 22.04 limpio
curl -s https://mailinabox.email/setup.sh | sudo bash
```

Sigue el asistente interactivo. Configurará automáticamente:
- Postfix (SMTP)
- Dovecot (IMAP/POP3)
- Roundcube (Webmail)
- Spam filtering
- DNS
- Certificados SSL (Let's Encrypt)

**Ventaja**: Configuración de 5 minutos.
**Desventaja**: Menos flexible que Mailu.

---

## Opción 3: Cliente instala en su servidor

Si un cliente quiere su propio servidor de correo, puedes ofrecerle un script de instalación automatizado:

### Script de instalación para cliente

```bash
#!/bin/bash
# install-mailserver.sh
# Script para instalar servidor de correo en servidor del cliente

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Uso: ./install-mailserver.sh empresa-cliente.com"
  exit 1
fi

echo "Instalando servidor de correo para: $DOMAIN"

# Instalar Docker si no está
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

# Clonar Mailu
git clone https://github.com/Mailu/Mailu.git /opt/mailserver
cd /opt/mailserver

# Generar configuración
cat > .env << EOF
DOMAIN=$DOMAIN
HOSTNAMES=mail.$DOMAIN
SECRET_KEY=$(openssl rand -hex 16)
SUBNET=192.168.203.0/24
TZ=America/Mexico_City
WEBMAIL=roundcube
WEBROOT_REDIRECT=/webmail
DISABLE_IPV6=true
EOF

# Levantar servicios
docker-compose up -d

echo "✅ Servidor de correo instalado"
echo "Accede a: https://mail.$DOMAIN/admin"
```

---

## Ofrecer Correo como Servicio a Clientes ISP

### Modelo de Negocio

Puedes ofrecer correo electrónico como un servicio adicional:

```
Internet Básico       $500/mes
Internet + 5 correos  $600/mes
Internet + 10 correos $700/mes
```

### Configuración Multi-Dominio

Mailu soporta múltiples dominios en un solo servidor:

1. Cliente A: `@empresa-a.com`
2. Cliente B: `@empresa-b.com`
3. Cliente C: `@empresa-c.com`

Todos en el mismo servidor, cada uno con su propio dominio.

### Gestión desde el Sistema ISP

Tu sistema ISP puede:
- ✅ Crear dominios automáticamente al dar de alta un cliente
- ✅ Crear cuentas de correo para empleados del cliente
- ✅ Gestionar cuotas de almacenamiento
- ✅ Ver estadísticas de uso
- ✅ Facturar por el servicio

---

## Requisitos del Servidor

### Mínimo (hasta 50 usuarios)

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disco**: 50 GB SSD
- **Ancho de banda**: Ilimitado (o al menos 100 Mbps)

### Recomendado (hasta 500 usuarios)

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disco**: 250 GB SSD
- **Ancho de banda**: Ilimitado

---

## Puertos Necesarios

Abre estos puertos en el firewall:

```bash
sudo ufw allow 25/tcp    # SMTP
sudo ufw allow 465/tcp   # SMTP SSL
sudo ufw allow 587/tcp   # SMTP Submission
sudo ufw allow 993/tcp   # IMAP SSL
sudo ufw allow 995/tcp   # POP3 SSL
sudo ufw allow 80/tcp    # HTTP (certbot)
sudo ufw allow 443/tcp   # HTTPS
```

---

## Monitoreo y Mantenimiento

### Ver logs

```bash
docker-compose logs -f
```

### Backup

```bash
# Backup completo
tar -czf mailserver-backup-$(date +%Y%m%d).tar.gz \
  /opt/mailserver/data \
  /opt/mailserver/dkim \
  /opt/mailserver/certs
```

### Actualizar

```bash
cd /opt/mailserver
docker-compose pull
docker-compose up -d
```

---

## Troubleshooting

### Correos no llegan

1. Verificar DNS (MX, SPF, DKIM)
2. Verificar que el puerto 25 esté abierto
3. Revisar logs: `docker-compose logs smtp`
4. Probar desde https://mxtoolbox.com/

### Webmail no carga

1. Verificar certificado SSL
2. Verificar que Nginx está corriendo: `docker-compose ps`
3. Revisar logs: `docker-compose logs front`

### Correos marcados como spam

1. Configurar SPF, DKIM y DMARC correctamente
2. Conseguir que tu IP salga de listas negras
3. Usar servicio como SendGrid como relay para correos masivos

---

## Conclusión

Con **Mailu** tendrás un servicio de correo profesional, 100% open source, que puedes ofrecer a tus clientes ISP como valor agregado.

**Costo**: $0 (solo el servidor)
**Tiempo de setup**: 1 hora
**Capacidad**: Ilimitados dominios y usuarios
**Webmail**: Sí (Roundcube)
**API**: Sí (REST API completa)

