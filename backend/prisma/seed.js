const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Verificando y sincronizando usuarios iniciales requeridos...');

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
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: passwordHash,
        isActive: true,
        allowedModules: JSON.stringify(['inventory', 'projects', 'reports', 'quotations']),
      },
    });
    console.log(`✅ Usuario verificado/preservado: ${user.email} [ROL: ${user.role}]`);
  }

  console.log('✨ Seed seguro completado con éxito. Se han preservado los productos y registros existentes.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
