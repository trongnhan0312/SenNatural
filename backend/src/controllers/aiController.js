const prisma = require("../prismaClient");
const dayjs = require("dayjs");

// Normalize Vietnamese string: remove diacritics, lowercase, clean spaces
const normalize = (s = "") =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Preprocess text: converts volume units (e.g. 0.5L -> 500ml)
const preprocessText = (text = "") => {
  let processed = text.toLowerCase();
  
  // Convert Liters to Milliliters (e.g., 0.5l -> 500ml, 1l -> 1000ml)
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*(?:l|L|lit|lít)\b/g, (match, val) => {
    return (parseFloat(val) * 1000) + "ml";
  });
  
  // Normalize ml spacing (e.g. 500 ml -> 500ml)
  processed = processed.replace(/(\d+)\s*(?:ml|mililit)\b/gi, "$1ml");
  
  // Clean punctuation
  processed = processed.replace(/[,;]/g, " ");
  return processed;
};

// Enhanced price parser
const parsePrice = (text) => {
  const clean = text.toLowerCase();
  
  // Trieu (million) e.g., 1.5 triệu, 2 trieu
  const trieuMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:triệu|trieu)\b/);
  if (trieuMatch) {
    return parseFloat(trieuMatch[1]) * 1000000;
  }
  
  // K or Ngan/Nghin (thousand) e.g., 85k, 85 ngàn, 85 nghìn
  const kMatch = clean.match(/(\d+)\s*(?:k|ngàn|nghìn|ngan|nghin)\b/);
  if (kMatch) {
    return parseInt(kMatch[1]) * 1000;
  }
  
  // Raw numbers followed by currency or just numbers above 1000
  // e.g. 85.000đ, 85000 vnd
  const rawMatch = clean.match(/(\d+(?:\.\d+)*)\s*(?:vnd|đ|d|đồng|dong)?\b/);
  if (rawMatch) {
    const val = rawMatch[1].replace(/\./g, "");
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed >= 1000) {
      return parsed;
    }
  }
  
  return null;
};

// Extract quantity with better context awareness
const parseQuantity = (text, actionVerbs = []) => {
  // Remove volume indicators first to avoid confusing them with quantities
  let cleanText = text
    .replace(/\d+\s*ml\b/gi, " ")
    .replace(/\d+\s*l\b/gi, " ");

  // E.g., "nhập 10 cái", "bán 5 chai"
  const quantityMatch = cleanText.match(/\b(?:nhập|xuất|bán|trừ|cộng|thêm|số lượng|sl)?\s*(\d+)\s*(?:cái|chai|lọ|hộp|đơn vị)?\b/i);
  if (quantityMatch && quantityMatch[1]) {
    const q = parseInt(quantityMatch[1]);
    // Avoid parsing prices as quantity (like 85k, 85000)
    if (!cleanText.includes(quantityMatch[1] + "k") && !cleanText.includes(quantityMatch[1] + "000")) {
      return q;
    }
  }

  // Look for standalone numbers NOT followed by k, ngàn, triệu, or vnd
  const numbers = cleanText.match(/\b\d+\b/g);
  if (numbers && numbers.length > 0) {
    const candidates = numbers.map(Number);
    return candidates.find((n) => n >= 1 && n <= 10000) || null;
  }

  return null;
};

const detectAction = (text = "") => {
  const t = normalize(text);
  if (/(them|tao|them moi|tao moi)\s+(san pham|sp|mat hang)/.test(t)) return "CREATE_PRODUCT";
  if (/(xoa|huy|delete|remove)\s+(san pham|sp|mat hang)/.test(t) || /^(xoa|delete|remove)\b/.test(t)) return "DELETE_PRODUCT";
  if (/(sua|doi|cap nhat|cap|update).*(gia|gianhap|giaban|giá nhập|giá bán|gia nhap|gia ban)/.test(t)) return "PRICE_UPDATE";
  if (/(du bao|canh bao|sap het|het hang|de xuat nhap|restock|shortage|thieu)/.test(t)) return "PREDICT";
  if (/(xuat bao cao|bao cao|thong ke|doanh thu|loi nhuan|doanh so|report)/.test(t)) return "REPORT";
  if (/(nhap|cong|them|import|nhap kho)/.test(t)) return "IMPORT";
  if (/(ban|xuat|tru|xuat kho|subtract|export|out)/.test(t)) return "EXPORT";
  if (/(ton|con|bao nhieu|check|kiem tra|thong tin)/.test(t)) return "QUERY";
  return "UNKNOWN";
};

