// src/seed.js — cria usuário admin inicial
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { prisma } = require('./src/lib/prisma');

async function main() {
  const email    = process.env.ADMIN_EMAIL    || 'admin@amanda';
  const password = process.env.ADMIN_PASSWORD || '2563Amanda@gutowski';
  const name     = process.env.ADMIN_NAME     || 'Admin Gutowski';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ Usuário ${email} já existe.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, password: hashed, name, role: 'ADMIN' },
  });
  console.log(`✅ Admin criado: ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
