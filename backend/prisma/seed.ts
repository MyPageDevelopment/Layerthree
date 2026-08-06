import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando datos existentes de la base de datos...');

  // Clean relations in correct deletion order
  await prisma.materialRequestItem.deleteMany();
  await prisma.materialRequest.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotationRequest.deleteMany();
  await prisma.vanItem.deleteMany();
  await prisma.van.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.productAudit.deleteMany();
  await prisma.product.deleteMany();
  await prisma.appNotification.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Creando usuarios iniciales requeridos...');

  const passwordHash = await bcrypt.hash('Prueba123!', 10);

  const initialUsers = [
    {
      email: 'danielbelozoo@gmail.com',
      name: 'Daniel Belozo (Admin)',
      role: UserRole.SUPER_ADMIN,
    },
    {
      email: 'luis.ibacache@layerthree.cl',
      name: 'Luis Ibacache',
      role: UserRole.GERENTE,
    },
    {
      email: 'davie.ossandon@layerthree.cl',
      name: 'Davie Ossandón',
      role: UserRole.GERENTE,
    },
    {
      email: 'marco.farias@layerthree.cl',
      name: 'Marco Farías',
      role: UserRole.JEFE_PROYECTO,
    },
    {
      email: 'alex.olivares@layerthree.cl',
      name: 'Alex Olivares',
      role: UserRole.JEFE_PROYECTO,
    },
    {
      email: 'daniel.belozo@layerthree.cl',
      name: 'Daniel Belozo (Bodeguero)',
      role: UserRole.BODEGUERO,
    },
  ];

  for (const u of initialUsers) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: passwordHash,
        isActive: true,
        allowedModules: JSON.stringify(['inventory', 'projects', 'reports', 'quotations']),
      },
    });
    console.log(`✅ Usuario creado: ${user.email} [ROL: ${user.role}]`);
  }

  console.log('✨ Seed completado con éxito. Todas las contraseñas son: Prueba123!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