// Alias map for common abbreviations
const aliasMap = {
  bo: "bồ kết",
  "bo ket": "bồ kết",
  bokat: "bồ kết",
  gung: "gừng",
  xit: "xịt tóc",
  "xit toc": "xịt tóc",
  u: "ủ tóc",
  "u toc": "ủ tóc",
  dau: "dầu gội",
  "dau goi": "dầu gội",
  keo: "keo",
  "keo den": "keo đen",
};

// Expand abbreviations in text
const expandAbbreviations = (text = "") => {
  let expandedText = text;
  // Sort keys by length in descending order to match multi-word abbreviations first
  const sortedAbbrs = Object.keys(aliasMap).sort((a, b) => b.length - a.length);
  for (const abbr of sortedAbbrs) {
    const escaped = abbr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=[^\\p{L}\\p{N}_]|$)`, "giu");
    expandedText = expandedText.replace(regex, (match, p1) => p1 + aliasMap[abbr]);
  }
  return expandedText;
};

// Smart product matcher
const findBestProduct = (text, products) => {
  const normText = normalize(text);
  if (!normText) return null;

  let best = null;
  let maxScore = 0;
  
  // Extract volume (ml) from text if present
  const volumeMatch = normText.match(/(\d+ml)\b/);
  const volFilter = volumeMatch ? volumeMatch[1] : null;
  
  for (const p of products) {
    const normName = normalize(p.name);
    const normVol = normalize(p.volume || "");
    
    let score = 0;
    
    // Volume weight
    if (volFilter) {
      if (normVol === volFilter) {
        score += 15; // Match volume exactly
      } else {
        continue; // Volume mismatch, ignore this product
      }
    }

    // Keyword match weights
    const keywords = normName.split(/\s+/);
    keywords.forEach(keyword => {
      if (normText.includes(keyword)) {
        score += 3;
      }
    });

    // Substring match
    if (normText.includes(normName)) {
      score += 10;
    }
    
    // Check aliases
    for (const [abbr, full] of Object.entries(aliasMap)) {
      if (normText.includes(abbr) && normName.includes(normalize(full))) {
        score += 8;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      best = p;
    }
  }
  
  return maxScore > 3 ? best : null;
};

const parseMessage = (text, prevProduct = null) => {
  const preprocessed = preprocessText(text || "");
  const expanded = expandAbbreviations(preprocessed);
  const globalAction = detectAction(expanded);
  
  const chunks = expanded
    .split(/,|(?:\bvà\b)(?!\s+cộng)|(?:\bva\b)(?!\s+cong)| and /i)
    .map((c) => c.trim())
    .filter(Boolean);

  const parts = chunks.map((chunk) => {
    const action = detectAction(chunk) === "UNKNOWN" ? globalAction : detectAction(chunk);
    const actionVerbs =
      action === "IMPORT"
        ? ["nhập", "nhập kho", "cộng", "thêm", "import", "add"]
        : action === "EXPORT"
          ? ["xuất", "xuất kho", "bán", "trừ", "export", "out"]
          : [];

    const price = parsePrice(chunk);
    
    // Avoid confusing price numbers with quantity
    let cleanChunk = chunk;
    if (price) {
      const priceRegex = /(\d+)\s*k\b|(\d+(?:\.\d+)?)\s*(?:triệu|trieu)\b|(\d+)\s*(?:ngàn|nghìn|ngan|nghin)\b|(\d+(?:\.\d+)*)\s*(?:vnd|đ|d|đồng|dong)\b/i;
      cleanChunk = chunk.replace(priceRegex, "");
    }
    
    const quantity = parseQuantity(cleanChunk, actionVerbs);

    // Extract product volume from chunk
    const volMatch = chunk.match(/\b\d+ml\b/i);
    const volume = volMatch ? volMatch[0].toLowerCase() : null;

    // Clean product name from chunk
    let name = chunk
      .replace(/(nhập|nhập kho|bán|ban|xuất|xuat|cộng|cong|thêm|them|import|export|add|out|sửa|sua|đổi|doi|cập nhật|cap nhat|xóa|xoa|tạo|tao|sản phẩm|sp|mặt hàng|mathang|thành|than|gia|giá|giá bán|giá nhập|giaban|gianhap)/gi, "")
      .replace(/\d+\s*k\b/gi, "")
      .replace(/\d+\s*(?:ngàn|nghìn|ngan|nghin|triệu|trieu|vnd|đ|d|đồng|dong)/gi, "")
      .replace(/\b(?:cái|chai|lọ|hộp|đơn vị|cai|lo|hop)\b/gi, "")
      .replace(/\b(?:lần|lan|ngày|ngay)\b/gi, "")
      .replace(/\b\d+ml\b/gi, "")
      .replace(/\b\d+\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // If name is empty, fall back to conversation history product
    if (!name && prevProduct) {
      name = prevProduct;
    }

    return {
      raw: chunk,
      name: name,
      volume: volume,
      quantity: quantity,
      price: price,
      action: action,
    };
  });

  return { action: globalAction, parts };
};

const generateResponse = (results, globalAction, additionalData = {}) => {
  if (results.length === 0) {
    return "Xin lỗi, tôi không hiểu rõ yêu cầu của bạn. Bạn có thể sử dụng các lệnh ví dụ sau:\n- 'nhập dầu gội bồ kết 300ml 10 cái giá 85k'\n- 'xuất xịt tóc 5'\n- 'thêm sản phẩm dầu gội bưởi 300ml giá nhập 35k giá bán 75k'";
  }

  const lines = results.map((item) => {
    if (item.error) {
      if (item.error.includes("Không tìm thấy sản phẩm")) {
        return `😕 Không tìm thấy sản phẩm '${item.product}' trong hệ thống. Bạn có thể thêm sản phẩm mới bằng cách gõ: 'thêm sản phẩm ${item.product} [dung tích] giá nhập [giá] giá bán [giá]'`;
      }
      return `⚠️ ${item.product}: ${item.error}`;
    }

    if (item.action === "CREATE_PRODUCT") {
      return `✨ Đã thêm sản phẩm mới thành công:\n- **Tên:** ${item.product}\n- **Dung tích:** ${item.volume}\n- **Giá nhập:** ${item.importPrice.toLocaleString("vi-VN")}đ\n- **Giá bán:** ${item.sellPrice.toLocaleString("vi-VN")}đ`;
    }

    if (item.action === "DELETE_PRODUCT") {
      return `🗑️ Đã xóa sản phẩm **${item.product}** thành công khỏi hệ thống.`;
    }

    if (item.action === "PRICE_UPDATE") {
      const priceType = item.priceField === "importPrice" ? "giá nhập" : "giá bán";
      return `✅ Cập nhật ${priceType} sản phẩm **${item.product}** thành **${item.price.toLocaleString("vi-VN")}đ**`;
    }

    if (item.action === "IMPORT") {
      const priceNote = item.price ? ` (giá nhập mới: ${item.price.toLocaleString("vi-VN")}đ)` : "";
      return `📦 Nhập kho thành công: **${item.quantity}** x **${item.product}**${priceNote}`;
    }

    if (item.action === "EXPORT") {
      const priceNote = item.price ? ` (giá bán mới: ${item.price.toLocaleString("vi-VN")}đ)` : "";
      return `🚚 Xuất kho thành công: **${item.quantity}** x **${item.product}**${priceNote}`;
    }

    // QUERY
    const status =
      item.quantity > 50
        ? "dồi dào"
        : item.quantity > 10
          ? "đủ dùng"
          : item.quantity > 0
            ? "sắp hết hàng"
            : "đã hết hàng";
    return `📊 **${item.product}**: tồn kho còn **${item.quantity}** (${status})\n- Giá nhập: ${item.importPrice?.toLocaleString("vi-VN")}đ\n- Giá bán: ${item.sellPrice?.toLocaleString("vi-VN")}đ`;
  });

  let summary = "";
  if (globalAction === "IMPORT" || globalAction === "EXPORT") {
    const errors = results.filter((r) => r.error).length;
    const success = results.length - errors;
    summary = success > 0 
      ? `✨ Giao dịch hoàn tất (${success} thành công${errors > 0 ? `, ${errors} lỗi` : ""})`
      : "❌ Giao dịch thất bại.";
  }

  return [summary, ...lines].filter(Boolean).join("\n\n");
};

// AI assistant chat entry point
const chat = async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, reply: "Vui lòng nhập tin nhắn." });
  }

  // 1. Fetch previous product context from ChatHistory
  let prevProduct = null;
  try {
    const lastChat = await prisma.chatHistory.findFirst({
      orderBy: { id: "desc" },
    });
    if (lastChat) {
      const lastResp = JSON.parse(lastChat.response);
      if (lastResp.data && lastResp.data.length > 0) {
        const lastSuccess = lastResp.data.find((r) => !r.error);
        if (lastSuccess && lastSuccess.product) {
          prevProduct = lastSuccess.product;
        }
      }
    }
  } catch (e) {
    console.error("Error loading chat history:", e);
  }

  // 2. Parse current message
  const { action: globalAction, parts } = parseMessage(message, prevProduct);
  const products = await prisma.product.findMany();
  const results = [];

  // Handle REPORT Action
  if (globalAction === "REPORT") {
    const totalProducts = await prisma.product.count();
    
    const qtyAggregate = await prisma.product.aggregate({
      _sum: { quantity: true },
    });
    const totalInventory = qtyAggregate._sum.quantity || 0;
    
    // Inventory value (sum of quantity * importPrice)
    const allProducts = await prisma.product.findMany();
    const inventoryVal = allProducts.reduce((sum, p) => sum + p.quantity * p.importPrice, 0);
    const retailVal = allProducts.reduce((sum, p) => sum + p.quantity * p.sellPrice, 0);
    
    // Low stock count (<= 10)
    const lowStockCount = allProducts.filter((p) => p.quantity <= 10).length;
    
    // Current month revenue
    const startOfMonth = dayjs().startOf("month").toDate();
    const endOfMonth = dayjs().endOf("month").toDate();
    
    const histories = await prisma.inventoryHistory.findMany({
      where: {
        action: "EXPORT",
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { product: true },
    });
    
    const monthlyRev = histories.reduce((sum, h) => {
      const price = h.sellPrice || h.product.sellPrice || 0;
      return sum + price * h.quantity;
    }, 0);

    const monthlyCost = histories.reduce((sum, h) => {
      const price = h.importPrice || h.product.importPrice || 0;
      return sum + price * h.quantity;
    }, 0);
    
    const monthlyProfit = monthlyRev - monthlyCost;

    const reply = `📊 **BÁO CÁO TỒN KHO & DOANH THU THÁNG ${dayjs().format("MM/YYYY")}**\n\n` +
      `- 📦 **Tổng số mặt hàng:** \`${totalProducts}\` sản phẩm\n` +
      `- 📈 **Tổng số lượng tồn kho:** \`${totalInventory.toLocaleString("vi-VN")}\` đơn vị\n` +
      `- 💰 **Tổng giá trị kho (giá nhập):** \`${inventoryVal.toLocaleString("vi-VN")}đ\`\n` +
      `- 💸 **Giá trị bán ra dự tính:** \`${retailVal.toLocaleString("vi-VN")}đ\`\n` +
      `- 🚨 **Mặt hàng sắp hết/hết hàng:** \`${lowStockCount}\` sản phẩm\n` +
      `- 💵 **Doanh thu tháng này:** \`${monthlyRev.toLocaleString("vi-VN")}đ\`\n` +
      `- 📈 **Lợi nhuận dự tính:** \`${monthlyProfit.toLocaleString("vi-VN")}đ\`\n\n` +
      `📥 **Tải báo cáo chi tiết:**\n` +
      `- 📄 [Tải báo cáo Excel](/api/export/excel)\n` +
      `- 📕 [Tải báo cáo PDF](/api/export/pdf)`;

    const resp = {
      success: true,
      reply: reply.replace(/\*\*/g, ""),
      data: [{ action: "REPORT", summary: "Generated monthly stats report" }],
      action: "REPORT",
    };

    await prisma.chatHistory.create({
      data: { message, response: JSON.stringify(resp) },
    });
    return res.json(resp);
  }

  // Handle PREDICT Action (Low Stock restock suggestions)
  if (globalAction === "PREDICT") {
    const lowStockProducts = products.filter(p => p.quantity <= 10);
    
    let reply = "";
    if (lowStockProducts.length === 0) {
      reply = `✅ **DỰ BÁO KHO HÀNG:**\nTình trạng kho hàng rất tốt! Không có sản phẩm nào ở mức cảnh báo (<= 10 cái). Mức tồn kho hiện tại đủ cung cấp ổn định cho thị trường trong thời gian tới.`;
    } else {
      reply = `🚨 **DỰ BÁO KHO HÀNG & ĐỀ XUẤT NHẬP KHO:**\n\n`;
      lowStockProducts.forEach(p => {
        const suggestQty = p.quantity === 0 ? 50 : (20 - p.quantity);
        const restockCost = suggestQty * p.importPrice;
        reply += `- **${p.name}** (${p.volume}): chỉ còn **${p.quantity}** cái (Cảnh báo: ${p.quantity === 0 ? "Hết hàng!" : "Sắp hết!"})\n` +
          `  👉 *Đề xuất:* Nhập thêm **${suggestQty}** chai (Chi phí dự tính: \`${restockCost.toLocaleString("vi-VN")}đ\`)\n`;
      });
      
      const totalRestockCost = lowStockProducts.reduce((sum, p) => {
        const suggestQty = p.quantity === 0 ? 50 : (20 - p.quantity);
        return sum + (suggestQty * p.importPrice);
      }, 0);

      reply += `\n💰 **Tổng ngân sách restock dự kiến:** \`${totalRestockCost.toLocaleString("vi-VN")}đ\`\n\n` +
        `💡 *Lưu ý:* Dự báo nhu cầu bán lẻ dầu gội và sản phẩm chăm sóc tóc sẽ tăng khoảng 15% vào cuối tuần, khuyến nghị thực hiện các lệnh nhập hàng sớm để tránh đứt gãy nguồn cung.`;
    }

    const resp = {
      success: true,
      reply: reply.replace(/\*\*/g, ""),
      data: lowStockProducts.map(p => ({ product: p.name, quantity: p.quantity, action: "PREDICT" })),
      action: "PREDICT",
    };

    await prisma.chatHistory.create({
      data: { message, response: JSON.stringify(resp) },
    });
    return res.json(resp);
  }

  // Process standard parts
  for (const p of parts) {
    let qty = p.quantity;
    let volumeStr = p.volume;
    let prod = null;

    if (volumeStr) {
      const volMatch = volumeStr.match(/(\d+)\s*ml/i);
      const queryVolumeMl = volMatch ? parseInt(volMatch[1]) : 0;
      
      if (queryVolumeMl > 0) {
        // Find candidate products matching name
        const candidates = products.filter(dbP => {
          const nameMatch = normalize(dbP.name).includes(normalize(p.name)) || normalize(p.name).includes(normalize(dbP.name));
          return nameMatch;
        });

        if (candidates.length > 0) {
          // 1. Check if there's an exact volume match
          const exactMatch = candidates.find(dbP => {
            const dbVolMatch = (dbP.volume || "").match(/(\d+)\s*ml/i);
            const dbVol = dbVolMatch ? parseInt(dbVolMatch[1]) : 0;
            return dbVol === queryVolumeMl;
          });

          if (exactMatch) {
            prod = exactMatch;
            if (qty === null) qty = 1;
          } else {
            // 2. Unit conversion: e.g. "2 lít" (2000ml) to 4 bottles of 500ml
            let largestDbProduct = candidates[0];
            let largestDbVol = 0;
            
            candidates.forEach(dbP => {
              const dbVolMatch = (dbP.volume || "").match(/(\d+)\s*ml/i);
              const dbVol = dbVolMatch ? parseInt(dbVolMatch[1]) : 0;
              if (dbVol > largestDbVol) {
                largestDbVol = dbVol;
                largestDbProduct = dbP;
              }
            });

            if (largestDbVol > 0) {
              prod = largestDbProduct;
              if (qty === null) {
                qty = Math.round(queryVolumeMl / largestDbVol);
                if (qty === 0) qty = 1;
              }
            }
          }
        }
      }
    }

    // Fallback to normal product matching
    if (!prod) {
      prod = findBestProduct(p.name, products);
      if (prod && qty === null) {
        qty = 1;
      }
    }

    // CREATE PRODUCT
    if (p.action === "CREATE_PRODUCT") {
      if (!p.name) {
        results.push({ product: "Sản phẩm mới", error: "Vui lòng nhập tên sản phẩm mới." });
        continue;
      }
      
      const volumeStr = p.volume || "300ml";
      const exists = products.find(p_db => normalize(p_db.name) === normalize(p.name) && normalize(p_db.volume || "") === normalize(volumeStr));
      if (exists) {
        results.push({ product: p.name, error: `Sản phẩm này đã tồn tại với dung tích ${volumeStr} trong hệ thống.` });
        continue;
      }

      const importPriceVal = p.price || 30000; // default prices if not provided
      const sellPriceVal = p.price ? p.price * 2 : 60000;
      
      // Infer category from name
      let inferredCategory = "Chăm sóc";
      if (normalize(p.name).includes("dau goi")) inferredCategory = "Dầu gội";
      else if (normalize(p.name).includes("xa")) inferredCategory = "Dầu xả";
      else if (normalize(p.name).includes("tam")) inferredCategory = "Sữa tắm";

      const newProd = await prisma.product.create({
        data: {
          name: p.name,
          volume: volumeStr,
          category: inferredCategory,
          importPrice: importPriceVal,
          sellPrice: sellPriceVal,
          quantity: 0,
        },
      });

      results.push({
        product: newProd.name,
        volume: newProd.volume,
        importPrice: newProd.importPrice,
        sellPrice: newProd.sellPrice,
        action: "CREATE_PRODUCT",
      });
      continue;
    }

    // DELETE PRODUCT
    if (p.action === "DELETE_PRODUCT") {
      if (!prod) {
        results.push({ product: p.name || "sản phẩm", error: "Không tìm thấy sản phẩm này trong hệ thống để xóa." });
        continue;
      }

      await prisma.product.delete({
        where: { id: prod.id },
      });

      results.push({
        product: prod.name,
        action: "DELETE_PRODUCT",
      });
      continue;
    }

    // PRICE_UPDATE
    if (p.action === "PRICE_UPDATE") {
      if (!prod) {
        results.push({
          product: p.name || "sản phẩm",
          error: "Không tìm thấy sản phẩm để cập nhật giá",
        });
        continue;
      }
      if (!p.price) {
        results.push({
          product: prod.name,
          error: "Vui lòng nhập giá tiền mới cần cập nhật. Ví dụ: 'cập nhật giá bán xịt tóc 30k'",
        });
        continue;
      }

      // Check if updating import or sell price
      const priceField = /nhap|nhập/.test(normalize(p.raw)) ? "importPrice" : "sellPrice";
      
      await prisma.product.update({
        where: { id: prod.id },
        data: { [priceField]: p.price },
      });

      results.push({
        product: prod.name,
        price: p.price,
        action: "PRICE_UPDATE",
        priceField,
      });
      continue;
    }

    // IMPORT / EXPORT / QUERY
    if (!prod) {
      results.push({
        product: p.name || "sản phẩm",
        error: "Không tìm thấy sản phẩm trong danh sách kho",
      });
      continue;
    }

    if (p.action === "IMPORT") {
      if (!qty) {
        results.push({
          product: prod.name,
          error: `Số lượng nhập không hợp lệ. Ví dụ: 'nhập ${prod.name} 10 cái'`,
        });
        continue;
      }

      const updateData = { quantity: prod.quantity + qty };
      if (p.price) updateData.importPrice = p.price;

      await prisma.product.update({
        where: { id: prod.id },
        data: updateData,
      });

      await prisma.inventoryHistory.create({
        data: {
          productId: prod.id,
          action: "IMPORT",
          quantity: qty,
          importPrice: p.price || prod.importPrice,
          userId: req.user?.id,
          note: `Nhập kho tự động bằng AI Assistant: +${qty} cái`,
        },
      });

      results.push({ product: prod.name, quantity: qty, action: "IMPORT", price: p.price });
    } else if (p.action === "EXPORT") {
      if (!qty) {
        results.push({
          product: prod.name,
          error: `Số lượng xuất không hợp lệ. Ví dụ: 'xuất ${prod.name} 5 cái'`,
        });
        continue;
      }

      if (prod.quantity < qty) {
        results.push({
          product: prod.name,
          quantity: qty,
          error: `Không đủ hàng xuất kho. Hiện tại chỉ còn ${prod.quantity} cái trong kho.`,
        });
        continue;
      }

      const updateData = { quantity: prod.quantity - qty };
      if (p.price) updateData.sellPrice = p.price;

      await prisma.product.update({
        where: { id: prod.id },
        data: updateData,
      });

      await prisma.inventoryHistory.create({
        data: {
          productId: prod.id,
          action: "EXPORT",
          quantity: qty,
          sellPrice: p.price || prod.sellPrice,
          userId: req.user?.id,
          note: `Xuất kho tự động bằng AI Assistant: -${qty} cái`,
        },
      });

      results.push({ product: prod.name, quantity: qty, action: "EXPORT", price: p.price });
    } else {
      // QUERY Action
      results.push({
        product: prod.name,
        quantity: prod.quantity,
        importPrice: prod.importPrice,
        sellPrice: prod.sellPrice,
        action: "QUERY",
      });
    }
  }

  const reply = generateResponse(results, globalAction);

  const resp = {
    success: results.some((r) => !r.error),
    reply: reply.replace(/\*\*/g, ""),
    data: results,
    action: globalAction,
  };

  await prisma.chatHistory.create({
    data: { message, response: JSON.stringify(resp) },
  });

  res.json(resp);
};

const getHistory = async (req, res) => {
  try {
    const history = await prisma.chatHistory.findMany({
      orderBy: { createdAt: "asc" },
    });
    const data = history.flatMap((h) => {
      let replyText = "";
      try {
        const respObj = JSON.parse(h.response);
        replyText = (respObj.reply || h.response).replace(/\*\*/g, "");
      } catch (e) {
        replyText = h.response.replace(/\*\*/g, "");
      }
      return [
        { role: "user", text: h.message },
        { role: "assistant", text: replyText },
      ];
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get chat history error:", error);
    res.status(500).json({ message: "Không thể lấy lịch sử chat." });
  }
};

module.exports = { chat, getHistory, normalize, parseMessage, findBestProduct };
