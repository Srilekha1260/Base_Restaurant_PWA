import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding demo tenant...')

  const existing = await prisma.tenant.findUnique({ where: { slug: 'demo-restaurant' } })
  if (existing) {
    console.log('Demo tenant already exists, skipping seed.')
    return
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      primaryColor: '#1a1a1a',
      secondaryColor: '#e63946',
      currency: 'NZD',
      gstRate: 0.15,
      deliveryEnabled: true,
      deliveryProvider: 'Uber Eats',
      deliveryRedirectUrl: 'https://www.ubereats.com',
      deliveryButtonLabel: 'Order on Uber Eats',
    },
  })

  // Feature flags
  await prisma.featureFlag.createMany({
    data: [
      { tenantId: tenant.id, key: 'kitchen_display_enabled', value: true },
      { tenantId: tenant.id, key: 'dine_in_enabled', value: true },
      { tenantId: tenant.id, key: 'takeaway_enabled', value: true },
    ],
  })

  // Tax rule
  await prisma.taxRule.create({
    data: { tenantId: tenant.id, name: 'GST 15%', rate: 0.15, isDefault: true },
  })

  // Branch
  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Branch',
      address: '1 Queen St, Auckland CBD, Auckland 1010, NZ',
      phone: '+64 9 000 0000',
    },
  })

  // Kitchen printer
  await prisma.printerConfig.create({
    data: {
      branchId: branch.id,
      name: 'Kitchen Printer',
      ipAddress: '192.168.1.100',
      port: 9100,
      isDefault: true,
    },
  })

  // 4 Sections × 4 Tables = 16 tables
  const sectionNames = ['Indoor', 'Outdoor', 'Bar', 'Private']
  for (const sectionName of sectionNames) {
    const section = await prisma.section.create({
      data: { branchId: branch.id, name: sectionName },
    })
    for (let t = 1; t <= 4; t++) {
      await prisma.table.create({
        data: {
          sectionId: section.id,
          name: `${sectionName.slice(0, 2).toUpperCase()}${t}`,
          capacity: 4,
        },
      })
    }
  }

  // Menu categories & items
  const categories = [
    {
      name: 'Starters',
      items: [
        { name: 'Garlic Bread', description: 'Toasted ciabatta with garlic butter', price: 9.0 },
        { name: 'Calamari', description: 'Crispy fried squid with aioli', price: 16.0 },
        { name: 'Bruschetta', description: 'Tomato, basil, olive oil on toasted bread', price: 13.0 },
      ],
    },
    {
      name: 'Mains',
      items: [
        { name: 'Beef Burger', description: '200g beef patty, cheddar, lettuce, tomato, house sauce', price: 24.0 },
        { name: 'Grilled Salmon', description: 'Atlantic salmon, lemon butter, seasonal vegetables', price: 32.0 },
        { name: 'Mushroom Risotto', description: 'Arborio rice, mixed mushrooms, parmesan', price: 26.0 },
        { name: 'Chicken Schnitzel', description: 'Crumbed chicken, chips, garden salad', price: 28.0 },
      ],
    },
    {
      name: 'Desserts',
      items: [
        { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with vanilla ice cream', price: 14.0 },
        { name: 'Crème Brûlée', description: 'Classic French dessert with caramelised sugar', price: 13.0 },
      ],
    },
    {
      name: 'Drinks',
      items: [
        { name: 'Sparkling Water', description: '500ml bottle', price: 4.5 },
        { name: 'Fresh Orange Juice', description: 'Freshly squeezed', price: 7.0 },
        { name: 'Flat White', description: 'Double espresso with steamed milk', price: 5.5 },
        { name: 'House Red Wine', description: 'Glass of house Merlot', price: 12.0 },
      ],
    },
  ]

  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci]
    const category = await prisma.menuCategory.create({
      data: { tenantId: tenant.id, name: cat.name, sortOrder: ci },
    })
    for (let ii = 0; ii < cat.items.length; ii++) {
      const item = cat.items[ii]
      await prisma.menuItem.create({
        data: {
          tenantId: tenant.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          price: item.price,
          sortOrder: ii,
        },
      })
    }
  }

  // Demo users
  const password = await bcrypt.hash('password123', 10)
  await prisma.user.createMany({
    data: [
      { tenantId: tenant.id, email: 'admin@demo.com', passwordHash: password, name: 'Admin User', role: 'TENANT_ADMIN' },
      { tenantId: tenant.id, email: 'waiter@demo.com', passwordHash: password, name: 'Demo Waiter', role: 'WAITER' },
      { tenantId: tenant.id, email: 'cashier@demo.com', passwordHash: password, name: 'Demo Cashier', role: 'CASHIER' },
      { tenantId: tenant.id, email: 'kitchen@demo.com', passwordHash: password, name: 'Kitchen Staff', role: 'KITCHEN' },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('Demo credentials:')
  console.log('  admin@demo.com / password123')
  console.log('  waiter@demo.com / password123')
  console.log('  cashier@demo.com / password123')
  console.log('  kitchen@demo.com / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
