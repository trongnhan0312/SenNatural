const prisma = require("../prismaClient");

const importStock = async (req, res) => {
  try {
    const { productId, quantity, importPrice, note, format } = req.body;
    
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

      const isShampoo = product.category === "Dầu gội";
      let updateData = {};
      let price = importPrice ? Number(importPrice) : null;
      let actualQty = qty;

      let bottles300Delta = 0;
      let bottles500Delta = 0;
      let bulkLitersDelta = 0;

      const isRawMaterial = product.category === "Raw Material";
      if (isShampoo && format) {
        if (format === "300ml") {
          bottles300Delta = qty;
          updateData = {
            bottles300: product.bottles300 + qty,
            quantity: product.quantity + qty,
          };
          price = price || product.importPrice300 || product.importPrice;
        } else if (format === "500ml") {
          bottles500Delta = qty;
          updateData = {
            bottles500: product.bottles500 + qty,
            quantity: product.quantity + qty,
          };
          price = price || product.importPrice500 || product.importPrice;
        } else if (format === "bulk") {
          bulkLitersDelta = qty;
          updateData = {
            bulkLiters: product.bulkLiters + qty,
          };
          price = price || product.importPriceBulk || product.importPrice;
          actualQty = 0; // bulk liter has no discrete bottle quantity count in standard fields
        } else {
          throw new Error("INVALID_FORMAT");
        }
      } else if (isRawMaterial) {
        bulkLitersDelta = qty;
        updateData = {
          bulkLiters: product.bulkLiters + qty,
        };
        price = price || product.importPrice;
        actualQty = 0;
      } else {
        updateData = { quantity: product.quantity + qty };
        price = price || product.importPrice;
      }

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: updateData,
      });

      const noteText = note || (isShampoo && format
        ? `Nhập kho dầu gội (${format === 'bulk' ? qty + ' L hàng xá' : '+' + qty + ' chai ' + format})`
        : isRawMaterial
        ? `Nhập kho nguyên liệu xá: +${qty} L`
        : `Nhập kho: +${qty} cái`);

      const hist = await tx.inventoryHistory.create({
        data: {
          productId: product.id,
          action: "IMPORT",
          quantity: actualQty,
          importPrice: price,
          note: noteText,
          userId: req.user?.id,
          bottles300: bottles300Delta > 0 ? bottles300Delta : null,
          bottles500: bottles500Delta > 0 ? bottles500Delta : null,
          bulkLiters: bulkLitersDelta > 0 ? bulkLitersDelta : null,
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
    if (error.message === "INVALID_FORMAT") {
      return res.status(400).json({ message: "Quy cách đóng gói không hợp lệ." });
    }
    res.status(500).json({ message: "Nhập kho thất bại." });
  }
};

const exportStock = async (req, res) => {
  try {
    const { productId, quantity, sellPrice, note, format } = req.body;
    
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

      const isShampoo = product.category === "Dầu gội";
      let updateData = {};
      let price = sellPrice ? Number(sellPrice) : null;
      let actualQty = qty;

      let bottles300Delta = 0;
      let bottles500Delta = 0;
      let bulkLitersDelta = 0;

      const isRawMaterial = product.category === "Raw Material";
      if (isShampoo && format) {
        if (format === "300ml") {
          if (product.bottles300 < qty) {
            throw new Error("INSUFFICIENT_STOCK");
          }
          bottles300Delta = qty;
          updateData = {
            bottles300: product.bottles300 - qty,
            quantity: product.quantity - qty,
          };
          price = price || product.sellPrice300 || product.sellPrice;
        } else if (format === "500ml") {
          if (product.bottles500 < qty) {
            throw new Error("INSUFFICIENT_STOCK");
          }
          bottles500Delta = qty;
          updateData = {
            bottles500: product.bottles500 - qty,
            quantity: product.quantity - qty,
          };
          price = price || product.sellPrice500 || product.sellPrice;
        } else if (format === "bulk") {
          if (product.bulkLiters < qty) {
            throw new Error("INSUFFICIENT_STOCK");
          }
          bulkLitersDelta = qty;
          updateData = {
            bulkLiters: product.bulkLiters - qty,
          };
          price = price || product.sellPriceBulk || product.sellPrice;
          actualQty = 0; // bulk liter has no bottle count in standard fields
        } else {
          throw new Error("INVALID_FORMAT");
        }
      } else if (isRawMaterial) {
        if (product.bulkLiters < qty) {
          throw new Error("INSUFFICIENT_STOCK");
        }
        bulkLitersDelta = qty;
        updateData = {
          bulkLiters: product.bulkLiters - qty,
        };
        price = price || product.sellPrice;
        actualQty = 0;
      } else {
        if (product.quantity < qty) {
          throw new Error("INSUFFICIENT_STOCK");
        }
        updateData = { quantity: product.quantity - qty };
        price = price || product.sellPrice;
      }

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: updateData,
      });

      const noteText = note || (isShampoo && format
        ? `Xuất kho dầu gội (${format === 'bulk' ? qty + ' L hàng xá' : '-' + qty + ' chai ' + format})`
        : isRawMaterial
        ? `Xuất kho nguyên liệu xá: -${qty} L`
        : `Xuất kho: -${qty} cái`);

      const hist = await tx.inventoryHistory.create({
        data: {
          productId: product.id,
          action: "EXPORT",
          quantity: actualQty,
          sellPrice: price,
          note: noteText,
          userId: req.user?.id,
          bottles300: bottles300Delta > 0 ? bottles300Delta : null,
          bottles500: bottles500Delta > 0 ? bottles500Delta : null,
          bulkLiters: bulkLitersDelta > 0 ? bulkLitersDelta : null,
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
    if (error.message === "INVALID_FORMAT") {
      return res.status(400).json({ message: "Quy cách đóng gói không hợp lệ." });
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
