FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (saltando descarga de Chrome para Puppeteer)
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "dev"]
