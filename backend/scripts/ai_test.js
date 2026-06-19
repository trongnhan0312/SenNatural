const {
  normalize,
  parseMessage,
  findBestProduct,
} = require("../src/controllers/aiController");
const prisma = require("../src/prismaClient");

async function run() {
  const phrases = [
    "ban bo ket 300ml 2 va xit toc 1",
    "xuất bó kết 2",
    "nhập gung 300 10",
    "bán dầu gội bồ 3",
    "xịt 2",
    "u toc 5",
  ];
  const products = await prisma.product.findMany();
  console.log("Loaded", products.length, "products");
  for (const p of phrases) {
    console.log("\nINPUT:", p);
    const parsed = parseMessage(p);
    console.log("PARSED:", JSON.stringify(parsed, null, 2));
    for (const part of parsed.parts) {
      const prod = findBestProduct(part.name, products);
      console.log(
        "MATCH ->",
        part.name,
        "=>",
        prod ? prod.name + " (id:" + prod.id + ")" : "NOT FOUND",
      );
    }
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
