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

const create = async (req, res) => {
  try {
    const { name, category, volume, quantity = 0, importPrice = 0, sellPrice = 0 } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên sản phẩm không được để trống." });
    }

    const p = await prisma.product.create({
      data: {
        name: name.trim(),
        category: category ? category.trim() : null,
        volume: volume ? volume.trim() : null,
        quantity: Number(quantity) || 0,
        importPrice: Number(importPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
      },
    });
    res.status(201).json(p); // Created status (201) or standard response
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

    const { name, category, volume, quantity, importPrice, sellPrice } = req.body;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category ? category.trim() : null;
    if (volume !== undefined) updateData.volume = volume ? volume.trim() : null;
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (importPrice !== undefined) updateData.importPrice = Number(importPrice);
    if (sellPrice !== undefined) updateData.sellPrice = Number(sellPrice);

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
