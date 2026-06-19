const prisma = require("../prismaClient");

const importStock = async (req, res) => {
  try {
    const { productId, quantity, importPrice, note } = req.body;
    
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: "Số lượng nhập phải lớn hơn 0." });
    }

    const prodId = Number(productId);
    if (isNaN(prodId)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ." });
    }

    // Run updates in a transaction for safety
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: prodId },
      });
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const newQty = product.quantity + qty;
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { quantity: newQty },
      });

      const hist = await tx.inventoryHistory.create({
        data: {
          productId: product.id,
          action: "IMPORT",
          quantity: qty,
          importPrice: importPrice ? Number(importPrice) : product.importPrice,
          note: note || `Nhập kho: +${qty} cái`,
          userId: req.user?.id,
        },
      });

      return { product: updatedProduct, history: hist };
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Import stock error:", error);
    if (error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong hệ thống." });
    }
    res.status(500).json({ message: "Nhập kho thất bại." });
  }
};

const exportStock = async (req, res) => {
  try {
    const { productId, quantity, sellPrice, note } = req.body;
    
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: "Số lượng xuất phải lớn hơn 0." });
    }

    const prodId = Number(productId);
    if (isNaN(prodId)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ." });
    }

    // Run updates in a transaction for safety
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: prodId },
      });
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      if (product.quantity < qty) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const newQty = product.quantity - qty;
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { quantity: newQty },
      });

      const hist = await tx.inventoryHistory.create({
        data: {
          productId: product.id,
          action: "EXPORT",
          quantity: qty,
          sellPrice: sellPrice ? Number(sellPrice) : product.sellPrice,
          note: note || `Xuất kho: -${qty} cái`,
          userId: req.user?.id,
        },
      });

      return { product: updatedProduct, history: hist };
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Export stock error:", error);
    if (error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong hệ thống." });
    }
    if (error.message === "INSUFFICIENT_STOCK") {
      return res.status(400).json({ message: "Số lượng hàng trong kho không đủ để xuất." });
    }
    res.status(500).json({ message: "Xuất kho thất bại." });
  }
};

const history = async (req, res) => {
  try {
    const { page = 1, limit = 10, q, from, to, productId, action } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));

    const where = {};
    if (productId) {
      where.productId = Number(productId);
    }
    if (action) {
      where.action = action;
    }
    if (q) {
      where.OR = [
        { note: { contains: q } },
        { product: { name: { contains: q } } } // search history by product name too!
      ];
    }
    
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const total = await prisma.inventoryHistory.count({ where });
    const data = await prisma.inventoryHistory.findMany({
      where,
      include: { product: true, user: true },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    });
    
    res.json({ data, total });
  } catch (error) {
    console.error("History query error:", error);
    res.status(500).json({ message: "Không thể lấy dữ liệu lịch sử." });
  }
};

module.exports = { importStock, exportStock, history };
