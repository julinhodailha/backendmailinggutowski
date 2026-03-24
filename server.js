require('dotenv').config();
const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const cors       = require('cors');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CREDENTIALS (set these as Railway env vars) ───────────────────────────
// Gere o hash com: node -e "const b=require('bcryptjs');console.log(b.hashSync('SUA_SENHA',10))"
const USERS = [
  {
    email: process.env.ADMIN_EMAIL   || 'admin@amanda',
    // bcrypt hash de process.env.ADMIN_PASS || '2563Amanda@gutowski'
    hash:  process.env.ADMIN_HASH    || '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbu2',
    role:  'admin',
    name:  'Admin'
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'gutowski_super_secret_change_in_production_2024';
const JWT_EXPIRES = '8h';

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiter para login (máx 10 tentativas por 15 minutos por IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── AUTH MIDDLEWARE ───────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.cookies?.gut_token || req.headers?.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('gut_token');
    res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
}

// ─── ROTAS ─────────────────────────────────────────────────────────────────

// POST /api/login
app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });

  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    await new Promise(r => setTimeout(r, 400)); // timing-safe delay
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const valid = await bcrypt.compare(password, user.hash);
  if (!valid) {
    await new Promise(r => setTimeout(r, 400));
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const token = jwt.sign(
    { email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.cookie('gut_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8h
  });

  res.json({ ok: true, user: { email: user.email, name: user.name, role: user.role }, token });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('gut_token');
  res.json({ ok: true });
});

// GET /api/me  — verifica sessão
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', ts: new Date().toISOString() });
});

// ─── FALLBACK (SPA) ───────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Gutowski Mailing System rodando na porta ${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
