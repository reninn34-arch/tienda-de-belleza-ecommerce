/**
 * ⚠️  SCRIPT DE MIGRACIÓN ONE-SHOT — Ejecutar UNA sola vez.
 *
 * Propósito: Leer el stock actual de cada Product (columna aún existente),
 * crear la Branch 'tienda-online' y mover ese stock a la tabla Inventory.
 *
 * ORDEN DE EJECUCIÓN:
 *   1. Ejecuta ESTE script ANTES de `npx prisma migrate dev`
 *   2. Luego aplica la migración: `npx prisma migrate dev --name add-branch-inventory`
 *
 * Cómo correrlo:
 *   npx tsx prisma/migrate-to-inventory.ts
 */

import "dotenv/config";
import { db } from "../lib/db";

const DEFAULT_BRANCH_NAME = "tienda-online";

interface ProductWithStock {
  id: string;
  name: string;
  stock: number;
}

async function main() {
  console.log("🚀 Iniciando migración a sistema multisucursal...\n");

  // Leer el stock actual vía queryRaw (la columna todavía existe en este punto)
  const products = await db.$queryRaw<ProductWithStock[]>`
    SELECT id, name, stock FROM "Product"
  `;

  if (products.length === 0) {
    console.log("ℹ️  No hay productos en la base de datos. Nada que migrar.");
  } else {
    console.log(`📦 Encontrados ${products.length} productos para migrar.\n`);
  }

  // 1. Crear (o encontrar) la sucursal por defecto
  const branch = await db.branch.upsert({
    where: { name: DEFAULT_BRANCH_NAME },
    update: {},
    create: {
      name: DEFAULT_BRANCH_NAME,
      address: "Tienda en línea",
    },
  });
  console.log(`✅ Sucursal "${DEFAULT_BRANCH_NAME}" lista. ID: ${branch.id}\n`);

  // 2. Migrar stock de cada producto a Inventory
  let migrated = 0;
  let skipped = 0;

  for (const product of products) {
    // Verificar si ya existe un registro de inventario para esta combinación
    const existing = await db.inventory.findUnique({
      where: {
        productId_branchId: {
          productId: product.id,
          branchId: branch.id,
        },
      },
    });

    if (existing) {
      console.log(`  ↪ [SKIP] "${product.name}" ya tiene inventario en ${DEFAULT_BRANCH_NAME}`);
      skipped++;
      continue;
    }

    await db.inventory.create({
      data: {
        productId: product.id,
        branchId: branch.id,
        stock: product.stock ?? 0,
      },
    });

    console.log(
      `  ✔ "${product.name}" → stock: ${product.stock ?? 0} unidades`
    );
    migrated++;
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   - Productos migrados: ${migrated}`);
  console.log(`   - Productos ya migrados (skip): ${skipped}`);
  console.log(`\n🎉 Migración completada.`);
  console.log(
    `\n⚡ Próximo paso: npx prisma migrate dev --name add-branch-inventory`
  );
  console.log(
    `   Esto eliminará la columna 'stock' de la tabla Product.\n`
  );
}

main()
  .catch((e) => {
    console.error("\n❌ Error durante la migración:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
