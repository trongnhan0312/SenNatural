require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      fullName: "Admin Sen Natural",
      username: "admin",
      password,
      email: "admin@sennatural.local",
      role: "ADMIN",
    },
  });

  // Clean up any historical individual products from previous db structure to avoid conflicts
  await prisma.inventoryHistory.deleteMany({});
  await prisma.product.deleteMany({});

  const products = [
    {
      name: "Dầu gội Bồ Kết",
      category: "Dầu gội",
      volume: "Nhiều loại",
      quantity: 31,
      bottles300: 15,
      bottles500: 16,
      bulkLiters: 0.0,
      importPrice: 30000,
      sellPrice: 60000,
      importPrice300: 30000,
      sellPrice300: 60000,
      importPrice500: 45000,
      sellPrice500: 80000,
      importPriceBulk: 50000,
      sellPriceBulk: 90000,
    },
    {
      name: "Dầu gội Gừng",
      category: "Dầu gội",
      volume: "Nhiều loại",
      quantity: 22,
      bottles300: 13,
      bottles500: 9,
      bulkLiters: 0.0,
      importPrice: 28000,
      sellPrice: 55000,
      importPrice300: 28000,
      sellPrice300: 55000,
      importPrice500: 42000,
      sellPrice500: 75000,
      importPriceBulk: 45000,
      sellPriceBulk: 80000,
    },
    {
      name: "Xịt tóc",
      category: "Chăm sóc",
      volume: "100ml",
      quantity: 100,
      importPrice: 20000,
      sellPrice: 40000,
      bottles300: 0,
      bottles500: 0,
      bulkLiters: 0.0,
    },
    {
      name: "Ủ tóc",
      category: "Chăm sóc",
      volume: "200ml",
      quantity: 60,
      importPrice: 25000,
      sellPrice: 50000,
      bottles300: 0,
      bottles500: 0,
      bulkLiters: 0.0,
    },
  ];

  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (!exists) {
      await prisma.product.create({ data: p });
    } else {
      await prisma.product.update({
        where: { id: exists.id },
        data: p,
      });
    }
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
