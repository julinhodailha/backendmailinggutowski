// src/routes/contacts.js
const router = require('express').Router();
const { prisma } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// Todos os endpoints requerem login
router.use(requireAuth);

// ── GET /api/contacts ──────────────────────────
// Filtros: estado, status, search, page, pageSize, orderBy
router.get('/', async (req, res, next) => {
  try {
    const {
      estado, status, search,
      page = 1, pageSize = 50,
      orderBy = 'score', order = 'desc',
    } = req.query;

    const where = {};
    if (estado)  where.estado = estado;
    if (status)  where.status = status;
    if (search) {
      where.OR = [
        { nome:     { contains: search, mode: 'insensitive' } },
        { cidade:   { contains: search, mode: 'insensitive' } },
        { telefone: { contains: search } },
        { email:    { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy: { [orderBy]: order },
        skip:  (Number(page) - 1) * Number(pageSize),
        take:  Number(pageSize),
        select: {
          id: true, nome: true, tipo: true, cidade: true, estado: true,
          telefone: true, email: true, score: true, status: true,
          obs: true, isDuplicate: true, origem: true, updatedAt: true,
          updates: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { note: true, createdAt: true, user: { select: { name: true } } },
          },
        },
      }),
    ]);

    res.json({
      data: contacts,
      meta: { total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / pageSize) },
    });
  } catch (err) { next(err); }
});

// ── GET /api/contacts/stats ────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const { estado } = req.query;
    const where = estado ? { estado } : {};

    const [total, byStatus, byEstado, avgScore] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.groupBy({ by: ['status'], where, _count: true }),
      prisma.contact.groupBy({ by: ['estado'], _count: true }),
      prisma.contact.aggregate({ where, _avg: { score: true } }),
    ]);

    res.json({
      total,
      byStatus: Object.fromEntries(byStatus.map(b => [b.status, b._count])),
      byEstado: Object.fromEntries(byEstado.map(b => [b.estado, b._count])),
      avgScore: Math.round(avgScore._avg.score || 0),
    });
  } catch (err) { next(err); }
});

// ── PATCH /api/contacts/:id/status ────────────
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const VALID_STATUSES = [
      'PENDENTE','BOM_LEAD','EM_ANDAMENTO','CONVERTIDO',
      'NAO_EXISTE','SEM_INTERESSE','DESCARTADO',
    ];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

    const [updated] = await prisma.$transaction([
      prisma.contact.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      }),
      prisma.contactUpdate.create({
        data: {
          contactId: id,
          userId: req.user.id,
          oldStatus: contact.status,
          newStatus: status,
          note: note || null,
        },
      }),
    ]);

    res.json({ ok: true, contact: updated });
  } catch (err) { next(err); }
});

// ── PATCH /api/contacts/:id/obs ───────────────
router.patch('/:id/obs', async (req, res, next) => {
  try {
    const { obs } = req.body;
    const updated = await prisma.contact.update({
      where: { id: req.params.id },
      data: { obs },
    });
    res.json({ ok: true, contact: updated });
  } catch (err) { next(err); }
});

// ── GET /api/contacts/:id/history ─────────────
router.get('/:id/history', async (req, res, next) => {
  try {
    const history = await prisma.contactUpdate.findMany({
      where: { contactId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
    res.json({ data: history });
  } catch (err) { next(err); }
});

// ── DELETE /api/contacts/:id ──────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas admins podem excluir contatos' });
    }
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
