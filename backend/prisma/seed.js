const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Verificando inicialización de base de datos...');

  const userCount = await prisma.user.count();

  // Only seed initial users if database has zero users
  if (userCount === 0) {
    console.log('🌱 Creando usuarios iniciales por primera vez...');

    const passSuperAdmin = await bcrypt.hash('Admin2026!', 10);
    const passJefe = await bcrypt.hash('Jefe2026!', 10);
    const passBodega = await bcrypt.hash('Bodega2026!', 10);
    const passGerente = await bcrypt.hash('Gerente2026!', 10);

    const users = [
      {
        email: 'danielbelozoo@gmail.com',
        password: passSuperAdmin,
        name: 'Administrador Principal',
        role: UserRole.SUPER_ADMIN,
        allowedModules: JSON.stringify(['inventory', 'projects', 'reports', 'users']),
      },
      {
        email: 'jefe.proyectos@layerthree.cl',
        password: passJefe,
        name: 'Carlos Mendoza (Jefe)',
        role: UserRole.JEFE_PROYECTO,
        allowedModules: JSON.stringify(['inventory', 'projects', 'reports']),
      },
      {
        email: 'bodega.admin@layerthree.cl',
        password: passBodega,
        name: 'Pedro Ramírez (Bodeguero)',
        role: UserRole.BODEGUERO,
        allowedModules: JSON.stringify(['inventory', 'reports']),
      },
      {
        email: 'henry.erices@layerthree.cl',
        password: passGerente,
        name: 'Henry Erices',
        role: UserRole.GERENTE,
        allowedModules: JSON.stringify(['inventory', 'projects', 'reports']),
      },
      {
        email: 'alex.olivares@layerthree.cl',
        password: passGerente,
        name: 'Alex Olivares',
        role: UserRole.GERENTE,
        allowedModules: JSON.stringify(['inventory', 'projects', 'reports']),
      },
      {
        email: 'leslie.alvarado@layerthree.cl',
        password: passGerente,
        name: 'Leslie Alvarado',
        role: UserRole.GERENTE,
        allowedModules: JSON.stringify(['inventory']),
      },
    ];

    for (const u of users) {
      await prisma.user.create({
        data: {
          email: u.email,
          password: u.password,
          name: u.name,
          role: u.role,
          allowedModules: u.allowedModules,
          isActive: true,
        },
      });
    }
  } else {
    console.log(`ℹ️ La base de datos ya contiene ${userCount} usuarios. Preservando estado existente.`);
  }

  // Seed sample products if empty
  const countProducts = await prisma.product.count();
  if (countProducts === 0) {
    await prisma.product.createMany({
      data: [
        { sku: 'EQ-001', name: 'Switch Cisco 24 Puertos Gigabit', category: 'EQUIPOS', stock: 15, minStock: 5, unitPrice: 450000 },
        { sku: 'FO-002', name: 'Cable Fibra Óptica Monomodo 500m', category: 'FIBRA_OPTICA', stock: 8, minStock: 3, unitPrice: 280000 },
        { sku: 'RED-003', name: 'Patch Cord Cat6a 2 metros', category: 'RED', stock: 120, minStock: 25, unitPrice: 4500 },
        { sku: 'CAN-004', name: 'Bandeja Portacables 100x50mm', category: 'CANALIZACION', stock: 45, minStock: 10, unitPrice: 18500 },
      ],
    });
  }

  console.log('✅ Verificación e inicialización completadas con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
