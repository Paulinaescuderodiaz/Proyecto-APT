# Imagen base: Node 20 sobre Debian liviano
FROM node:20-bookworm-slim

# Prisma necesita openssl para conectarse a PostgreSQL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Primero solo las dependencias, para que Docker las guarde en caché
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Después el resto del código y el cliente de Prisma
COPY . .
RUN npx prisma generate

EXPOSE 3000
CMD ["node", "index.js"]