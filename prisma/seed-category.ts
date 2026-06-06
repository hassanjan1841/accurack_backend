/**
 * Category Seeder for Prisma
 *
 * Usage:
 *   npx ts-node prisma/seed-category.ts --db-url="<DATABASE_URL>" --client-id="<CLIENT_UUID>"
 *
 * Example:
 *   npx ts-node prisma/seed-category.ts --db-url="postgresql://user:pass@localhost:5432/db" --client-id="uuid-here"
 */

import { PrismaClient } from '@prisma/client';

const categories = [
  { name: 'Electronics', code: 'ELECTRONICS' },
  { name: 'Groceries', code: 'GROCERIES' },
  { name: 'Clothing', code: 'CLOTHING' },
  { name: 'Footwear', code: 'FOOTWEAR' },
  { name: 'Home Appliances', code: 'HOME_APPLIANCES' },
  { name: 'Furniture', code: 'FURNITURE' },
  { name: 'Toys', code: 'TOYS' },
  { name: 'Books', code: 'BOOKS' },
  { name: 'Stationery', code: 'STATIONERY' },
  { name: 'Sports', code: 'SPORTS' },
  { name: 'Beauty & Personal Care', code: 'BEAUTY_PERSONAL_CARE' },
  { name: 'Automotive', code: 'AUTOMOTIVE' },
  { name: 'Jewelry', code: 'JEWELRY' },
  { name: 'Garden & Outdoors', code: 'GARDEN_OUTDOORS' },
  { name: 'Pet Supplies', code: 'PET_SUPPLIES' },
  { name: 'Pharmacy', code: 'PHARMACY' },
  { name: 'Beverages', code: 'BEVERAGES' },
  { name: 'Bakery', code: 'BAKERY' },
  { name: 'Dairy', code: 'DAIRY' },
  { name: 'Meat & Seafood', code: 'MEAT_SEAFOOD' },
  { name: 'Baby Products', code: 'BABY_PRODUCTS' },
];

const dbUrlArg = process.argv.find((arg) => arg.startsWith('--db-url='));
const clientIdArg = process.argv.find((arg) => arg.startsWith('--client-id='));

const dbUrl = dbUrlArg ? dbUrlArg.split('=').slice(1).join('=') : process.env.DATABASE_URL;
const clientId = clientIdArg ? clientIdArg.split('=').slice(1).join('=') : process.env.SEED_CLIENT_ID;

if (!dbUrl) {
  console.error('❌ No database URL provided. Use --db-url or set DATABASE_URL.');
  process.exit(1);
}

if (!clientId) {
  console.error('❌ No client ID provided. Use --client-id or set SEED_CLIENT_ID.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  for (const { name, code } of categories) {
    await prisma.category.upsert({
      where: { code_clientId: { code, clientId: clientId! } },
      update: { name },
      create: { name, code, clientId: clientId! },
    });
    console.log(`✔️  Category upserted: ${name} (${code})`);
  }
  console.log('✅ Category seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
