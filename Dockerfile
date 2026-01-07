# Usar Node.js 22.12 (LTS) que cumple con los requisitos de Prisma 7.2.0
FROM node:22.12-alpine

# Instalar dependencias del sistema necesarias para Prisma
RUN apk add --no-cache openssl libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Instalar dependencias
RUN npm install

# Generar Prisma Client
RUN npx prisma generate

# Copiar el resto del código
COPY . .

# Compilar TypeScript
RUN npm run build

# Exponer el puerto (Railway asignará uno automáticamente)
# Railway usa la variable PORT, no necesitamos especificar un puerto fijo
EXPOSE $PORT

# Comando de inicio
CMD ["npm", "start"]

