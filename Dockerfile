# Use Node.js LTS (Alpine para imagem menor)
FROM node:18-alpine

# Fonts (inclui emoji) para renderização consistente de PDFs
RUN apk add --no-cache \
  fontconfig \
  ttf-dejavu \
  noto-fonts \
  noto-fonts-emoji

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretório de logs
RUN mkdir -p logs

# Expor porta da aplicação
EXPOSE 4882

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=4882

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4882/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar a aplicação
CMD ["node", "src/server.js"]
