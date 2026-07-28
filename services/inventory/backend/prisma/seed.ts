import { PrismaClient, ProductCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crear usuarios
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const viewerPassword = await bcrypt.hash('Viewer123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bodega.com' },
    update: {},
    create: {
      email: 'admin@bodega.com',
      password: adminPassword,
      name: 'Administrador',
      role: 'GERENTE',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@bodega.com' },
    update: {},
    create: {
      email: 'viewer@bodega.com',
      password: viewerPassword,
      name: 'Visualizador',
      role: 'TECNICO',
    },
  });

  console.log('✅ Usuarios creados:', { admin, viewer });

  // Crear productos de ejemplo
  const products = [
    {
      sku: 'CABLE-FO-100M',
      name: 'Cable Fibra Óptica 100m',
      description: 'Cable de fibra óptica monomodo para instalaciones de red',
      category: ProductCategory.FIBRA_OPTICA,
      subcategory: 'Cables',
      stock: 50,
      minStock: 10,
      unitPrice: 15000,
    },
    {
      sku: 'ROUTER-GPON',
      name: 'Router GPON',
      description: 'Router GPON para terminación de fibra óptica',
      category: ProductCategory.EQUIPOS,
      subcategory: 'Routers',
      stock: 25,
      minStock: 5,
      unitPrice: 85000,
    },
    {
      sku: 'CONECTOR-SC',
      name: 'Conector SC/APC',
      description: 'Conectores SC/APC para fibra óptica',
      category: ProductCategory.FIBRA_OPTICA,
      subcategory: 'Conectores',
      stock: 200,
      minStock: 50,
      unitPrice: 2500,
    },
    {
      sku: 'SPLITTER-1X8',
      name: 'Splitter 1x8',
      description: 'Divisor óptico 1:8 para redes FTTH',
      category: ProductCategory.FIBRA_OPTICA,
      subcategory: 'Splitters',
      stock: 15,
      minStock: 8,
      unitPrice: 35000,
    },
    {
      sku: 'ODF-24P',
      name: 'ODF 24 Puertos',
      description: 'Distribuidor de fibra óptica 24 puertos',
      category: ProductCategory.FIBRA_OPTICA,
      subcategory: 'Distribuidores',
      stock: 8,
      minStock: 3,
      unitPrice: 125000,
    },
    {
      sku: 'CABLE-UTP-CAT6',
      name: 'Cable UTP Cat6 305m',
      description: 'Bobina cable UTP categoría 6',
      category: ProductCategory.RED,
      subcategory: 'Cables',
      stock: 30,
      minStock: 10,
      unitPrice: 95000,
    },
    {
      sku: 'PATCH-CORD-3M',
      name: 'Patch Cord 3m',
      description: 'Patch cord UTP Cat6 3 metros',
      category: ProductCategory.RED,
      subcategory: 'Patch Cords',
      stock: 150,
      minStock: 30,
      unitPrice: 3500,
    },
    {
      sku: 'ONT-GPON',
      name: 'ONT GPON',
      description: 'Terminal de red óptica GPON',
      category: ProductCategory.EQUIPOS,
      subcategory: 'ONT',
      stock: 40,
      minStock: 15,
      unitPrice: 55000,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log('✅ Productos creados');

  // Crear algunos movimientos de ejemplo
  const cable = await prisma.product.findUnique({ where: { sku: 'CABLE-FO-100M' } });
  const router = await prisma.product.findUnique({ where: { sku: 'ROUTER-GPON' } });

  if (cable && router) {
    await prisma.movement.createMany({
      data: [
        {
          productId: cable.id,
          type: 'ENTRY',
          quantity: 20,
          projectId: 'STOCK-INICIAL',
          notes: 'Entrada inicial de inventario',
          userId: admin.id,
        },
        {
          productId: router.id,
          type: 'ENTRY',
          quantity: 10,
          projectId: 'COMPRA-2024-001',
          notes: 'Compra a proveedor',
          userId: admin.id,
        },
        {
          productId: cable.id,
          type: 'EXIT',
          quantity: 5,
          projectId: 'PROJ-2024-001',
          notes: 'Instalación proyecto edificio central',
          userId: admin.id,
        },
      ],
    });

    console.log('✅ Movimientos de ejemplo creados');
  }

  console.log('🎉 Seeding completado!');
  console.log('\n📝 Credenciales de acceso:');
  console.log('Admin - Email: admin@bodega.com | Password: Admin123!');
  console.log('Viewer - Email: viewer@bodega.com | Password: Viewer123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
