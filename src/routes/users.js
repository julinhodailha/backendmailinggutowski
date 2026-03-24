// src/routes/users.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { prisma } = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: users });
  } catch (err) { next(err); }
});

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const { email, password, name, role = 'OPERATOR' } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password e name são obrigatórios' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase().trim(), password: hashed, name, role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email já cadastrado' });
    next(err);
  }
});

// PATCH /api/users/:id/active
router.patch('/:id/active', async (req, res, next) => {
  try {
    const { active } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { active },
      select: { id: true, email: true, active: true },
    });
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
