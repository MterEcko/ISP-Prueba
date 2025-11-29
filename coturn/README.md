# Coturn TURN/STUN Server - Instalacion

Este servidor TURN/STUN permite videollamadas WebRTC incluso cuando los usuarios estan detras de NAT/Firewall.

## Instalacion en Windows

### 1. Instalar Docker Desktop para Windows

```powershell
# Descargar de: https://www.docker.com/products/docker-desktop
# O instalar via winget:
winget install Docker.DockerDesktop
```

### 2. Iniciar Coturn

```powershell
# Desde la carpeta raiz del proyecto
cd C:\ruta\a\ISP-Prueba

# Iniciar contenedor
docker-compose -f docker-compose.coturn.yml up -d

# Ver logs
docker-compose -f docker-compose.coturn.yml logs -f
```

### 3. Verificar que funciona

```powershell
# Probar STUN
npm install -g stuntman-client
stuntman localhost 3478
```

### 4. Abrir puertos en firewall de Windows

```powershell
# Abrir PowerShell como administrador
New-NetFirewallRule -DisplayName "Coturn TURN" -Direction Inbound -LocalPort 3478 -Protocol UDP -Action Allow
New-NetFirewallRule -DisplayName "Coturn TURN TLS" -Direction Inbound -LocalPort 5349 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Coturn Relay Ports" -Direction Inbound -LocalPort 49152-65535 -Protocol UDP -Action Allow
```

## Instalacion en Ubuntu/Linux

### 1. Instalar Docker

```bash
# Actualizar paquetes
sudo apt update

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Iniciar Coturn

```bash
# Desde la carpeta raiz del proyecto
cd /home/user/ISP-Prueba

# Iniciar contenedor
docker-compose -f docker-compose.coturn.yml up -d

# Ver logs
docker-compose -f docker-compose.coturn.yml logs -f
```

### 3. Abrir puertos en firewall (UFW)

```bash
sudo ufw allow 3478/udp comment "Coturn TURN"
sudo ufw allow 5349/tcp comment "Coturn TLS"
sudo ufw allow 49152:65535/udp comment "Coturn Relay"
sudo ufw reload
```

## Configuracion en Cloudflare

### Opcion 1: Puerto directo (Recomendado)

1. Ve a tu panel de Cloudflare
2. DNS → Agrega registro A:
   ```
   Tipo: A
   Nombre: turn
   Contenido: TU_IP_PUBLICA
   Proxy: OFF (nube gris, no naranja)
   ```

3. Ahora tu TURN server estara en: `turn.isp.serviciosqbit.net`

### Opcion 2: Cloudflare Tunnel (Mas complejo)

Si no puedes abrir puertos, usa Cloudflare Tunnel:

```bash
# Instalar cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Autenticar
cloudflared tunnel login

# Crear tunnel
cloudflared tunnel create isp-turn

# Configurar tunnel
nano ~/.cloudflared/config.yml
```

Contenido de `config.yml`:
```yaml
tunnel: TU_TUNNEL_ID
credentials-file: /home/user/.cloudflared/TU_TUNNEL_ID.json

ingress:
  - hostname: turn.isp.serviciosqbit.net
    service: udp://localhost:3478
  - service: http_status:404
```

## Configurar en el Frontend

Edita `frontend/src/components/VideoCallWindow.vue`:

```javascript
createPeerConnection() {
  const configuration = {
    iceServers: [
      // Google STUN
      { urls: 'stun:stun.l.google.com:19302' },

      // Tu servidor TURN
      {
        urls: 'turn:turn.isp.serviciosqbit.net:3478',
        username: 'ispuser',
        credential: 'SecurePassword2024!'
      },
      {
        urls: 'turns:turn.isp.serviciosqbit.net:5349',
        username: 'ispuser',
        credential: 'SecurePassword2024!'
      }
    ]
  };

  this.peerConnection = new RTCPeerConnection(configuration);
  // ... resto del codigo
}
```

## Probar la conexion TURN

### Herramienta online:
1. Ve a: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Agrega tu servidor:
   ```
   TURN URL: turn:turn.isp.serviciosqbit.net:3478
   Username: ispuser
   Password: SecurePassword2024!
   ```
3. Click "Add Server"
4. Click "Gather candidates"
5. Debes ver candidatos tipo "relay" si funciona

### Via terminal (Linux/Mac):

```bash
# Instalar herramienta
npm install -g turn-tester

# Probar
turn-tester turn.isp.serviciosqbit.net 3478 ispuser SecurePassword2024!
```

## Comandos Utiles

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.coturn.yml logs -f coturn

# Reiniciar servidor
docker-compose -f docker-compose.coturn.yml restart coturn

# Detener servidor
docker-compose -f docker-compose.coturn.yml down

# Ver estadisticas
docker stats isp-coturn

# Ver usuarios conectados
docker exec -it isp-coturn turnutils_uclient -v
```

## Seguridad en Produccion

**IMPORTANTE:** Antes de desplegar en produccion:

1. **Cambia las credenciales** en `coturn/turnserver.conf`:
   ```
   user=NUEVO_USUARIO:NUEVA_PASSWORD_SEGURA
   ```

2. **Configura IP publica** si tienes IP estatica:
   ```
   external-ip=TU_IP_PUBLICA
   ```

3. **Habilita TLS** (agrega certificados SSL):
   ```
   cert=/etc/coturn/cert.pem
   pkey=/etc/coturn/key.pem
   ```

4. **Limita ancho de banda** (opcional):
   ```
   max-bps=1000000
   total-quota=100
   ```

## Troubleshooting

### Error: "Permission denied"
```bash
sudo chown -R 1000:1000 coturn/logs
```

### Error: "Port already in use"
```bash
# Ver que proceso usa el puerto
sudo netstat -tulpn | grep 3478

# Matar proceso
sudo kill -9 PID
```

### Coturn no inicia en Windows
- Verifica que Docker Desktop este corriendo
- Verifica que Hyper-V este habilitado
- Reinicia Docker Desktop

### No se conectan usuarios remotos
- Verifica que los puertos esten abiertos en tu router
- Verifica configuracion de firewall
- Verifica que la IP publica sea correcta

## Recursos

- Documentacion Coturn: https://github.com/coturn/coturn
- WebRTC TURN: https://webrtc.org/getting-started/turn-server
- Test ICE: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
