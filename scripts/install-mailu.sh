#!/bin/bash

##############################################################################
# Script de Instalación Automatizada de Mailu para Sistema ISP
# Autor: Sistema ISP
# Versión: 1.0.0
##############################################################################

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
   print_error "Este script debe ejecutarse como root (sudo)"
   exit 1
fi

print_header "Instalación de Mailu para Sistema ISP"

# Variables de configuración
MAILU_DIR="/opt/mailu"
BACKUP_DIR="/backup/mailu"
DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
PUBLIC_IP=""

# Función para solicitar input
ask_input() {
    local prompt="$1"
    local default="$2"
    local result

    if [ -n "$default" ]; then
        read -p "$(echo -e ${BLUE}${prompt}${NC} [${default}]: )" result
        result="${result:-$default}"
    else
        read -p "$(echo -e ${BLUE}${prompt}${NC}: )" result
    fi

    echo "$result"
}

# Función para solicitar password
ask_password() {
    local prompt="$1"
    local result

    read -s -p "$(echo -e ${BLUE}${prompt}${NC}: )" result
    echo
    echo "$result"
}

# Verificar requisitos previos
print_header "Verificando Requisitos Previos"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    print_info "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
    print_success "Docker instalado"
else
    print_success "Docker ya está instalado"
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado"
    print_info "Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose instalado"
else
    print_success "Docker Compose ya está instalado"
fi

# Solicitar información de configuración
print_header "Configuración de Mailu"

DOMAIN=$(ask_input "Dominio principal (ej: tu-isp.com)" "")
while [ -z "$DOMAIN" ]; do
    print_error "El dominio es requerido"
    DOMAIN=$(ask_input "Dominio principal (ej: tu-isp.com)" "")
done

HOSTNAME=$(ask_input "Hostname del servidor de correo (ej: mail.tu-isp.com)" "mail.$DOMAIN")
ADMIN_EMAIL=$(ask_input "Email del administrador" "admin@$DOMAIN")
ADMIN_PASSWORD=$(ask_password "Contraseña del administrador (mínimo 8 caracteres)")

# Obtener IP pública
if command -v dig &> /dev/null; then
    PUBLIC_IP=$(dig +short myip.opendns.com @resolver1.opendns.com)
else
    PUBLIC_IP=$(curl -s ifconfig.me)
fi

print_info "IP pública detectada: $PUBLIC_IP"
PUBLIC_IP=$(ask_input "IP pública del servidor" "$PUBLIC_IP")

# Generar secretos
print_info "Generando claves secretas..."
SECRET_KEY=$(openssl rand -hex 16)
DB_PASSWORD=$(openssl rand -base64 24)

# Crear directorios
print_header "Creando Estructura de Directorios"

mkdir -p $MAILU_DIR/{data/{redis,mail,filter,webmail,mailqueue},dkim,certs,overrides/{nginx,postfix,dovecot,rspamd}}
mkdir -p $BACKUP_DIR

print_success "Directorios creados"

# Crear archivo de variables de entorno
print_header "Generando Configuración"

cat > $MAILU_DIR/mailu.env <<EOF
###################################
# CONFIGURACIÓN GENERAL
###################################

MAILU_VERSION=2.0
ROOT=$MAILU_DIR
DOMAIN=$DOMAIN
HOSTNAMES=$HOSTNAME
SUBNET=192.168.203.0/24

###################################
# CERTIFICADOS SSL
###################################

TLS_FLAVOR=letsencrypt
INITIAL_ADMIN_ACCOUNT=${ADMIN_EMAIL%%@*}
INITIAL_ADMIN_DOMAIN=${ADMIN_EMAIL##*@}
INITIAL_ADMIN_PW=$ADMIN_PASSWORD

###################################
# AUTENTICACIÓN Y SEGURIDAD
###################################

SECRET_KEY=$SECRET_KEY
DB_PW=$DB_PASSWORD

###################################
# LÍMITES Y CUOTAS
###################################

DEFAULT_QUOTA=10
MESSAGE_SIZE_LIMIT=50
MESSAGE_RATELIMIT=200/day

###################################
# FUNCIONES
###################################

WEBMAIL=rainloop
ANTISPAM=rspamd
LOG_DRIVER=json-file

###################################
# RED
###################################

BIND_ADDRESS4=$PUBLIC_IP
SUBNET=192.168.203.0/24

###################################
# ADVANCED
###################################

TZ=America/Mexico_City
SITENAME=Sistema ISP - $DOMAIN
WEBSITE=https://$DOMAIN
DISABLE_STATISTICS=True
EOF

print_success "Configuración generada: $MAILU_DIR/mailu.env"

# Crear docker-compose.yml
cat > $MAILU_DIR/docker-compose.yml <<'EOF'
version: '3.7'

services:
  redis:
    image: redis:alpine
    restart: always
    volumes:
      - "./data/redis:/data"
    networks:
      - default

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
      - "25:25"
      - "465:465"
      - "587:587"
      - "110:110"
      - "995:995"
      - "143:143"
      - "993:993"
    networks:
      - default
    volumes:
      - "./certs:/certs"
      - "./overrides/nginx:/overrides:ro"
    depends_on:
      - resolver
    dns:
      - 192.168.203.254

  resolver:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}unbound:${MAILU_VERSION:-2.0}
    env_file: mailu.env
    restart: always
    networks:
      default:
        ipv4_address: 192.168.203.254

  imap:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}dovecot:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    volumes:
      - "./data/mail:/mail"
      - "./overrides/dovecot:/overrides:ro"
    depends_on:
      - front
    networks:
      - default

  smtp:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}postfix:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    volumes:
      - "./data/mailqueue:/queue"
      - "./overrides/postfix:/overrides:ro"
    depends_on:
      - front
    networks:
      - default

  antispam:
    image: ${DOCKER_ORG:-ghcr.io/mailu}/${DOCKER_PREFIX:-}rspamd:${MAILU_VERSION:-2.0}
    restart: always
    env_file: mailu.env
    volumes:
      - "./data/filter:/var/lib/rspamd"
      - "./overrides/rspamd:/overrides:ro"
    depends_on:
      - front
      - redis
    networks:
      - default

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

