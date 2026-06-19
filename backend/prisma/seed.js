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

  const products = [
    {
      name: "Dầu gội Bồ Kết 300ml",
      category: "Dầu gội",
      volume: "300ml",
      quantity: 15,
      importPrice: 30000,
      sellPrice: 60000,
    },
    {
      name: "Dầu gội Bồ Kết 500ml",
      category: "Dầu gội",
      volume: "500ml",
      quantity: 16,
      importPrice: 45000,
      sellPrice: 80000,
    },
    {
      name: "Dầu gội Gừng 300ml",
      category: "Dầu gội",
      volume: "300ml",
      quantity: 13,
      importPrice: 28000,
      sellPrice: 55000,
    },
    {
      name: "Dầu gội Gừng 500ml",
      category: "Dầu gội",
      volume: "500ml",
      quantity: 9,
      importPrice: 42000,
      sellPrice: 75000,
    },
    {
      name: "Xịt tóc",
      category: "Chăm sóc",
      volume: "100ml",
      quantity: 100,
      importPrice: 20000,
      sellPrice: 40000,
    },
    {
      name: "Ủ tóc",
      category: "Chăm sóc",
      volume: "200ml",
      quantity: 60,
      importPrice: 25000,
      sellPrice: 50000,
    },
  ];

  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (!exists) {
      await prisma.product.create({ data: p });
    } else {
      await prisma.product.update({
        where: { id: exists.id },
        data: {
          quantity: p.quantity,
          importPrice: p.importPrice,
          sellPrice: p.sellPrice,
          volume: p.volume,
          category: p.category,
        },
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
