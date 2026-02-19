# Use Node.js LTS version
FROM node:18-alpine

# Criar diretório da aplicação
WORKDIR /usr/src/app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Expor porta da API
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "src/index.js"]
