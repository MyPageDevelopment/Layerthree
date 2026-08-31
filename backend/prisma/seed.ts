import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Verificando usuarios iniciales sin sobrescribir datos existentes...');

  const passwordHash = await bcrypt.hash('Prueba123!', 10);

  const initialUsers = [
    {
      email: 'danielbelozoo@gmail.com',
      name: 'Daniel Belozo',
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
      name: 'Daniel Belozo',
      role: UserRole.BODEGUERO,
    },
  ];

  for (const u of initialUsers) {
    // Usamos upsert con update vacío para NO sobrescribir nombres ni roles modificados por el usuario
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {}, // No modificar datos si el usuario ya existe
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: passwordHash,
        isActive: true,
        allowedModules: JSON.stringify(['inventory', 'projects', 'reports', 'quotations']),
      },
    });
    console.log(`✅ Usuario verificado/preservado: ${user.email} (${user.name})`);
  }

  console.log('✨ Seed seguro completado con éxito. Se preservaron los nombres y registros modificados.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
