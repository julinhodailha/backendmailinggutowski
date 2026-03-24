# Gutowski · Mailing System v2

Sistema interno de gestão e higienização de mailing para SC, PR e SP.

---

## 🚀 Deploy no Railway

### 1. Suba o projeto

```bash
# Faça login no Railway CLI (opcional)
railway login

# Crie um novo projeto e conecte ao repositório
# OU arraste a pasta para railway.app
```

### 2. Configure as variáveis de ambiente

No Railway → seu projeto → **Settings > Variables**, adicione:

| Variável      | Descrição                             | Obrigatório |
|---------------|---------------------------------------|-------------|
| `JWT_SECRET`  | String aleatória longa (≥64 chars)    | ✅ sim       |
| `ADMIN_EMAIL` | E-mail do usuário admin               | ✅ sim       |
| `ADMIN_HASH`  | Hash bcrypt da senha (ver abaixo)     | ✅ sim       |
| `NODE_ENV`    | `production`                          | recomendado |

#### Como gerar o hash da senha

```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('SUA_SENHA_AQUI', 10))"
```

Cole o resultado em `ADMIN_HASH`.

#### Como gerar o JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Deploy

O Railway detecta automaticamente que é Node.js e executa `npm start`.

A porta é configurada automaticamente via `process.env.PORT`.

---

## 💻 Rodando localmente

```bash
# Instale dependências
npm install

# Copie e configure o .env
cp .env.example .env
# Edite .env com suas credenciais

# Inicie em desenvolvimento
npm run dev

# Ou em produção
npm start
```

Acesse: http://localhost:3000

---

## 🔐 Segurança

- Autenticação via **JWT HttpOnly Cookie** (8h de validade)
- **Rate limiting** no endpoint de login (10 tentativas / 15 min / IP)
- Senhas armazenadas como **bcrypt hash** (nunca em texto puro)
- HTTPS automático no Railway

---

## 📁 Estrutura

```
gutowski-mailing/
├── server.js          # Backend Express
├── package.json
├── .env.example       # Template de variáveis
└── public/
    └── index.html     # Frontend (tema branco + dourado)
```
