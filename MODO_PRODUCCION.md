# Modo Produccion - Build Estatico

La forma mas simple: Backend sirve el frontend buildeado.

```
https://isp.serviciosqbit.net
         ↓
    Node.js :3000
         ↓
    ├─→ /api → Backend
    └─→ / → Frontend (build estatico)
```

## Paso 1: Build del Frontend

```bash
cd frontend

# Configurar variable de entorno para produccion
# Crear archivo .env.production
echo "VUE_APP_API_URL=/api" > .env.production

# Hacer build
npm run build

# Esto crea la carpeta: frontend/dist
```

## Paso 2: Configurar Backend para servir Frontend

Edita `backend/index.js` al final del archivo (antes de `server.listen`):

```javascript
// ==================== PRODUCCION - Servir Frontend ====================

if (process.env.NODE_ENV === 'production') {
  // Servir archivos estaticos del build de Vue
  const frontendPath = path.join(__dirname, '../frontend/dist');

  app.use(express.static(frontendPath));

  // Todas las rutas no-API redirigen al index.html (SPA routing)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// ==================== Fin PRODUCCION ====================
```

## Paso 3: Iniciar en modo produccion

### Windows:

```powershell
cd backend

# Configurar modo produccion
$env:NODE_ENV="production"

# Iniciar servidor
npm start
```

### Ubuntu:

```bash
cd backend

# Configurar modo produccion
export NODE_ENV=production

# Iniciar servidor
npm start

# O con PM2 (recomendado):
npm install -g pm2
pm2 start index.js --name isp-backend
pm2 save
pm2 startup
```

## Paso 4: Configurar Cloudflare

```
Tipo: A
Nombre: @
Contenido: TU_IP_PUBLICA
Proxy: ON (naranja)
```

**Port Forwarding en router:**
```
Puerto 80 → TU_IP:3000
Puerto 443 → TU_IP:3000
```

## Paso 5: Acceder

```
https://isp.serviciosqbit.net
```

Todo funciona en un solo puerto (3000), sin Nginx.

## Ventajas

- ✅ Simple (un solo servidor)
- ✅ No requiere Nginx
- ✅ No mas CORS
- ✅ Ideal para produccion

## Desventajas

- ❌ No hay Hot Module Reload (HMR)
- ❌ Cada cambio requiere rebuild
- ❌ Solo para produccion, no desarrollo
