# Guia Rapida: HTTPS + Coturn para Videollamadas

## Problema Resuelto

Las videollamadas WebRTC requieren HTTPS (excepto en localhost). Esta guia resuelve:
1. ❌ "Invalid Host header" con Cloudflare
2. ❌ Videollamadas bloqueadas por navegador (HTTP sin certificado)
3. ❌ Usuarios remotos no pueden conectar (sin servidor TURN)

## Solucion Implementada

### 1. HTTPS via Cloudflare (Ya configurado)

Tu dominio: `https://isp.serviciosqbit.net`

**Pasos completados:**
- ✅ `vue.config.js` actualizado para aceptar el dominio
- ✅ Backend configurado para aceptar Cloudflare CORS
- ✅ Socket.io configurado para Cloudflare

**Reiniciar servicios:**

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run serve
```

Ahora puedes acceder via: `https://isp.serviciosqbit.net`

### 2. Servidor TURN (Coturn) - Para Usuarios Remotos

El servidor TURN permite videollamadas cuando:
- Usuarios estan detras de NAT/Firewall
- Peer-to-peer directo falla
- Usuario esta trabajando desde casa (remoto)

## Instalacion de Coturn

### En Windows (actual)

```powershell
# Ejecutar PowerShell como Administrador
cd C:\ruta\a\ISP-Prueba

# Ejecutar script de instalacion
.\install-coturn.ps1

# Iniciar Coturn
docker-compose -f docker-compose.coturn.yml up -d

# Ver logs
docker-compose -f docker-compose.coturn.yml logs -f
```

### En Ubuntu (produccion)

```bash
# Ejecutar como root
sudo su

cd /home/user/ISP-Prueba

# Ejecutar script de instalacion
bash install-coturn.sh

# Ver logs
docker-compose -f docker-compose.coturn.yml logs -f
```

## Configuracion de Cloudflare DNS

Para que Coturn funcione desde internet:

1. **Ir a Cloudflare Dashboard:**
   - https://dash.cloudflare.com
   - Selecciona tu dominio: `serviciosqbit.net`

2. **Agregar registro DNS tipo A:**
   ```
   Tipo: A
   Nombre: turn
   Contenido: TU_IP_PUBLICA_DEL_SERVIDOR
   Proxy: OFF (nube gris, NO naranja)
   TTL: Auto
   ```

3. **Verificar:**
   - `turn.isp.serviciosqbit.net` debe resolver a tu IP publica
   - Puertos abiertos: 3478/UDP, 5349/TCP, 49152-65535/UDP

## Configuracion del Router (Si estas detras de NAT)

Si tu servidor esta detras de un router, abre estos puertos:

```
Puerto 3478 (UDP) → IP_SERVIDOR_LOCAL:3478
Puerto 5349 (TCP) → IP_SERVIDOR_LOCAL:5349
Puertos 49152-65535 (UDP) → IP_SERVIDOR_LOCAL:49152-65535
```

**Ejemplo para router comun:**
1. Accede a `192.168.1.1` (o IP de tu router)
2. Port Forwarding / Virtual Server
3. Agrega las reglas de arriba

## Verificar que Todo Funciona

### 1. Verificar Frontend

```bash
# Abrir navegador en:
https://isp.serviciosqbit.net

# Debe cargar sin errores
# Consola (F12) no debe mostrar "Invalid Host header"
```

### 2. Verificar Backend

```bash
# Probar endpoint de API
curl https://isp.serviciosqbit.net/api/test

# Debe responder
```

### 3. Verificar Coturn

**Online (Herramienta web):**
1. Ve a: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Click "Add Server"
3. Configurar:
   ```
   TURN URI: turn:turn.isp.serviciosqbit.net:3478
   Username: ispuser
   Password: SecurePassword2024!
   ```
4. Click "Gather candidates"
5. Busca candidatos tipo "relay" - si aparecen, TURN funciona ✅

