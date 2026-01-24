#!/bin/bash

# Script para testar o Docker localmente antes do deploy no EasyPanel

echo "🐳 Testando build do Docker..."

# Build da imagem
echo "📦 Construindo imagem Docker..."
docker build -t onze-motores-backend:test .

if [ $? -ne 0 ]; then
    echo "❌ Erro ao construir imagem Docker"
    exit 1
fi

echo "✅ Imagem construída com sucesso!"
echo ""
echo "🚀 Para executar o container localmente, use:"
echo ""
echo "docker run -p 4882:4882 \\"
echo "  -e NODE_ENV=production \\"
echo "  -e PORT=4882 \\"
echo "  -e STRIPE_SECRET_KEY=sua_chave_aqui \\"
echo "  -e STRIPE_WEBHOOK_SECRET=seu_webhook_secret_aqui \\"
echo "  -e MONGODB_URI=sua_string_mongodb_aqui \\" 
echo "  -e JWT_SECRET=seu_jwt_secret_aqui \\"
echo "  onze-motores-backend:test"
echo ""
echo "📝 Ou use um arquivo .env com as variáveis e rode:"
echo "docker run -p 4882:4882 --env-file .env onze-motores-backend:test"
