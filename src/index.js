// src/index.js — Gutowski Mailing Backend
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes    = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const importRoutes  = require('./routes/imports');
const userRoutes    = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // permite Postman / curl sem origin durante dev
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return cb(null, true);
    }
    cb(new Error('CORS: origem não autorizada'));
  },
  credentials: true,
}));

// ── MIDDLEWARE ────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limit geral
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Rate limit extra no login
app.use('/api/auth/login', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Tente novamente em 10 minutos.' },
}));

// ── HEALTH ────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── ROUTES ────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/imports',  importRoutes);
app.use('/api/users',    userRoutes);

// ── ERROR HANDLER ─────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`✅ Gutowski Mailing API rodando na porta ${PORT}`);
});
