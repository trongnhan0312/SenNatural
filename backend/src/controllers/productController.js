const prisma = require("../prismaClient");

const list = async (req, res) => {
  try {
    const { page = 1, limit = 10, q, category } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit))); // cap at 100 max per page
    
    const where = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { category: { contains: q } }
      ];
    }
    if (category) {
      where.category = category;
    }

    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { updatedAt: "desc" },
    });
    
    res.json({ data: products, total });
  } catch (error) {
    console.error("List products error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ." });
    }
    
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const normalizeCategory = (category) => {
  if (!category) return null;
  const trimmed = category.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "raw material" || lower === "nguyên liệu" || lower === "nguyên liệu xá" || lower === "nguyen lieu") {
    return "Raw Material";
  }
  if (lower === "dầu gội" || lower === "dau goi" || lower === "dầu gội đầu") {
    return "Dầu gội";
  }
  return trimmed;
};

const create = async (req, res) => {
  try {
    const {
      name,
      category,
      volume,
      quantity = 0,
      importPrice = 0,
      sellPrice = 0,
      bottles300 = 0,
      bottles500 = 0,
      bulkLiters = 0,
      importPrice300 = 0,
      sellPrice300 = 0,
      importPrice500 = 0,
      sellPrice500 = 0,
      importPriceBulk = 0,
      sellPriceBulk = 0,
    } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên sản phẩm không được để trống." });
    }

    const normalizedCat = normalizeCategory(category);
    const isShampoo = normalizedCat === "Dầu gội";
    const isRawMaterial = normalizedCat === "Raw Material";
    const finalQty = isShampoo
      ? (Number(bottles300) || 0) + (Number(bottles500) || 0)
      : Number(quantity) || 0;

    const p = await prisma.product.create({
      data: {
        name: name.trim(),
        category: normalizedCat,
        volume: volume ? volume.trim() : null,
        quantity: finalQty,
        importPrice: Number(importPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        bottles300: isShampoo ? (Number(bottles300) || 0) : 0,
        bottles500: isShampoo ? (Number(bottles500) || 0) : 0,
        bulkLiters: (isShampoo || isRawMaterial) ? (Number(bulkLiters) || 0) : 0,
        importPrice300: Number(importPrice300) || 0,
        sellPrice300: Number(sellPrice300) || 0,
        importPrice500: Number(importPrice500) || 0,
        sellPrice500: Number(sellPrice500) || 0,
        importPriceBulk: Number(importPriceBulk) || 0,
        sellPriceBulk: Number(sellPriceBulk) || 0,
      },
    });
    res.status(201).json(p);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(400).json({ message: "Không thể tạo sản phẩm. Vui lòng kiểm tra lại thông tin." });
  }
};

const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ." });
    }

    const {
      name,
      category,
      volume,
      quantity,
      importPrice,
      sellPrice,
      bottles300,
      bottles500,
      bulkLiters,
      importPrice300,
      sellPrice300,
      importPrice500,
      sellPrice500,
      importPriceBulk,
      sellPriceBulk,
    } = req.body;
    
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) {
      updateData.category = normalizeCategory(category);
    }
    if (volume !== undefined) updateData.volume = volume ? volume.trim() : null;
    if (importPrice !== undefined) updateData.importPrice = Number(importPrice);
    if (sellPrice !== undefined) updateData.sellPrice = Number(sellPrice);
    
    // Package formats fields
    if (bottles300 !== undefined) updateData.bottles300 = Number(bottles300);
    if (bottles500 !== undefined) updateData.bottles500 = Number(bottles500);
    if (bulkLiters !== undefined) updateData.bulkLiters = Number(bulkLiters);
    if (importPrice300 !== undefined) updateData.importPrice300 = Number(importPrice300);
    if (sellPrice300 !== undefined) updateData.sellPrice300 = Number(sellPrice300);
    if (importPrice500 !== undefined) updateData.importPrice500 = Number(importPrice500);
    if (sellPrice500 !== undefined) updateData.sellPrice500 = Number(sellPrice500);
    if (importPriceBulk !== undefined) updateData.importPriceBulk = Number(importPriceBulk);
    if (sellPriceBulk !== undefined) updateData.sellPriceBulk = Number(sellPriceBulk);

    // Re-calculate quantity if product is a shampoo and packaging is updated
    let isShampoo = false;
    if (category !== undefined) {
      isShampoo = updateData.category === "Dầu gội";
    } else {
      const current = await prisma.product.findUnique({ where: { id } });
      isShampoo = current?.category === "Dầu gội";
    }

    if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
    } else if (isShampoo && (bottles300 !== undefined || bottles500 !== undefined)) {
      // Find current product if one of them is missing to sum up
      const current = await prisma.product.findUnique({ where: { id } });
      if (current) {
        const b300 = bottles300 !== undefined ? Number(bottles300) : current.bottles300;
        const b500 = bottles500 !== undefined ? Number(bottles500) : current.bottles500;
        updateData.quantity = b300 + b500;
      }
    }

    const p = await prisma.product.update({
      where: { id },
      data: updateData,
    });
    res.json(p);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(400).json({ message: "Cập nhật sản phẩm thất bại. Vui lòng kiểm tra lại dữ liệu." });
  }
};

const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ." });
    }

    // Check if referenced in inventory history before deleting
    const refCount = await prisma.inventoryHistory.count({ where: { productId: id } });
    if (refCount > 0) {
      return res.status(400).json({ 
        message: "Không thể xóa sản phẩm này vì đã có dữ liệu giao dịch nhập xuất liên quan." 
      });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Xóa sản phẩm thất bại." });
  }
};

module.exports = { list, getOne, create, update, remove };
