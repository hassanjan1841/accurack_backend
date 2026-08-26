import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const CLIENT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';
const STORE = '33333333-3333-3333-3333-333333333333';
const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

async function main() {
  await db.clients.upsert({
    where: { id: CLIENT },
    update: {},
    create: { id: CLIENT, name: 'Sales Mart', email: 'owner@salesmart.com', phone: '+1 555 0100', tier: 'premium', status: 'active' },
  });
  await db.business.upsert({
    where: { clientId: CLIENT }, update: {},
    create: { clientId: CLIENT, businessName: 'Sales Mart', contactNo: '+1 555 0100', website: 'https://salesmart.example', address: '742 Market St, Springfield' },
  });
  await db.users.upsert({
    where: { id: USER }, update: {},
    create: { id: USER, firstName: 'Michael', lastName: 'Doe', email: 'michael@salesmart.com', role: 'super_admin', clientId: CLIENT, status: 'active', isOtpUsed: true, position: 'Owner' },
  });
  await db.stores.upsert({
    where: { id: STORE }, update: {},
    create: { id: STORE, name: 'Sales Mart', clientId: CLIENT, address: '742 Market St, Springfield', phone: '+1 555 0100', email: 'store@salesmart.com' },
  });
  await db.userStoreMap.upsert({
    where: { userId_storeId: { userId: USER, storeId: STORE } }, update: {},
    create: { userId: USER, storeId: STORE, clientId: CLIENT },
  });

  const catNames = ['Beverages', 'Dairy', 'Bakery', 'Produce', 'Snacks'];
  const cats = {};
  for (const name of catNames) {
    const c = await db.category.create({ data: { name, code: name.slice(0, 3).toUpperCase(), clientId: CLIENT } });
    cats[name] = c.id;
  }

  const productDefs = [
    ['Coca-Cola 500ml', 'Beverages', 0.95, 1.75], ['Orange Juice 1L', 'Beverages', 1.60, 2.99], ['Mineral Water 1.5L', 'Beverages', 0.40, 0.99],
    ['Whole Milk 1 Gal', 'Dairy', 2.20, 3.99], ['Cheddar Cheese 200g', 'Dairy', 2.80, 4.50], ['Greek Yogurt 500g', 'Dairy', 1.90, 3.25],
    ['Sourdough Loaf', 'Bakery', 1.10, 2.75], ['Croissant 4-pack', 'Bakery', 1.40, 3.20], ['Bananas 1kg', 'Produce', 0.60, 1.29],
    ['Roma Tomatoes 1kg', 'Produce', 0.90, 1.99], ['Potato Chips 150g', 'Snacks', 0.70, 1.85], ['Mixed Nuts 250g', 'Snacks', 2.10, 4.75],
  ];
  const products = [];
  for (const [name, cat, cost, sell] of productDefs) {
    const p = await db.products.create({
      data: {
        name, categoryId: cats[cat], clientId: CLIENT, storeId: STORE,
        sku: 'SKU-' + Math.floor(10000 + Math.random() * 89999), pluUpc: '' + Math.floor(1e11 + Math.random() * 8e11),
        brandName: pick(['Fresh Farms', 'DailyGood', 'MarketChoice', 'Nature+']),
        itemQuantity: Math.floor(rnd(40, 400)), msrpPrice: sell + rnd(0.2, 0.8),
        singleItemSellingPrice: sell, singleItemCostPrice: cost, minimumSellingQuantity: 1,
        discountAmount: 0, percentDiscount: pick([0, 0, 0, 5, 10]),
      },
    });
    products.push(p);
  }

  const supNames = ['Global Foods Distributors', 'FreshLine Wholesale', 'Sunrise Beverages Co.', 'Prime Dairy Supply'];
  for (const name of supNames) {
    await db.suppliers.create({ data: { name, phone: '+1 555 ' + Math.floor(1000 + Math.random() * 8999), email: name.toLowerCase().replace(/[^a-z]/g, '') + '@supply.example', address: 'Industrial Park, Springfield', storeId: STORE, clientId: CLIENT } });
  }

  const custNames = ['Emma Wilson', 'Liam Johnson', 'Olivia Brown', 'Noah Davis', 'Ava Martinez', 'James Miller'];
  const customers = [];
  for (const customerName of custNames) {
    const c = await db.customer.create({
      data: { customerName, phoneNumber: '+1 555 ' + Math.floor(1000 + Math.random() * 8999), customerMail: customerName.toLowerCase().replace(/[^a-z]/g, '.') + '@example.com',
        city: pick(['Springfield', 'Riverton', 'Fairview']), state: 'CA', country: 'USA', storeId: STORE, clientId: CLIENT, currentBalance: rnd(0, 450), credits: rnd(0, 50) },
    });
    customers.push(c);
  }

  let salesCount = 0;
  for (let i = 0; i < 40; i++) {
    const when = daysAgo(Math.floor(Math.random() * 60));
    const items = [];
    const n = 1 + Math.floor(Math.random() * 3);
    let total = 0, profit = 0, qtyTotal = 0;
    for (let j = 0; j < n; j++) {
      const p = pick(products);
      const qty = 1 + Math.floor(Math.random() * 6);
      const line = Math.round(p.singleItemSellingPrice * qty * 100) / 100;
      total += line; qtyTotal += qty;
      profit += Math.round((p.singleItemSellingPrice - p.singleItemCostPrice) * qty * 100) / 100;
      items.push({ productId: p.id, pluUpc: p.pluUpc || 'NA', productName: p.name, quantity: qty, sellingPrice: p.singleItemSellingPrice, totalPrice: line, clientId: CLIENT });
    }
    const sale = await db.sales.create({
      data: {
        userId: USER, storeId: STORE, clientId: CLIENT, customerId: pick(customers).id,
        paymentMethod: pick(['CASH', 'CARD', 'CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET']),
        totalAmount: Math.round(total * 100) / 100, profitAmount: Math.round(profit * 100) / 100,
        quantitySend: qtyTotal, tax: Math.round(total * 0.08 * 100) / 100, status: 'COMPLETED',
        cashierName: 'Michael Doe', createdAt: when, updatedAt: when,
        saleItems: { create: items },
      },
    });
    salesCount++;
  }

  const expenseDefs = [['Store rent', 2500], ['Electricity bill', 420], ['Staff wages', 3800], ['Cleaning supplies', 140], ['POS software', 79], ['Delivery fuel', 260], ['Marketing flyers', 180], ['Equipment repair', 320]];
  for (const [description, amount] of expenseDefs) {
    await db.expenses.create({ data: { userId: USER, storeId: STORE, clientId: CLIENT, amount, description, date: daysAgo(Math.floor(Math.random() * 45)) } });
  }

  console.log(`Seeded: client, business, super_admin user, store, ${catNames.length} categories, ${products.length} products, ${supNames.length} suppliers, ${customers.length} customers, ${salesCount} sales, ${expenseDefs.length} expenses`);
  console.log(`IDS clientId=${CLIENT} userId=${USER} storeId=${STORE}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
