# 🚀 Backend API - Onze Motores

API Node.js para processar pagamentos com Stripe e gerenciar assinaturas.

---

## 📋 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/           # Configurações (Firebase, Stripe, etc.)
│   ├── controllers/      # Controllers das rotas
│   ├── middleware/       # Middlewares (error handler, logger, etc.)
│   ├── routes/           # Definição de rotas
│   ├── services/         # Lógica de negócio
│   ├── validators/       # Validação de dados
│   ├── constants/        # Constantes (Price IDs, etc.)
│   └── server.js         # Servidor principal
├── .env                  # Variáveis de ambiente (não versionar)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Como Iniciar

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente

1. Crie o arquivo `.env` com as variáveis de ambiente necessárias.

2. Edite o `.env` e preencha:
   - `STRIPE_SECRET_KEY` - Sua chave secreta do Stripe
   - `STRIPE_WEBHOOK_SECRET` - Secret do webhook (obter depois de configurar)
   - `FIREBASE_PROJECT_ID` - ID do projeto Firebase
   - `FIREBASE_PRIVATE_KEY` - Chave privada do Firebase (Service Account)
   - `FIREBASE_CLIENT_EMAIL` - Email do Service Account

### 3. Obter Credenciais do Firebase

1. Acesse: https://console.firebase.google.com/
2. Vá em **Project Settings > Service Accounts**
3. Clique em **Generate new private key**
4. Baixe o arquivo JSON
5. Copie os valores para o `.env`:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### 4. Iniciar o Servidor

**Desenvolvimento (com auto-reload):**
```bash
npm run dev
```

**Produção:**
```bash
npm start
```

O servidor estará rodando em: `http://localhost:3000`

---

## 🌐 Configuração Remota (Firebase)

IPs públicos, porta e regras de CORS agora ficam no Firestore em
`backend_config/settings`. O backend lê esses valores em tempo de execução
(com cache de 5 minutos) e usa o `.env` apenas como fallback.

- 📄 Documentação completa: `backend/CONFIG_BACKEND_REMOTO.md`
- ✏️ Edite diretamente pelo Firebase Console (Firestore Database)
- 🔁 Para forçar produção/desenvolvimento use o campo `forceEnvironment`

Exemplo resumido:

```json
{
  "environments": {
    "production": {
      "protocol": "http",
      "host": "168.228.245.79",
      "port": 3000,
      "allowedOrigins": ["https://app.suaempresa.com"]
    },
    "development": {
      "protocol": "http",
      "host": "localhost",
      "port": 3000,
      "allowedOrigins": ["http://localhost:19006"]
    }
  }
}
```

> ⚠️ Se o Firebase não estiver configurado, o backend continua funcionando com
> os valores do `.env` (`PORT`, `ALLOWED_ORIGINS`, etc.).

---

## 📡 Endpoints

### Health Check
```
GET /api/health
```

### Criar Checkout Session
```
POST /api/stripe/create-checkout-session
Body: {
  "planType": "monthly" | "annual",
  "userId": "string",
  "successUrl": "string (opcional)",
  "cancelUrl": "string (opcional)"
}
```

### Webhook do Stripe
```
POST /api/stripe/webhook
```

---

## 🔧 Configurar Webhook no Stripe

1. Acesse: https://dashboard.stripe.com/test/webhooks
2. Clique em **Add endpoint**
3. URL: `https://seu-dominio.com/api/stripe/webhook`
4. Eventos para ouvir:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copie o **Signing secret** e adicione no `.env` como `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Testar

### Testar Health Check
```bash
curl http://localhost:3000/api/health
```

### Testar Checkout (exemplo)
```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "monthly",
    "userId": "test-user-123"
  }'
```

---

## 📝 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe | ✅ Sim |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook | ✅ Sim |
| `FIREBASE_PROJECT_ID` | ID do projeto Firebase | ✅ Sim |
| `FIREBASE_PRIVATE_KEY` | Chave privada do Service Account | ✅ Sim |
| `FIREBASE_CLIENT_EMAIL` | Email do Service Account | ✅ Sim |
| `PORT` | Porta do servidor (padrão: 3000) | ❌ Não |
| `NODE_ENV` | Ambiente (development/production) | ❌ Não |
| `ALLOWED_ORIGINS` | Fallback das origens de CORS (se Firebase estiver indisponível) | ❌ Não |

---

## 🔒 Segurança

- ✅ Secret key do Stripe **NUNCA** exposta no cliente
- ✅ Validação de webhooks com assinatura
- ✅ Validação de dados de entrada
- ✅ Tratamento de erros
- ✅ CORS configurado

---

## 📚 Próximos Passos

1. ✅ Configurar variáveis de ambiente
2. ✅ Obter credenciais do Firebase
3. ✅ Configurar webhook no Stripe
4. ✅ Testar endpoints
5. ✅ Conectar com o app mobile

---

**Desenvolvido para Onze Motores** 🚀

