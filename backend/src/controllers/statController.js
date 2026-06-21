const prisma = require("../prismaClient");
const dayjs = require("dayjs");

const dashboard = async (req, res) => {
  try {
    // 1. Fetch all products to aggregate metrics in memory
    const products = await prisma.product.findMany();
    const totalProducts = products.length;
    
    let totalQuantity = 0;
    let inventoryValue = 0; // sum of quantity * importPrice
    let retailValue = 0;    // sum of quantity * sellPrice
    let lowStockCount = 0;

    let boKetVolume = 0;
    let gingerVolume = 0;
    let boKetBottles300 = 0;
    let boKetBottles500 = 0;
    let boKetBulkLiters = 0;
    let gingerBottles300 = 0;
    let gingerBottles500 = 0;
    let gingerBulkLiters = 0;

    const categoryMap = {};

    products.forEach((p) => {
      const isShampoo = p.category === "Dầu gội";
      const isRawMaterial = p.category === "Raw Material";
      
      let pInvValue = 0;
      let pRetVal = 0;
      let pQty = p.quantity;
      
      if (isShampoo) {
        pInvValue = p.bottles300 * p.importPrice300 + p.bottles500 * p.importPrice500 + p.bulkLiters * p.importPriceBulk;
        pRetVal = p.bottles300 * p.sellPrice300 + p.bottles500 * p.sellPrice500 + p.bulkLiters * p.sellPriceBulk;
      } else if (isRawMaterial) {
        pInvValue = p.bulkLiters * p.importPrice;
        pRetVal = 0;
      } else {
        pInvValue = p.quantity * p.importPrice;
        pRetVal = p.quantity * p.sellPrice;
      }

      totalQuantity += pQty;
      inventoryValue += pInvValue;
      retailValue += pRetVal;
      
      // Use lowStockThreshold from configuration or default to 10
      if (p.quantity <= 10 && !isRawMaterial) {
        lowStockCount += 1;
      }

      // Calculate volumes (actual bulk storage)
      let liquidVolume = 0;
      if (isShampoo || isRawMaterial) {
        liquidVolume = p.bulkLiters * 1000;
      } else {
        let volMl = 0;
        if (p.volume) {
          const match = p.volume.match(/(\d+(?:\.\d+)?)\s*(ml|l|L)/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            if (unit === "l") {
              volMl = val * 1000;
            } else {
              volMl = val;
            }
          } else {
            const rawMatch = p.volume.match(/\d+/);
            if (rawMatch) volMl = parseInt(rawMatch[0]);
          }
        }
        liquidVolume = p.quantity * volMl;
      }

      const normName = (p.name || "").toLowerCase();
      if (normName.includes("bo ket") || normName.includes("bồ kết")) {
        boKetVolume += liquidVolume;
        if (isShampoo || isRawMaterial) {
          boKetBulkLiters += p.bulkLiters;
        }
        if (isShampoo) {
          boKetBottles300 += p.bottles300;
          boKetBottles500 += p.bottles500;
        }
      } else if (normName.includes("gung") || normName.includes("gừng")) {
        gingerVolume += liquidVolume;
        if (isShampoo || isRawMaterial) {
          gingerBulkLiters += p.bulkLiters;
        }
        if (isShampoo) {
          gingerBottles300 += p.bottles300;
          gingerBottles500 += p.bottles500;
        }
      }

      // Category distribution
      const cat = p.category || "Chưa phân loại";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, count: 0, quantity: 0, value: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].quantity += pQty;
      categoryMap[cat].value += pInvValue;
    });

    const categoryDistribution = Object.values(categoryMap);

    // 2. Fetch history for the last 30 days
    const thirtyDaysAgo = dayjs().subtract(30, "day").startOf("day").toDate();
    const history = await prisma.inventoryHistory.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      include: { product: true },
    });

    // 3. Compute Monthly Revenue & Profit (Current Calendar Month)
    const startOfMonth = dayjs().startOf("month").toDate();
    const endOfMonth = dayjs().endOf("month").toDate();
    
    const monthlyHistory = history.filter(
      (h) => h.createdAt >= startOfMonth && h.createdAt <= endOfMonth
    );

    let monthlyRevenue = 0;
    let monthlyCostOfSales = 0;

    monthlyHistory.forEach((h) => {
      if (h.action === "EXPORT") {
        const sellPrice = h.sellPrice || h.product.sellPrice || 0;
        const importPrice = h.importPrice || h.product.importPrice || 0;
        const qty = (h.bulkLiters && h.bulkLiters > 0) ? h.bulkLiters : h.quantity;
        monthlyRevenue += sellPrice * qty;
        monthlyCostOfSales += importPrice * qty;
      }
    });

    const monthlyProfit = monthlyRevenue - monthlyCostOfSales;

    // 4. Compute Daily Timeline for Charts (Last 15 days)
    const chartMap = {};
    for (let i = 14; i >= 0; i--) {
      const dateStr = dayjs().subtract(i, "day").format("DD/MM");
      chartMap[dateStr] = { date: dateStr, imports: 0, exports: 0 };
    }

    history.forEach((h) => {
      const dateStr = dayjs(h.createdAt).format("DD/MM");
      if (chartMap[dateStr]) {
        const qty = (h.bulkLiters && h.bulkLiters > 0) ? h.bulkLiters : h.quantity;
        if (h.action === "IMPORT") {
          chartMap[dateStr].imports += qty;
        } else if (h.action === "EXPORT") {
          chartMap[dateStr].exports += qty;
        }
      }
    });

    const inventoryCharts = Object.values(chartMap);

    // 5. Fetch Recent Activities (Last 5 transactions)
    const recentActivity = await prisma.inventoryHistory.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { product: true, user: true },
    });

    // 6. Compute Today's Import / Export quantities
    const startOfToday = dayjs().startOf("day").toDate();
    const endOfToday = dayjs().endOf("day").toDate();
    const todayHistory = history.filter(
      (h) => h.createdAt >= startOfToday && h.createdAt <= endOfToday
    );

    let todayImport = 0;
    let todayExport = 0;
    todayHistory.forEach((h) => {
      const qty = (h.bulkLiters && h.bulkLiters > 0) ? h.bulkLiters : h.quantity;
      if (h.action === "IMPORT") todayImport += qty;
      if (h.action === "EXPORT") todayExport += qty;
    });

    // 7. Generate dynamic AI Insights
    const aiInsights = [];
    const lowStockProducts = products.filter((p) => p.quantity <= 10);
    
    if (lowStockProducts.length > 0) {
      const sampleNames = lowStockProducts.slice(0, 3).map((p) => `${p.name}`).join(", ");
      aiInsights.push({
        type: "danger",
        message: `🚨 Cảnh báo tồn kho: ${lowStockProducts.length} sản phẩm sắp hết hàng (${sampleNames}). Hãy lên kế hoạch nhập hàng.`,
      });
    } else {
      aiInsights.push({
        type: "success",
        message: "✅ Kho hàng an toàn: Toàn bộ sản phẩm đều ở mức tồn kho ổn định (>10 cái).",
      });
    }

    // Top selling product insight
    const topGroup = await prisma.inventoryHistory.groupBy({
      by: ["productId"],
      where: {
        action: "EXPORT",
        createdAt: { gte: startOfMonth },
      },
      _sum: { quantity: true, bulkLiters: true },
      orderBy: { _sum: { quantity: "desc" } }, // Order by bottle quantity or bulk
      take: 1,
    });

    if (topGroup.length > 0) {
      const topProd = products.find((p) => p.id === topGroup[0].productId);
      if (topProd) {
        const soldQty = topGroup[0]._sum.quantity || 0;
        const soldBulk = topGroup[0]._sum.bulkLiters || 0;
        const label = soldBulk > 0 ? `${soldBulk} L hàng xá` : `${soldQty} cái/chai`;
        aiInsights.push({
          type: "info",
          message: `🔥 Bán chạy nhất: Product **${topProd.name}** đã xuất bán **${label}** trong tháng này. Hãy đảm bảo đủ tồn kho cho mặt hàng này.`,
        });
      }
    }

    // Profit margin insight
    if (monthlyRevenue > 0) {
      const margin = ((monthlyProfit / monthlyRevenue) * 100).toFixed(1);
      aiInsights.push({
        type: "info",
        message: `📈 Biên lợi nhuận ròng của tháng này đạt **${margin}%**. Hoạt động kinh doanh đang có hiệu suất sinh lời tốt.`,
      });
    }

    res.json({
      totalProducts,
      totalQuantity,
      inventoryValue,
      retailValue,
      lowStockCount,
      monthlyRevenue,
      monthlyProfit,
      inventoryCharts,
      categoryDistribution,
      recentActivity,
      aiInsights,
      boKetVolume,
      gingerVolume,
      boKetBottles300,
      boKetBottles500,
      boKetBulkLiters,
      gingerBottles300,
      gingerBottles500,
      gingerBulkLiters,
      todayImport,
      todayExport,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const revenue = async (req, res) => {
  const { from, to } = req.query;
  const where = { action: "EXPORT" };
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = new Date(from);
  if (to) where.createdAt.lte = new Date(to);
  const rows = await prisma.inventoryHistory.findMany({
    where,
    include: { product: true },
  });
  const total = rows.reduce(
    (s, r) => {
      const qty = (r.bulkLiters && r.bulkLiters > 0) ? r.bulkLiters : r.quantity;
      return s + (r.sellPrice || r.product.sellPrice || 0) * qty;
    },
    0,
  );
  res.json({ revenue: total });
};

const profit = async (req, res) => {
  const { from, to } = req.query;
  const where = { action: "EXPORT" };
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = new Date(from);
  if (to) where.createdAt.lte = new Date(to);
  const rows = await prisma.inventoryHistory.findMany({
    where,
    include: { product: true },
  });
  const total = rows.reduce(
    (s, r) => {
      const qty = (r.bulkLiters && r.bulkLiters > 0) ? r.bulkLiters : r.quantity;
      return s +
        ((r.sellPrice || r.product.sellPrice) -
          (r.importPrice || r.product.importPrice)) *
          qty;
    },
    0,
  );
  res.json({ profit: total });
};

const topProduct = async (req, res) => {
  const rows = await prisma.inventoryHistory.groupBy({
    by: ["productId"],
    where: { action: "EXPORT" },
    _sum: { quantity: true, bulkLiters: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });
  const ids = rows.map((r) => r.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
  });
  const map = products.reduce((m, p) => ((m[p.id] = p), m), {});
  const data = rows.map((r) => {
    const qty = (r._sum.bulkLiters && r._sum.bulkLiters > 0) ? r._sum.bulkLiters : r._sum.quantity;
    const suffix = r._sum.bulkLiters && r._sum.bulkLiters > 0 ? " L" : "";
    return {
      product: map[r.productId]?.name || r.productId,
      quantity: `${qty}${suffix}`,
    };
  });
  res.json({ data });
};

module.exports = { dashboard, revenue, profit, topProduct };
