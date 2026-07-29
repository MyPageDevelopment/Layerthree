import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  const hashedPasswordAdmin2026 = await bcrypt.hash('Admin2026!', 10);
  const hashedPasswordLT = await bcrypt.hash('LT-1234512345', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'danielbelozoo@gmail.com' },
    update: {
      password: hashedPasswordAdmin2026,
      role: UserRole.SUPER_ADMIN,
      name: 'Administrador Principal',
      isActive: true,
      allowedModules: JSON.stringify(['inventory', 'projects', 'reports']),
    },
    create: {
      email: 'danielbelozoo@gmail.com',
      password: hashedPasswordAdmin2026,
      name: 'Administrador Principal',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      allowedModules: JSON.stringify(['inventory', 'projects', 'reports']),
    },
  });

  console.log('✅ Usuario Super Admin configurado:', superAdmin.email);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