networks:
  default:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 192.168.203.0/24
EOF

print_success "Docker Compose generado: $MAILU_DIR/docker-compose.yml"

# Configurar firewall
print_header "Configurando Firewall"

if command -v ufw &> /dev/null; then
    print_info "Configurando UFW..."
    ufw allow 25/tcp comment 'SMTP'
    ufw allow 587/tcp comment 'Submission'
    ufw allow 465/tcp comment 'SMTPS'
    ufw allow 143/tcp comment 'IMAP'
    ufw allow 993/tcp comment 'IMAPS'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    print_success "Firewall configurado"
else
    print_warning "UFW no está instalado. Configura manualmente el firewall."
fi

# Asignar permisos
print_info "Configurando permisos..."
chown -R root:root $MAILU_DIR
chmod -R 755 $MAILU_DIR/data

# Iniciar Mailu
print_header "Iniciando Mailu"

cd $MAILU_DIR

print_info "Descargando imágenes de Docker (puede tomar varios minutos)..."
docker-compose pull

print_info "Iniciando servicios..."
docker-compose up -d

# Esperar a que los servicios estén listos
print_info "Esperando a que los servicios estén listos (60 segundos)..."
sleep 60

# Verificar estado
print_header "Verificando Estado de Servicios"

docker-compose ps

# Crear script de backup
print_header "Creando Script de Backup"

cat > $MAILU_DIR/backup.sh <<'BACKUP_EOF'
#!/bin/bash

BACKUP_DIR="/backup/mailu"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

cd /opt/mailu
tar -czf $BACKUP_DIR/mailu_data_$DATE.tar.gz data/
tar -czf $BACKUP_DIR/mailu_dkim_$DATE.tar.gz dkim/
tar -czf $BACKUP_DIR/mailu_config_$DATE.tar.gz mailu.env docker-compose.yml

# Eliminar backups antiguos (más de 30 días)
find $BACKUP_DIR -name "mailu_*.tar.gz" -mtime +30 -delete

echo "Backup completado: $BACKUP_DIR"
BACKUP_EOF

chmod +x $MAILU_DIR/backup.sh
print_success "Script de backup creado: $MAILU_DIR/backup.sh"

# Configurar cron para backup diario
print_info "Configurando backup automático diario..."
(crontab -l 2>/dev/null; echo "0 2 * * * $MAILU_DIR/backup.sh") | crontab -
print_success "Backup automático configurado (2:00 AM diario)"

# Mostrar información de acceso
print_header "✅ Instalación Completada"

print_success "Mailu ha sido instalado exitosamente!"
echo ""
print_info "Detalles de acceso:"
echo -e "  ${GREEN}Panel de administración:${NC} https://$HOSTNAME/admin"
echo -e "  ${GREEN}Webmail:${NC} https://$HOSTNAME"
echo -e "  ${GREEN}Usuario:${NC} $ADMIN_EMAIL"
echo -e "  ${GREEN}Contraseña:${NC} $ADMIN_PASSWORD"
echo ""

print_warning "IMPORTANTE: Configurar DNS antes de usar Mailu"
echo ""
echo "Registros DNS requeridos:"
echo ""
echo "  A       $HOSTNAME          $PUBLIC_IP"
echo "  MX      $DOMAIN            10 $HOSTNAME"
echo "  TXT     $DOMAIN            \"v=spf1 mx ~all\""
echo "  TXT     _dmarc.$DOMAIN     \"v=DMARC1; p=quarantine; rua=mailto:postmaster@$DOMAIN\""
echo ""
print_info "El registro DKIM lo puedes obtener desde el panel de administración"
echo ""

print_info "Para integrar con Sistema ISP:"
echo "  1. Accede al panel de administración"
echo "  2. Crea un usuario: noreply@$DOMAIN"
echo "  3. Configura el plugin de email en Sistema ISP con:"
echo "     - Host: $HOSTNAME"
echo "     - Port: 587"
echo "     - User: noreply@$DOMAIN"
echo "     - Pass: (contraseña del usuario)"
echo ""

print_success "Ver logs: cd $MAILU_DIR && docker-compose logs -f"
print_success "Reiniciar: cd $MAILU_DIR && docker-compose restart"
print_success "Detener: cd $MAILU_DIR && docker-compose down"
print_success "Backup: $MAILU_DIR/backup.sh"

print_header "🎉 ¡Listo para usar Mailu!"