**Via terminal (Linux):**
```bash
# Instalar herramienta
npm install -g turn-tester

# Probar TURN
turn-tester turn.isp.serviciosqbit.net 3478 ispuser SecurePassword2024!

# Debe mostrar: "TURN server is working"
```

### 4. Probar Videollamada

1. Abre dos navegadores (o dispositivos diferentes)
2. Inicia sesion en ambos
3. Desde uno, llama al otro
4. Abre consola (F12) en ambos
5. Busca logs: `ICE Candidate type: relay`
   - Si dice `relay` → Esta usando TURN ✅
   - Si dice `host` → Conexion LAN directa ✅
   - Si dice `srflx` → Peer-to-peer via internet ✅

## Flujo de Conexion

```
Escenario 1: Misma Red (Oficina)
Usuario A (LAN) ←──────────→ Usuario B (LAN)
                Directo
Tipo: host
Latencia: <10ms

Escenario 2: Remoto (Casa - Oficina)
Usuario A (Casa) ←──→ TURN Server ←──→ Usuario B (Oficina)
                   Relay via Coturn
Tipo: relay
Latencia: 50-200ms

Escenario 3: Internet Directo (Ambos con IP publica)
Usuario A ←────────STUN─────────→ Usuario B
          Peer-to-peer via STUN
Tipo: srflx
Latencia: 20-100ms
```

## Troubleshooting

### Error: "Invalid Host header"
- ✅ Solucionado - Reinicia `npm run serve` en frontend

### Error: Videollamadas no funcionan con HTTP
- ✅ Usa `https://isp.serviciosqbit.net` en vez de `http://IP`

### Error: TURN server no conecta
```bash
# Verificar que Coturn este corriendo
docker ps | grep coturn

# Ver logs de Coturn
docker-compose -f docker-compose.coturn.yml logs -f

# Verificar puertos abiertos
netstat -tuln | grep 3478
```

### Error: No aparecen candidatos "relay"
1. Verifica DNS de `turn.isp.serviciosqbit.net`
2. Verifica puertos abiertos en router
3. Verifica credenciales en `VideoCallWindow.vue` y `turnserver.conf`

### Coturn usa mucho ancho de banda
- Edita `coturn/turnserver.conf`:
  ```
  max-bps=1000000
  total-quota=100
  ```

## Comandos Utiles

```bash
# Ver logs de Coturn en tiempo real
docker-compose -f docker-compose.coturn.yml logs -f coturn

# Reiniciar Coturn
docker-compose -f docker-compose.coturn.yml restart

# Detener Coturn
docker-compose -f docker-compose.coturn.yml down

# Ver estadisticas de Docker
docker stats isp-coturn

# Ver usuarios conectados a TURN
docker exec -it isp-coturn ps aux
```

## Seguridad en Produccion

**ANTES DE DESPLEGAR:**

1. **Cambiar credenciales de TURN:**
   - Edita `coturn/turnserver.conf`:
     ```
     user=NUEVO_USUARIO:NUEVA_PASSWORD_FUERTE
     ```
   - Edita `frontend/src/components/VideoCallWindow.vue`:
     ```javascript
     username: 'NUEVO_USUARIO',
     credential: 'NUEVA_PASSWORD_FUERTE'
     ```

2. **Configurar IP publica:**
   - Edita `coturn/turnserver.conf`:
     ```
     external-ip=TU_IP_PUBLICA_ESTATICA
     ```

3. **Limitar ancho de banda:**
   - Edita `coturn/turnserver.conf`:
     ```
     max-bps=1000000
     total-quota=100
     ```

## Costos

- Cloudflare: $0 (plan Free)
- Coturn: $0 (self-hosted)
- Certificado SSL: $0 (Let's Encrypt via Cloudflare)
- Ancho de banda: $0 (ya tienes como ISP)

**Total: $0/mes** 🎉

## Soporte

- Documentacion Coturn: https://github.com/coturn/coturn
- Test TURN: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- Cloudflare DNS: https://dash.cloudflare.com
