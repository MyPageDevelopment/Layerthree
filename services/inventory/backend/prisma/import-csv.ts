import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface CSVProduct {
  codigo: string;
  nombre: string;
  medidas: string;
  stock: number;
  marca: string;
  entradas: number;
  salidas: number;
}

interface CSVMovement {
  codigo: string;
  articulo: string;
  fecha: string;
  cantidad: number;
  proyecto: string;
  tipo: 'ENTRY' | 'EXIT';
}

async function parseCSV() {
  const csvPath = path.join(__dirname, '..', '..', 'sistema de inventario bodega layer 01 12 25.csv');
  const content = fs.readFileSync(csvPath, 'latin1'); // Usar latin1 para caracteres especiales
  const lines = content.split('\n');
  
  const products: CSVProduct[] = [];
  const movements: CSVMovement[] = [];

  // Saltar las primeras 3 líneas (encabezados)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(';');
    
    // Extraer información del producto
    const codigo = columns[0]?.trim();
    const nombre = columns[1]?.trim();
    const medidas = columns[2]?.trim();
    const stock = parseInt(columns[8]?.trim()) || 0;
    const marca = columns[5]?.trim() || '';
    const entradas = parseInt(columns[6]?.trim()) || 0;
    const salidas = parseInt(columns[7]?.trim()) || 0;

    if (codigo && nombre && codigo !== 'CODIGO') {
      products.push({
        codigo,
        nombre,
        medidas: medidas || '',
        stock,
        marca,
        entradas,
        salidas
      });
    }

    // Extraer movimientos de entrada (columnas 9-13)
    const entradaCodigo = columns[9]?.trim();
    const entradaArticulo = columns[10]?.trim();
    const entradaFecha = columns[11]?.trim();
    const entradaCantidad = parseInt(columns[12]?.trim()) || 0;
    const entradaProyecto = columns[13]?.trim() || '';

    if (entradaCodigo && entradaArticulo && entradaCodigo !== 'CODIGO' && entradaCodigo !== 'NO EXISTE') {
      movements.push({
        codigo: entradaCodigo,
        articulo: entradaArticulo,
        fecha: entradaFecha,
        cantidad: entradaCantidad,
        proyecto: entradaProyecto,
        tipo: 'ENTRY'
      });
    }

    // Extraer movimientos de salida (columnas 14-18)
    const salidaCodigo = columns[14]?.trim();
    const salidaArticulo = columns[15]?.trim();
    const salidaFecha = columns[16]?.trim();
    const salidaCantidad = parseInt(columns[17]?.trim()) || 0;
    const salidaProyecto = columns[18]?.trim() || '';

    if (salidaCodigo && salidaArticulo && salidaCodigo !== 'CODIGO' && salidaCodigo !== 'NO EXISTE') {
      movements.push({
        codigo: salidaCodigo,
        articulo: salidaArticulo,
        fecha: salidaFecha,
        cantidad: salidaCantidad,
        proyecto: salidaProyecto,
        tipo: 'EXIT'
      });
    }
  }

  return { products, movements };
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Formato esperado: DD-MM-YYYY
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Los meses en JS son 0-11
    const year = parseInt(parts[2]);
    
    // Si el año es de 2 dígitos, asumimos 2000+
    const fullYear = year < 100 ? 2000 + year : year;
    
    return new Date(fullYear, month, day);
  }
  
  return new Date();
}

async function main() {
  console.log('🌱 Importando datos desde CSV...');

  try {
    // 1. Verificar o crear usuario admin
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@bodega.com' },
      update: {},
      create: {
        email: 'admin@bodega.com',
        password: adminPassword,
        name: 'Administrador Layerthree',
        role: 'GERENTE',
      },
    });

    console.log('✅ Usuario admin verificado');

    // 2. Parsear CSV
    const { products, movements } = await parseCSV();
    console.log(`📦 Encontrados ${products.length} productos en CSV`);
    console.log(`📋 Encontrados ${movements.length} movimientos en CSV`);

    // 3. Crear productos
    let createdProducts = 0;
    const productMap = new Map<string, string>(); // codigo -> id

    for (const prod of products) {
      try {
        // Verificar si el producto ya existe
        const existing = await prisma.product.findFirst({
          where: { sku: prod.codigo }
        });

        if (existing) {
          productMap.set(prod.codigo, existing.id);
          console.log(`⏭️  Producto ya existe: ${prod.codigo}`);
          continue;
        }

        const product = await prisma.product.create({
          data: {
            sku: prod.codigo,
            name: prod.nombre,
            description: prod.medidas && prod.marca 
              ? `${prod.medidas} - ${prod.marca}`.trim()
              : prod.medidas || prod.marca || '',
            stock: prod.stock,
            minStock: Math.max(5, Math.floor(prod.stock * 0.2)), // 20% del stock como mínimo
            unitPrice: 0, // No tenemos precio en el CSV
          },
        });

        productMap.set(prod.codigo, product.id);
        createdProducts++;
        
        if (createdProducts % 10 === 0) {
          console.log(`📦 Creados ${createdProducts} productos...`);
        }
      } catch (error: any) {
        console.error(`❌ Error creando producto ${prod.codigo}:`, error.message);
      }
    }

    console.log(`✅ Total productos creados: ${createdProducts}`);

    // 4. Crear movimientos
    let createdMovements = 0;

    for (const mov of movements) {
      try {
        const productId = productMap.get(mov.codigo);
        if (!productId) {
          console.log(`⚠️  Producto no encontrado para movimiento: ${mov.codigo}`);
          continue;
        }

        await prisma.movement.create({
          data: {
            productId,
            userId: admin.id,
            type: mov.tipo,
            quantity: mov.cantidad,
            projectId: mov.proyecto || null,
            notes: `Importado desde CSV - ${mov.articulo}`,
            createdAt: parseDate(mov.fecha),
          },
        });

        createdMovements++;
        
        if (createdMovements % 20 === 0) {
          console.log(`📋 Creados ${createdMovements} movimientos...`);
        }
      } catch (error: any) {
        console.error(`❌ Error creando movimiento para ${mov.codigo}:`, error.message);
      }
    }

    console.log(`✅ Total movimientos creados: ${createdMovements}`);
    console.log('');
    console.log('🎉 Importación completada exitosamente!');
    console.log('');
    console.log('📊 Resumen:');
    console.log(`   - Productos: ${createdProducts} creados`);
    console.log(`   - Movimientos: ${createdMovements} creados`);
    console.log('');
  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
