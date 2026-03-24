# Gutowski Mailing System — Deploy Guide

## Arquitetura

```
mailing.gutowski.com.br  ←→  Netlify (frontend/public/index.html)
        ↕ fetch
gutowski-mailing-api.onrender.com  ←→  Render (Node.js API)
        ↕ Prisma
PostgreSQL no Render (banco existente do CRM)
```

---

## 1. Backend no Render

### 1.1 Crie o serviço Web no Render

1. Acesse https://render.com → **New → Web Service**
2. Conecte o repositório GitHub com este projeto
3. Configure:
   - **Name:** `gutowski-mailing-api`
   - **Root Directory:** `gutowski-mailing-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npx prisma generate && npx prisma db push`
   - **Start Command:** `node src/index.js`
   - **Plan:** Free

### 1.2 Variáveis de Ambiente (Render → Environment)

| Chave | Valor |
|-------|-------|
| `DATABASE_URL` | Connection string do seu PostgreSQL no Render (External URL) |
| `JWT_SECRET` | Clique em **Generate** para gerar automaticamente |
| `ALLOWED_ORIGINS` | `https://mailing.gutowski.com.br` |
| `NODE_ENV` | `production` |
| `ADMIN_EMAIL` | `admin@amanda` |
| `ADMIN_PASSWORD` | `2563Amanda@gutowski` |

> **Onde achar o DATABASE_URL:**
> Render Dashboard → seu banco PostgreSQL → **Connect** → **External Connection String**

### 1.3 Criar o usuário admin

Após o primeiro deploy, no Render Shell ou localmente:
```bash
# Localmente (com .env preenchido):
node src/seed.js

# Ou via Render Shell (Dashboard → seu serviço → Shell):
node src/seed.js
```

---

## 2. Frontend no Netlify

### 2.1 Configure a URL da API

Antes de fazer o deploy, edite `public/index.html` linha 1:
```javascript
const API_URL = 'https://gutowski-mailing-api.onrender.com';
//                          ↑ troque pelo endereço real do seu serviço no Render
```

### 2.2 Deploy no Netlify

**Opção A — Arraste e solte:**
1. Acesse https://app.netlify.com
2. Arraste a pasta `public/` para a área de deploy
3. Aguarde o deploy

**Opção B — Git:**
1. Conecte o repositório
2. Publish directory: `gutowski-mailing-backend/public`
3. Não precisa de build command

### 2.3 Subdomínio personalizado

1. Netlify → seu site → **Domain settings → Add custom domain**
2. Digite: `mailing.gutowski.com.br`
3. No seu DNS (onde está registrado gutowski.com.br), adicione:
   ```
   Tipo:  CNAME
   Nome:  mailing
   Valor: [seu-site].netlify.app
   TTL:   3600
   ```
4. Ative HTTPS → **Verify DNS** → **Enable SSL**

---

## 3. Verificação

```bash
# Testar API
curl https://gutowski-mailing-api.onrender.com/health
# Esperado: {"ok":true,"ts":"..."}

# Testar login
curl -X POST https://gutowski-mailing-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@amanda","password":"2563Amanda@gutowski"}'
# Esperado: {"token":"...","user":{...}}
```

---

## 4. Importando os arquivos existentes

Depois que o sistema estiver online, importe os mailings pelo painel:

1. Acesse `https://mailing.gutowski.com.br`
2. Login: `admin@amanda` / `2563Amanda@gutowski`
3. Aba **Importar** → selecione o estado → arraste os arquivos CSV/TXT
4. Clique **Enviar ao Banco de Dados**

Arquivos disponíveis para importar:
- `leads_condominios_curitiba.csv` → PR
- `leads_condominios_metropolitana_v3.csv` → PR
- `leads_condominios_regionais_v2.csv` → PR
- `MAILING_FINAL_VALIDADO_CURITIBA_RMC.csv` → PR
- `lista_validada_v1.txt` → PR
- `novos_contatos_regionais.txt` → PR

---

## 5. Schema do Banco

Tabelas criadas automaticamente pelo `prisma db push`:
- `users` — usuários do sistema (admin/operador)
- `imports` — histórico de arquivos importados
- `contacts` — todos os contatos com score e status
- `contact_updates` — histórico de qualificação por contato

---

## 6. Status disponíveis por contato

| Status | Uso |
|--------|-----|
| ⏳ Pendente | Recém importado, não qualificado |
| ⭐ Bom Lead | Contato de qualidade, priorizar |
| 🔄 Em Andamento | Já foi contactado, negociação em curso |
| ✅ Convertido | Fechou / virou cliente Gutowski |
| ❌ Não Existe | Número/email inválido |
| 😐 Sem Interesse | Contactado mas sem interesse |
| 🗑 Descartado | Remover da lista |

---

## 7. Adicionar novos operadores

Via API (autenticado como admin):
```bash
curl -X POST https://gutowski-mailing-api.onrender.com/api/users \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"operador@gutowski.com","password":"senha123","name":"Operador SC","role":"OPERATOR"}'
```
