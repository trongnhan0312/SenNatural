const prisma = require("../prismaClient");
const dayjs = require("dayjs");
const { fetchSPXTracking } = require("./waybillController");

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

const formatProductName = (name) => {
  if (!name) return "";
  const norm = name.toLowerCase();
  if (norm.includes("bo ket") || norm.includes("bồ kết")) {
    return "Bồ Kết";
  }
  if (norm.includes("ginger") || norm.includes("gừng")) {
    return "Ginger";
  }
  if (norm.includes("herbal extract") || norm.includes("chất chiết thảo mộc")) {
    return "Herbal Extract";
  }
  return name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

const findMatch = (prodName, dbProds) => {
  const cleanSearch = normalize(prodName);
  if (!cleanSearch) return null;
  
  let match = dbProds.find(p => normalize(p.name).includes(cleanSearch) || cleanSearch.includes(normalize(p.name)));
  if (match) return match;
  
  for (const [abbr, full] of Object.entries(aliasMap)) {
    if (cleanSearch.includes(abbr)) {
      const cleanFull = normalize(full);
      match = dbProds.find(p => normalize(p.name).includes(cleanFull) || cleanFull.includes(normalize(p.name)));
      if (match) return match;
    }
  }
  return null;
};

const parseInventoryCommand = (text) => {
  const norm = text.toLowerCase();
  
  const isProduction = /(?:produce|bottle|bottling|manufacture|packaging|convert to bottles|sản xuất|đóng chai)\b/i.test(norm);
  const isSales = /(?:sell|sale|bán|xuất|export|sales)\b/i.test(norm) && !isProduction;
  const isReceive = /(?:receive|add|nhập|import|thêm|cộng)\b/i.test(norm) && !isProduction && !isSales;
  
  const hasBottleKeyword = /(?:bottle|bottles|chai|lọ)\b/i.test(norm);
  
  let volumeMl = null;
  const lFirst = norm.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|litre|lít)\b/i);
  if (lFirst) {
    volumeMl = Math.round(parseFloat(lFirst[1]) * 1000);
  } else {
    const mlFirst = norm.match(/(\d+)\s*(?:ml|mililit)\b/i);
    if (mlFirst) {
      volumeMl = parseInt(mlFirst[1]);
    }
  }
  
  let quantity = null;
  const qtyMatch = norm.match(/(\d+)\s*(?:bottle|bottles|chai|cái|lọ)\b/i) || norm.match(/\b(?:nhập|bán|xuất|produce|sell|receive|add|cộng|thêm)\s+(\d+)\b/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1]);
  } else {
    let cleanText = norm
      .replace(/\d+(?:\.\d+)?\s*(?:l|liter|litre|lít|ml)\b/gi, "")
      .replace(/\d+(?:\.\d+)?\s*(?:k|ngàn|nghìn|triệu|trieu|vnd|đ|d|đồng)\b/gi, "")
      .replace(/\b\d{5,}\b/g, "");
    const numMatch = cleanText.match(/\b\d+\b/);
    if (numMatch) {
      quantity = parseInt(numMatch[0]);
    }
  }
  
  let price = null;
  const kMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:k|ngàn|nghìn)\b/i);
  if (kMatch) {
    price = Math.round(parseFloat(kMatch[1]) * 1000);
  } else {
    const mMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:m|triệu|trieu)\b/i);
    if (mMatch) {
      price = Math.round(parseFloat(mMatch[1]) * 1000000);
    } else {
      const rawPriceMatch = norm.match(/\b(\d{4,})\b/);
      if (rawPriceMatch) {
        price = parseInt(rawPriceMatch[1]);
      }
    }
  }
  
  let productName = norm
    .replace(/(?:receive|add|sell|sale|produce|bottle|bottling|manufacture|packaging|convert to bottles|nhập|bán|xuất|sản xuất|đóng chai|cộng|thêm|trừ|giá|cost|price)\b/gi, "")
    .replace(/\d+(?:\.\d+)?\s*(?:l|liter|litre|lít|ml)\b/gi, "")
    .replace(/\d+(?:\.\d+)?\s*(?:k|ngàn|nghìn|triệu|trieu|vnd|đ|d|đồng)\b/gi, "")
    .replace(/\b(?:bottle|bottles|chai|cái|lọ|hộp|đơn vị)\b/gi, "")
    .replace(/\b\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
    
  return {
    isProduction,
    isSales,
    isReceive,
    volumeMl,
    hasBottleKeyword,
    quantity,
    price,
    productName
  };
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
      const priceNote = item.price ? ` (giá nhập: ${item.price.toLocaleString("vi-VN")}đ)` : "";
      if (item.isShampoo) {
        const fmtLabel = item.format === "bulk" ? "Lít hàng xá" : `chai ${item.format}`;
        return `📦 Nhập kho thành công: **${item.quantity}** ${fmtLabel} **${item.product}**${priceNote}`;
      }
      return `📦 Nhập kho thành công: **${item.quantity}** x **${item.product}**${priceNote}`;
    }

    if (item.action === "EXPORT") {
      const priceNote = item.price ? ` (giá bán: ${item.price.toLocaleString("vi-VN")}đ)` : "";
      if (item.isShampoo) {
        const fmtLabel = item.format === "bulk" ? "Lít hàng xá" : `chai ${item.format}`;
        return `🚚 Xuất kho thành công: **${item.quantity}** ${fmtLabel} **${item.product}**${priceNote}`;
      }
      return `🚚 Xuất kho thành công: **${item.quantity}** x **${item.product}**${priceNote}`;
    }

    // QUERY
    if (item.isShampoo) {
      const totalVol = (item.bottles300 || 0) * 0.3 + (item.bottles500 || 0) * 0.5 + (item.bulkLiters || 0);
      return `📊 **${item.product}**: tổng trữ lượng **${totalVol.toFixed(1)} L**\n- Chai 300ml: ${item.bottles300 || 0} chai\n- Chai 500ml: ${item.bottles500 || 0} chai\n- Hàng xá: ${item.bulkLiters || 0} L (${Math.round((item.bulkLiters || 0) * 1000)}ml)`;
    }
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

const detectShampooFormat = (rawText) => {
  const t = rawText.toLowerCase();
  
  // Check for bulk liters (e.g. 5 lít, 5 l, 5lit)
  const bulkMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:l|lít|lit)\b/i);
  if (bulkMatch) {
    return { format: "bulk", qty: parseFloat(bulkMatch[1]) };
  }
  
  // Check for 300ml
  if (t.includes("300ml") || t.includes("300 ml")) {
    return { format: "300ml", qty: null };
  }
  
  // Check for 500ml
  if (t.includes("500ml") || t.includes("500 ml")) {
    return { format: "500ml", qty: null };
  }
  
  return { format: "300ml", qty: null };
};

// AI assistant chat entry point
// Execute actions parsed from LLM
const executeActions = async (actions, reqUser) => {
  const results = [];
  
  for (const act of actions) {
    try {
      const prodId = act.productId;

      if (act.type === "TRACK_WAYBILL") {
        if (!act.trackingNumber) {
          results.push({ error: "Thiếu mã vận đơn cần tra cứu." });
          continue;
        }
        const trackingData = await fetchSPXTracking(act.trackingNumber);
        const waybill = await prisma.waybill.upsert({
          where: { trackingNumber: act.trackingNumber },
          update: {
            carrier: act.carrier || trackingData.carrier || "SPX Express",
            status: trackingData.status,
            shipperName: trackingData.shipperName || null,
            shipperPhone: trackingData.shipperPhone || null,
            shippingAddress: trackingData.shippingAddress || null,
            weight: trackingData.weight || null,
            history: JSON.stringify(trackingData.history)
          },
          create: {
            trackingNumber: act.trackingNumber,
            carrier: act.carrier || trackingData.carrier || "SPX Express",
            status: trackingData.status,
            shipperName: trackingData.shipperName || null,
            shipperPhone: trackingData.shipperPhone || null,
            shippingAddress: trackingData.shippingAddress || null,
            weight: trackingData.weight || null,
            history: JSON.stringify(trackingData.history)
          }
        });
        
        let latestEvent = "";
        try {
          const events = trackingData.history || [];
          if (events.length > 0) {
            const lastEvt = events[events.length - 1];
            latestEvent = `${lastEvt.message} (${dayjs(lastEvt.time).format("HH:mm DD/MM/YYYY")})`;
          }
        } catch (e) {}

        results.push({
          action: "TRACK_WAYBILL",
          trackingNumber: act.trackingNumber,
          carrier: waybill.carrier,
          status: waybill.status,
          shipperName: waybill.shipperName,
          shippingAddress: waybill.shippingAddress,
          latestEvent: latestEvent,
          success: true
        });
        continue;
      }
      
      if (act.type === "CREATE_PRODUCT") {
        if (!act.productName) {
          results.push({ error: "Thiếu tên sản phẩm mới." });
          continue;
        }
        const volumeVal = act.volume || "300ml";
        const importPriceVal = act.price || 30000;
        const sellPriceVal = act.price ? act.price * 2 : 60000;
        
        // Infer category from name if not specified
        let category = act.category;
        if (!category) {
          const normName = normalize(act.productName);
          if (normName.includes("dau goi") || normName.includes("dầu gội")) category = "Dầu gội";
          else if (normName.includes("xa") || normName.includes("xả")) category = "Dầu xả";
          else if (normName.includes("tam") || normName.includes("tắm")) category = "Sữa tắm";
          else category = "Chăm sóc";
        }
        
        const newProd = await prisma.product.create({
          data: {
            name: act.productName,
            volume: volumeVal,
            category: category,
            importPrice: importPriceVal,
            sellPrice: sellPriceVal,
            quantity: act.quantity || 0,
          }
        });
        results.push({
          action: "CREATE_PRODUCT",
          product: newProd.name,
          volume: newProd.volume,
          importPrice: newProd.importPrice,
          sellPrice: newProd.sellPrice,
          success: true
        });
        continue;
      }
      
      // For other actions, we need an existing product
      if (!prodId) {
        results.push({ error: `Không xác định được sản phẩm cho hành động ${act.type}` });
        continue;
      }
      
      const prod = await prisma.product.findUnique({ where: { id: prodId } });
      if (!prod) {
        results.push({ error: `Không tìm thấy sản phẩm có ID ${prodId} trong cơ sở dữ liệu.` });
        continue;
      }
      
      const isShampoo = prod.category === "Dầu gội";
      
      if (act.type === "DELETE_PRODUCT") {
        await prisma.product.delete({ where: { id: prod.id } });
        results.push({
          action: "DELETE_PRODUCT",
          product: prod.name,
          success: true
        });
        continue;
      }
      
      if (act.type === "PRICE_UPDATE") {
        if (!act.price) {
          results.push({ error: `Thiếu giá cập nhật cho sản phẩm ${prod.name}` });
          continue;
        }
        const priceField = act.priceField === "importPrice" ? "importPrice" : "sellPrice";
        await prisma.product.update({
          where: { id: prod.id },
          data: { [priceField]: act.price }
        });
        results.push({
          action: "PRICE_UPDATE",
          product: prod.name,
          price: act.price,
          priceField,
          success: true
        });
        continue;
      }
      
      if (act.type === "IMPORT") {
        const qty = act.quantity || 0;
        let updateData = {};
        let price = act.price || prod.importPrice;
        let bottles300Delta = 0;
        let bottles500Delta = 0;
        let bulkLitersDelta = 0;
        let histQty = qty;
        
        if (isShampoo && act.format) {
          if (act.format === "300ml") {
            bottles300Delta = qty;
            updateData = {
              bottles300: prod.bottles300 + qty,
              quantity: prod.quantity + qty
            };
          } else if (act.format === "500ml") {
            bottles500Delta = qty;
            updateData = {
              bottles500: prod.bottles500 + qty,
              quantity: prod.quantity + qty
            };
          } else if (act.format === "bulk") {
            bulkLitersDelta = qty;
            updateData = {
              bulkLiters: prod.bulkLiters + qty
            };
            histQty = 0;
          }
        } else {
          updateData = { quantity: prod.quantity + qty };
        }
        
        await prisma.product.update({
          where: { id: prod.id },
          data: updateData
        });
        
        const noteText = act.note || (isShampoo && act.format
          ? `Nhập kho dầu gội bằng Trợ lý AI (${act.format === 'bulk' ? bulkLitersDelta + ' L hàng xá' : '+' + qty + ' chai ' + act.format})`
          : `Nhập kho tự động bằng Trợ lý AI: +${act.quantity || qty} cái`);
          
        await prisma.inventoryHistory.create({
          data: {
            productId: prod.id,
            action: "IMPORT",
            quantity: histQty,
            importPrice: price,
            userId: reqUser?.id,
            note: noteText,
            bottles300: bottles300Delta > 0 ? bottles300Delta : null,
            bottles500: bottles500Delta > 0 ? bottles500Delta : null,
            bulkLiters: bulkLitersDelta > 0 ? bulkLitersDelta : null,
          }
        });
        
        results.push({
          action: "IMPORT",
          product: prod.name,
          quantity: qty,
          format: act.format,
          success: true
        });
        continue;
      }
      
      if (act.type === "EXPORT") {
        const qty = act.quantity || 0;
        let updateData = {};
        let price = act.price || prod.sellPrice;
        let bottles300Delta = 0;
        let bottles500Delta = 0;
        let bulkLitersDelta = 0;
        let histQty = qty;
        
        if (isShampoo && act.format) {
          if (act.format === "300ml") {
            if (prod.bottles300 < qty) {
              results.push({ error: `Không đủ hàng xuất kho. Chỉ còn ${prod.bottles300} chai 300ml.` });
              continue;
            }
            bottles300Delta = qty;
            updateData = {
              bottles300: prod.bottles300 - qty,
              quantity: prod.quantity - qty
            };
          } else if (act.format === "500ml") {
            if (prod.bottles500 < qty) {
              results.push({ error: `Không đủ hàng xuất kho. Chỉ còn ${prod.bottles500} chai 500ml.` });
              continue;
            }
            bottles500Delta = qty;
            updateData = {
              bottles500: prod.bottles500 - qty,
              quantity: prod.quantity - qty
            };
          } else if (act.format === "bulk") {
            if (prod.bulkLiters < qty) {
              results.push({ error: `Không đủ hàng xuất kho. Chỉ còn ${prod.bulkLiters} Lít hàng xá.` });
              continue;
            }
            bulkLitersDelta = qty;
            updateData = {
              bulkLiters: prod.bulkLiters - qty
            };
            histQty = 0;
          }
        } else {
          if (prod.quantity < qty) {
            results.push({ error: `Không đủ hàng xuất kho. Chỉ còn ${prod.quantity} cái trong kho.` });
            continue;
          }
          updateData = { quantity: prod.quantity - qty };
        }
        
        await prisma.product.update({
          where: { id: prod.id },
          data: updateData
        });
        
        const noteText = act.note || (isShampoo && act.format
          ? `Xuất kho dầu gội bằng Trợ lý AI (${act.format === 'bulk' ? bulkLitersDelta + ' L hàng xá' : '-' + qty + ' chai ' + act.format})`
          : `Xuất kho tự động bằng Trợ lý AI: -${act.quantity || qty} cái`);
          
        await prisma.inventoryHistory.create({
          data: {
            productId: prod.id,
            action: "EXPORT",
            quantity: histQty,
            sellPrice: price,
            userId: reqUser?.id,
            note: noteText,
            bottles300: bottles300Delta > 0 ? bottles300Delta : null,
            bottles500: bottles500Delta > 0 ? bottles500Delta : null,
            bulkLiters: bulkLitersDelta > 0 ? bulkLitersDelta : null,
          }
        });
        
        results.push({
          action: "EXPORT",
          product: prod.name,
          quantity: qty,
          format: act.format,
          success: true
        });
        continue;
      }
      
      if (act.type === "PRODUCTION") {
        const qty = act.quantity || 1;
        const bottleSize = act.format === "500ml" ? 500 : 300;
        const requiredMl = qty * bottleSize;
        const requiredLiters = requiredMl / 1000;
        
        if (prod.bulkLiters < requiredLiters) {
          results.push({
            error: `Không đủ nguyên liệu xá cho ${prod.name}. Hiện có: ${prod.bulkLiters}L. Cần dùng: ${requiredLiters}L.`
          });
          continue;
        }
        
        let updateData = {
          bulkLiters: prod.bulkLiters - requiredLiters
        };
        
        if (bottleSize === 300) {
          updateData.bottles300 = prod.bottles300 + qty;
          updateData.quantity = prod.quantity + qty;
        } else {
          updateData.bottles500 = prod.bottles500 + qty;
          updateData.quantity = prod.quantity + qty;
        }
        
        await prisma.product.update({
          where: { id: prod.id },
          data: updateData
        });
        
        await prisma.inventoryHistory.create({
          data: {
            productId: prod.id,
            action: "EXPORT",
            quantity: 0,
            note: `Sản xuất (Trợ lý AI): Chiết xuất nguyên liệu xá: -${requiredMl}ml`,
            bulkLiters: -requiredLiters,
            userId: reqUser?.id
          }
        });
        
        await prisma.inventoryHistory.create({
          data: {
            productId: prod.id,
            action: "IMPORT",
            quantity: qty,
            note: `Sản xuất (Trợ lý AI): Đóng chai +${qty} chai ${bottleSize}ml`,
            bottles300: bottleSize === 300 ? qty : null,
            bottles500: bottleSize === 500 ? qty : null,
            userId: reqUser?.id
          }
        });
        
        results.push({
          action: "PRODUCTION",
          product: prod.name,
          quantity: qty,
          format: bottleSize + "ml",
          success: true
        });
        continue;
      }
      
    } catch (err) {
      console.error("Action execution error:", err);
      results.push({ error: `Lỗi hệ thống khi thực hiện hành động ${act.type}: ${err.message}` });
    }
  }
  
  return results;
};

// Fallback to rules-based chatbot if Gemini is not set or fails
const fallbackRulesChat = async (req, res, message, prevProduct) => {
  // Intercept for special inventory rules
  const command = parseInventoryCommand(message);
  
  if (command.isProduction || command.isSales || command.isReceive) {
    const products = await prisma.product.findMany();
    const targetName = command.productName || prevProduct || "Bồ Kết";
    let matchedProduct = findMatch(targetName, products);
    
    const isRaw = (command.volumeMl !== null && !command.hasBottleKeyword);
    const isFinished = command.hasBottleKeyword;
    
    if (command.isProduction) {
      let bottleSize = command.volumeMl;
      let qty = command.quantity || 1;
      if (!bottleSize) {
        bottleSize = 300;
        if (command.quantity !== null) {
          qty = Math.max(1, Math.floor(command.quantity / 3));
        }
      }
      const requiredMl = qty * bottleSize;
      
      const targetProduct = matchedProduct || products.find(p => p.name.includes("Bồ Kết"));
      const fmtName = formatProductName(targetProduct ? targetProduct.name : targetName);
      
      const availableMl = targetProduct ? Math.round(targetProduct.bulkLiters * 1000) : 0;
      
      if (availableMl < requiredMl) {
        const shortageMl = requiredMl - availableMl;
        const reply = `❌ Không đủ nguyên liệu\n\nHiện có: ${availableMl}ml\nCần dùng: ${requiredMl}ml\nThiếu hụt: ${shortageMl}ml` +
          "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";
        
        const resp = {
          success: false,
          reply,
          data: [{ error: "Insufficient raw material", available: availableMl, required: requiredMl, shortage: shortageMl }],
          action: "PRODUCTION"
        };
        
        await prisma.chatHistory.create({
          data: { message, response: JSON.stringify(resp) }
        });
        return res.json(resp);
      }
      
      const requiredLiters = requiredMl / 1000;
      await prisma.$transaction(async (tx) => {
        let updateData = {
          bulkLiters: targetProduct.bulkLiters - requiredLiters
        };
        
        if (bottleSize === 300) {
          updateData.bottles300 = targetProduct.bottles300 + qty;
          updateData.quantity = targetProduct.quantity + qty;
        } else if (bottleSize === 500) {
          updateData.bottles500 = targetProduct.bottles500 + qty;
          updateData.quantity = targetProduct.quantity + qty;
        } else {
          updateData.quantity = targetProduct.quantity + qty;
        }
        
        await tx.product.update({
          where: { id: targetProduct.id },
          data: updateData
        });
        
        await tx.inventoryHistory.create({
          data: {
            productId: targetProduct.id,
            action: "EXPORT",
            quantity: 0,
            note: `Sản xuất: Chiết xuất nguyên liệu xá: -${requiredMl}ml`,
            bulkLiters: -requiredLiters
          }
        });
        
        await tx.inventoryHistory.create({
          data: {
            productId: targetProduct.id,
            action: "IMPORT",
            quantity: qty,
            note: `Sản xuất: Đóng chai +${qty} chai ${bottleSize}ml`,
            bottles300: bottleSize === 300 ? qty : null,
            bottles500: bottleSize === 500 ? qty : null
          }
        });
      });
      
      const reply = `Kho nguyên liệu:\n${fmtName} -${requiredMl}ml\n\nKho thành phẩm:\n${fmtName} ${bottleSize}ml +${qty} chai` +
        "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";
      
      const resp = {
        success: true,
        reply,
        data: [{ action: "PRODUCTION", product: fmtName, quantity: qty, volume: bottleSize }],
        action: "PRODUCTION"
      };
      
      await prisma.chatHistory.create({
        data: { message, response: JSON.stringify(resp) }
      });
      return res.json(resp);
    }
    
    if (command.isSales) {
      if (!matchedProduct) {
        return res.status(404).json({ success: false, reply: `❌ Không tìm thấy sản phẩm '${targetName}' trong hệ thống.` });
      }
      
      let bottleSize = command.volumeMl;
      let qty = command.quantity || 1;
      if (!bottleSize) {
        bottleSize = 300;
        if (command.quantity !== null) {
          qty = Math.max(1, Math.floor(command.quantity / 3));
        }
      }
      const fmtName = formatProductName(matchedProduct.name);
      
      let availableQty = 0;
      if (bottleSize === 300) availableQty = matchedProduct.bottles300;
      else if (bottleSize === 500) availableQty = matchedProduct.bottles500;
      else availableQty = matchedProduct.quantity;
      
      if (availableQty < qty) {
        const reply = `❌ Không đủ hàng trong kho để xuất bán. Hiện tại chỉ còn ${availableQty} chai ${bottleSize}ml.` +
          "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";
        const resp = { success: false, reply, data: [{ error: "Insufficient stock" }], action: "SALES" };
        await prisma.chatHistory.create({ data: { message, response: JSON.stringify(resp) } });
        return res.json(resp);
      }
      
      await prisma.$transaction(async (tx) => {
        let updateData = {};
        if (bottleSize === 300) {
          updateData = {
            bottles300: matchedProduct.bottles300 - qty,
            quantity: matchedProduct.quantity - qty
          };
        } else if (bottleSize === 500) {
          updateData = {
            bottles500: matchedProduct.bottles500 - qty,
            quantity: matchedProduct.quantity - qty
          };
        } else {
          updateData = {
            quantity: matchedProduct.quantity - qty
          };
        }
        
        await tx.product.update({
          where: { id: matchedProduct.id },
          data: updateData
        });
        
        await tx.inventoryHistory.create({
          data: {
            productId: matchedProduct.id,
            action: "EXPORT",
            quantity: qty,
            sellPrice: matchedProduct.sellPrice,
            note: `Bán hàng: -${qty} chai ${bottleSize}ml`,
            bottles300: bottleSize === 300 ? qty : null,
            bottles500: bottleSize === 500 ? qty : null
          }
        });
      });
      
      const reply = `Kho thành phẩm:\n${fmtName} ${bottleSize}ml -${qty} chai` +
        "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";
      
      const resp = {
        success: true,
        reply,
        data: [{ action: "SALES", product: fmtName, quantity: qty, volume: bottleSize }],
        action: "SALES"
      };
      
      await prisma.chatHistory.create({
        data: { message, response: JSON.stringify(resp) }
      });
      return res.json(resp);
    }
    
    if (command.isReceive && isRaw) {
      const volumeMl = command.volumeMl;
      const volumeLiters = volumeMl / 1000;
      
      let finalProduct = matchedProduct;
      
      await prisma.$transaction(async (tx) => {
        if (!finalProduct) {
          finalProduct = await tx.product.create({
            data: {
              name: formatProductName(command.productName),
              category: "Raw Material",
              volume: "Bulk",
              importPrice: command.price || 0,
              sellPrice: 0,
              quantity: 0,
              bulkLiters: volumeLiters
            }
          });
        } else {
          finalProduct = await tx.product.update({
            where: { id: finalProduct.id },
            data: {
              bulkLiters: finalProduct.bulkLiters + volumeLiters
            }
          });
        }
        
        await tx.inventoryHistory.create({
          data: {
            productId: finalProduct.id,
            action: "IMPORT",
            quantity: 0,
            importPrice: command.price,
            note: `Nhập kho nguyên liệu xá: +${volumeMl}ml`,
            bulkLiters: volumeLiters
          }
        });
      });
      
      const fmtName = formatProductName(finalProduct.name);
      const reply = `Nguyên liệu: ${fmtName} +${volumeMl}ml` +
        "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";
      
      const resp = {
        success: true,
        reply,
        data: [{ action: "IMPORT_RAW", product: fmtName, volumeMl, price: command.price }],
        action: "IMPORT"
      };
      
      await prisma.chatHistory.create({
        data: { message, response: JSON.stringify(resp) }
      });
      return res.json(resp);
    }
    
    if (command.isReceive && isFinished) {
      if (!matchedProduct) {
        return res.status(404).json({ success: false, reply: `❌ Không tìm thấy sản phẩm '${targetName}' trong hệ thống để nhập kho.` });
      }
      
      let bottleSize = command.volumeMl;
      let qty = command.quantity || 1;
      if (!bottleSize) {
        bottleSize = 300;
        if (command.quantity !== null) {
          qty = Math.max(1, Math.floor(command.quantity / 3));
        }
      }
      const fmtName = formatProductName(matchedProduct.name);
      
      await prisma.$transaction(async (tx) => {
        let updateData = {};
        if (bottleSize === 300) {
          updateData = {
            bottles300: matchedProduct.bottles300 + qty,
            quantity: matchedProduct.quantity + qty
          };
        } else if (bottleSize === 500) {
          updateData = {
            bottles500: matchedProduct.bottles500 + qty,
            quantity: matchedProduct.quantity + qty
          };
        } else {
          updateData = {
            quantity: matchedProduct.quantity + qty
          };
        }
        
        await tx.product.update({
          where: { id: matchedProduct.id },
          data: updateData
        });
        
        await tx.inventoryHistory.create({
          data: {
            productId: matchedProduct.id,
            action: "IMPORT",
            quantity: qty,
            importPrice: command.price || matchedProduct.importPrice,
            note: `Nhập kho đóng chai: +${qty} chai ${bottleSize}ml`,
            bottles300: bottleSize === 300 ? qty : null,
            bottles500: bottleSize === 500 ? qty : null
          }
        });
      });
      
      const reply = `Kho thành phẩm:\n${fmtName} ${bottleSize}ml +${qty} chai` +
        "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";
      
      const resp = {
        success: true,
        reply,
        data: [{ action: "IMPORT_FINISHED", product: fmtName, quantity: qty, volume: bottleSize }],
        action: "IMPORT"
      };
      
      await prisma.chatHistory.create({
        data: { message, response: JSON.stringify(resp) }
      });
      return res.json(resp);
    }
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
      `- 📕 [Tải báo cáo PDF](/api/export/pdf)` +
      "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";

    const resp = {
      success: true,
      reply: reply,
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
    reply += "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";

    const resp = {
      success: true,
      reply: reply,
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
        const candidates = products.filter(dbP => {
          const nameMatch = normalize(dbP.name).includes(normalize(p.name)) || normalize(p.name).includes(normalize(dbP.name));
          return nameMatch;
        });

        if (candidates.length > 0) {
          const exactMatch = candidates.find(dbP => {
            const dbVolMatch = (dbP.volume || "").match(/(\d+)\s*ml/i);
            const dbVol = dbVolMatch ? parseInt(dbVolMatch[1]) : 0;
            return dbVol === queryVolumeMl;
          });

          if (exactMatch) {
            prod = exactMatch;
            if (qty === null) qty = 1;
          } else {
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

    if (!prod) {
      prod = findBestProduct(p.name, products);
      if (prod && qty === null) {
        qty = 1;
      }
    }

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

      const importPriceVal = p.price || 30000;
      const sellPriceVal = p.price ? p.price * 2 : 60000;
      
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

    if (!prod) {
      results.push({
        product: p.name || "sản phẩm",
        error: "Không tìm thấy sản phẩm trong danh sách kho",
      });
      continue;
    }

    const isShampoo = prod.category === "Dầu gội";
    let format = null;
    let actualQty = qty;
    
    if (isShampoo) {
      const detectRes = detectShampooFormat(p.raw);
      format = detectRes.format;
      if (detectRes.qty !== null) {
        actualQty = detectRes.qty;
      }
    }

    if (p.action === "IMPORT") {
      if (!actualQty) {
        results.push({
          product: prod.name,
          error: `Số lượng nhập không hợp lệ. Ví dụ: 'nhập ${prod.name} 10 cái'`,
        });
        continue;
      }

      let updateData = {};
      let price = p.price || null;
      let bottles300Delta = 0;
      let bottles500Delta = 0;
      let bulkLitersDelta = 0;
      let histQty = actualQty;

      if (isShampoo && format) {
        if (format === "300ml") {
          bottles300Delta = actualQty;
          updateData = {
            bottles300: prod.bottles300 + actualQty,
            quantity: prod.quantity + actualQty,
          };
          price = price || prod.importPrice300 || prod.importPrice;
        } else if (format === "500ml") {
          bottles500Delta = actualQty;
          updateData = {
            bottles500: prod.bottles500 + actualQty,
            quantity: prod.quantity + actualQty,
          };
          price = price || prod.importPrice500 || prod.importPrice;
        } else if (format === "bulk") {
          bulkLitersDelta = actualQty;
          updateData = {
            bulkLiters: prod.bulkLiters + actualQty,
          };
          price = price || prod.importPriceBulk || prod.importPrice;
          histQty = 0;
        }
      } else {
        updateData = { quantity: prod.quantity + actualQty };
        price = price || prod.importPrice;
      }

      await prisma.product.update({
        where: { id: prod.id },
        data: updateData,
      });

      const noteText = isShampoo && format
        ? `Nhập kho dầu gội bằng AI Assistant (${format === 'bulk' ? actualQty + ' L hàng xá' : '+' + actualQty + ' chai ' + format})`
        : `Nhập kho tự động bằng AI Assistant: +${actualQty} cái`;

      await prisma.inventoryHistory.create({
        data: {
          productId: prod.id,
          action: "IMPORT",
          quantity: histQty,
          importPrice: price,
          userId: req.user?.id,
          note: noteText,
          bottles300: bottles300Delta > 0 ? bottles300Delta : null,
          bottles500: bottles500Delta > 0 ? bottles500Delta : null,
          bulkLiters: bulkLitersDelta > 0 ? bulkLitersDelta : null,
        },
      });

      results.push({ product: prod.name, quantity: actualQty, action: "IMPORT", price: price, isShampoo, format });
    } else if (p.action === "EXPORT") {
      if (!actualQty) {
        results.push({
          product: prod.name,
          error: `Số lượng xuất không hợp lệ. Ví dụ: 'xuất ${prod.name} 5 cái'`,
        });
        continue;
      }

      let updateData = {};
      let price = p.price || null;
      let bottles300Delta = 0;
      let bottles500Delta = 0;
      let bulkLitersDelta = 0;
      let histQty = actualQty;

      if (isShampoo && format) {
        if (format === "300ml") {
          if (prod.bottles300 < actualQty) {
            results.push({ product: prod.name, error: `Không đủ hàng xuất kho. Hiện tại chỉ còn ${prod.bottles300} chai 300ml.` });
            continue;
          }
          bottles300Delta = actualQty;
          updateData = {
            bottles300: prod.bottles300 - actualQty,
            quantity: prod.quantity - actualQty,
          };
          price = price || prod.sellPrice300 || prod.sellPrice;
        } else if (format === "500ml") {
          if (prod.bottles500 < actualQty) {
            results.push({ product: prod.name, error: `Không đủ hàng xuất kho. Hiện tại chỉ còn ${prod.bottles500} chai 500ml.` });
            continue;
          }
          bottles500Delta = actualQty;
          updateData = {
            bottles500: prod.bottles500 - actualQty,
            quantity: prod.quantity - actualQty,
          };
          price = price || prod.sellPrice500 || prod.sellPrice;
        } else if (format === "bulk") {
          if (prod.bulkLiters < actualQty) {
            results.push({ product: prod.name, error: `Không đủ hàng xuất kho. Hiện tại chỉ còn ${prod.bulkLiters} L hàng xá.` });
            continue;
          }
          bulkLitersDelta = actualQty;
          updateData = {
            bulkLiters: prod.bulkLiters - actualQty,
          };
          price = price || prod.sellPriceBulk || prod.sellPrice;
          histQty = 0;
        }
      } else {
        if (prod.quantity < actualQty) {
          results.push({
            product: prod.name,
            quantity: actualQty,
            error: `Không đủ hàng xuất kho. Hiện tại chỉ còn ${prod.quantity} cái trong kho.`,
          });
          continue;
        }
        updateData = { quantity: prod.quantity - actualQty };
        price = price || prod.sellPrice;
      }

      await prisma.product.update({
        where: { id: prod.id },
        data: updateData,
      });

      const noteText = isShampoo && format
        ? `Xuất kho dầu gội bằng AI Assistant (${format === 'bulk' ? actualQty + ' L hàng xá' : '-' + actualQty + ' chai ' + format})`
        : `Xuất kho tự động bằng AI Assistant: -${actualQty} cái`;

      await prisma.inventoryHistory.create({
        data: {
          productId: prod.id,
          action: "EXPORT",
          quantity: histQty,
          sellPrice: price,
          userId: req.user?.id,
          note: noteText,
          bottles300: bottles300Delta > 0 ? bottles300Delta : null,
          bottles500: bottles500Delta > 0 ? bottles500Delta : null,
          bulkLiters: bulkLitersDelta > 0 ? bulkLitersDelta : null,
        },
      });

      results.push({ product: prod.name, quantity: actualQty, action: "EXPORT", price: price, isShampoo, format });
    } else {
      results.push({
        product: prod.name,
        quantity: prod.quantity,
        bottles300: prod.bottles300,
        bottles500: prod.bottles500,
        bulkLiters: prod.bulkLiters,
        isShampoo,
        importPrice: prod.importPrice,
        sellPrice: prod.sellPrice,
        action: "QUERY",
      });
    }
  }

  const reply = generateResponse(results, globalAction) +
    "\n\n💡 *Tip: Hãy cấu hình GEMINI_API_KEY trong file .env để trợ lý tự động xử lý kho hàng thông minh hơn.*";

  const resp = {
    success: results.some((r) => !r.error),
    reply: reply,
    data: results,
    action: globalAction,
  };

  await prisma.chatHistory.create({
    data: { message, response: JSON.stringify(resp) },
  });

  res.json(resp);
};

// Main chat function
const chat = async (req, res) => {
  const { message, file } = req.body;
  if ((!message || !message.trim()) && !file) {
    return res.status(400).json({ success: false, reply: "Vui lòng nhập tin nhắn hoặc tải lên tệp tin." });
  }

  // Fetch previous product context from ChatHistory
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

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const products = await prisma.product.findMany();
      const totalInventory = products.reduce((sum, p) => sum + p.quantity, 0);
      const lowStockProducts = products.filter(p => p.quantity <= 10);
      
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

      // Load last 6 messages (3 turns) for context
      const lastChats = await prisma.chatHistory.findMany({
        orderBy: { id: "desc" },
        take: 6
      });
      
      const chatContext = lastChats.reverse().map(h => {
        let reply = "";
        try {
          const respObj = JSON.parse(h.response);
          reply = respObj.reply || h.response;
        } catch (e) {
          reply = h.response;
        }
        return { user: h.message, assistant: reply };
      });

      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiApiKey);

      const systemInstruction = `
Bạn là Trợ lý AI Quản lý Kho hàng thông minh của Sen Natural (hệ thống chuyên cung cấp sản phẩm thảo mộc tự nhiên như dầu gội bồ kết, dầu gội bưởi, chất chiết, v.v.).
Nhiệm vụ của bạn là:
1. Hỗ trợ người dùng quản lý kho hàng: nhập kho, xuất bán, sản xuất đóng chai từ nguyên liệu xá (bulk), cập nhật giá nhập/bán, thêm sản phẩm mới hoặc xóa sản phẩm.
2. Trả lời các câu hỏi về thông tin tồn kho, báo cáo doanh thu, phân tích sản phẩm, cảnh báo hàng sắp hết và tư vấn/dự báo nhập kho dựa trên dữ liệu thực tế được cung cấp.
3. Luôn trả về dữ liệu dưới dạng JSON có cấu trúc chính xác theo schema quy định. KHÔNG trả về bất kỳ từ ngữ nào ngoài JSON.
4. Trả lời cực kỳ ngắn gọn, đi thẳng vào vấn đề. Tránh lời chào hỏi rườm rà, lặp lại và giải thích dài dòng không cần thiết để tiết kiệm tối đa token. Tuyệt đối KHÔNG sử dụng dấu sao bôi đậm '**' hay bất cứ định dạng bôi đậm nào trong câu trả lời, hãy dùng chữ IN HOA để làm nổi bật thông số nếu cần.

Dưới đây là Danh sách sản phẩm hiện tại trong cơ sở dữ liệu (sử dụng productId từ đây):
${JSON.stringify(products.map(p => ({
  id: p.id,
  name: p.name,
  category: p.category,
  volume: p.volume,
  quantity: p.quantity,
  importPrice: p.importPrice,
  sellPrice: p.sellPrice,
  bottles300: p.bottles300,
  bottles500: p.bottles500,
  bulkLiters: p.bulkLiters
})))}

Số liệu thống kê kho hàng hiện tại:
- Tổng số lượng tồn kho (thành phẩm): ${totalInventory} cái/chai
- Sản phẩm sắp hết hàng (tồn <= 10): ${JSON.stringify(lowStockProducts.map(p => ({ id: p.id, name: p.name, quantity: p.quantity })))}
- Doanh thu tháng này: ${monthlyRev.toLocaleString('vi-VN')}đ (Lợi nhuận dự tính: ${monthlyProfit.toLocaleString('vi-VN')}đ)
- Thời gian hệ thống hiện tại: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}

Cú pháp lệnh đặc biệt của hệ thống (suy luận từ tin nhắn người dùng):
1. NHẬP KHO (IMPORT): Thêm số lượng sản phẩm.
   - Nếu là dầu gội, cần xác định dung tích (300ml, 500ml) hoặc hàng xá (bulk - đơn vị Lít).
2. XUẤT KHO (EXPORT): Xuất bán hàng hoặc giảm kho.
   - Kiểm tra xem số lượng tồn kho có đủ không trước khi tạo action.
3. SẢN XUẤT (PRODUCTION): Chuyển đổi từ dầu gội hàng xá (bulk, đơn vị Lít) sang chai thành phẩm (300ml hoặc 500ml).
   - Ví dụ: "sản xuất 10 chai bồ kết 300ml" nghĩa là: giảm bulkLiters của sản phẩm Bồ Kết đi 10 * 0.3 = 3 Lít, đồng thời tăng bottles300 thêm 10 chai.
   - Cần kiểm tra xem bulkLiters của sản phẩm đó có đủ hay không. Nếu không đủ, ghi nhận lỗi và giải thích trong directReply.
4. CẬP NHẬT GIÁ (PRICE_UPDATE): Thay đổi giá nhập (importPrice) hoặc giá bán (sellPrice).
5. TẠO MỚI SẢN PHẨM (CREATE_PRODUCT): Thêm sản phẩm mới hoàn toàn.
6. XÓA SẢN PHẨM (DELETE_PRODUCT): Xóa sản phẩm khỏi hệ thống.
7. TRA CỨU VẬN ĐƠN (TRACK_WAYBILL): Tra cứu lịch trình vận chuyển khi người dùng cung cấp mã vận đơn (trackingNumber, ví dụ: "SPXVN061416100466") của nhà vận chuyển (carrier, mặc định "SPX Express" nếu không nói rõ).

QUY TẮC PHÂN TÍCH:
- Hãy đối chiếu tên sản phẩm người dùng viết (có thể viết tắt, không dấu, ví dụ: "dau goi bo ket", "bokat", "bo", "gung", "xit") với danh sách sản phẩm thực tế để lấy đúng productId.
- Các viết tắt thông dụng: "bo" / "bo ket" -> Bồ Kết, "gung" -> Ginger, "xit" -> Xịt tóc, "u" -> Ủ tóc, "dau goi" -> Dầu gội, "k" -> 1.000đ, "triệu" -> 1.000.000đ.
- Nếu người dùng cung cấp mã vận đơn (như SPXVN061416100466) trực tiếp bằng chữ, hoặc nếu người dùng tải lên hình ảnh / tệp PDF / gửi link PDF chứa mã vận đơn, hãy phân tích kỹ nội dung tệp/hình ảnh để tìm mã vận đơn đó. Khi phát hiện mã vận đơn, hãy suy luận hành động TRACK_WAYBILL và trích xuất đúng trackingNumber và carrier.
- Nếu người dùng chỉ hỏi han, chào hỏi hoặc yêu cầu báo cáo/dự báo phân tích mà không thay đổi cơ sở dữ liệu, hãy để danh sách "actions" trống và trả lời trực tiếp trong "directReply".
- Cố gắng diễn đạt thân thiện, rõ ràng, sử dụng các ký hiệu emoji để giao diện sinh động.

Yêu cầu định dạng JSON đầu ra (phải là JSON hợp lệ):
{
  "explanation": "Giải thích ngắn gọn lập luận",
  "action": "IMPORT" | "EXPORT" | "PRODUCTION" | "CREATE_PRODUCT" | "DELETE_PRODUCT" | "PRICE_UPDATE" | "TRACK_WAYBILL" | "REPORT" | "PREDICT" | "NONE",
  "actions": [
    {
      "type": "IMPORT" | "EXPORT" | "PRODUCTION" | "CREATE_PRODUCT" | "DELETE_PRODUCT" | "PRICE_UPDATE" | "TRACK_WAYBILL",
      "productId": 12, // Cho sản phẩm
      "trackingNumber": "SPXVN061416100466", // Bắt buộc cho TRACK_WAYBILL
      "carrier": "SPX Express", // Cho TRACK_WAYBILL
      "productName": "Tên sản phẩm mới hoặc tên khớp",
      "quantity": 10, // số lượng (áp dụng cho chai/cái)
      "format": "300ml" | "500ml" | "bulk" | null, // Định dạng chai hoặc hàng xá bulk
      "price": 85000, // Giá tiền (nếu có cập nhật hoặc nhập với giá mới)
      "priceField": "importPrice" | "sellPrice", // Cho PRICE_UPDATE
      "volume": "300ml" | "500ml" | "Bulk", // e.g. "300ml" cho sản phẩm mới
      "category": "Dầu gội" | "Dầu xả" | "Chăm sóc" | "Nguyên liệu", // Cho CREATE_PRODUCT
      "note": "Mô tả ngắn gọn về hành động này"
    }
  ],
  "directReply": "Nội dung phản hồi chi tiết bằng tiếng Việt gửi tới người dùng. Hỗ trợ định dạng markdown (danh sách dòng, bảng biểu, emoji) để làm nổi bật thông số. Tuyệt đối KHÔNG dùng dấu sao bôi đậm '**' hay bất cứ định dạng bôi đậm nào khác để tối ưu hóa lượng token sử dụng, hãy viết chữ thường/hoa bình thường hoặc viết IN HOA khi cần làm nổi bật."
}
`;

      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      // Check for file object in request or download link from message
      let fileObj = null;
      if (file && file.data && file.mimeType) {
        fileObj = {
          data: file.data, // base64 string
          mimeType: file.mimeType
        };
      } else if (message) {
        // Look for PDF or image URLs in the message text
        const mediaUrlRegex = /(https?:\/\/[^\s]+(?:\.pdf|\.png|\.jpe?g|\.webp))/i;
        const match = message.match(mediaUrlRegex);
        if (match) {
          const fileUrl = match[1];
          try {
            console.log(`Downloading media from link: ${fileUrl}`);
            const fetchRes = await fetch(fileUrl);
            if (fetchRes.ok) {
              const buffer = await fetchRes.arrayBuffer();
              const base64Data = Buffer.from(buffer).toString("base64");
              let mimeType = "application/pdf";
              if (fileUrl.toLowerCase().endsWith(".png")) mimeType = "image/png";
              else if (fileUrl.toLowerCase().endsWith(".jpg") || fileUrl.toLowerCase().endsWith(".jpeg")) mimeType = "image/jpeg";
              else if (fileUrl.toLowerCase().endsWith(".webp")) mimeType = "image/webp";
              
              fileObj = {
                data: base64Data,
                mimeType: mimeType
              };
              console.log("Downloaded file successfully, mimeType:", mimeType);
            }
          } catch (e) {
            console.error("Error downloading file from link:", e);
          }
        }
      }

      const prompt = `
Lịch sử chat gần đây:
${chatContext.map(c => `User: ${c.user}\nAssistant: ${c.assistant}`).join("\n\n")}

Tin nhắn mới của người dùng: "${message || 'Xem tệp đính kèm'}"

Hãy xử lý tin nhắn mới này và xuất ra JSON theo đúng định dạng được chỉ định ở system instruction.
`;

      const parts = [{ text: prompt }];
      if (fileObj) {
        parts.push({
          inlineData: {
            data: fileObj.data,
            mimeType: fileObj.mimeType
          }
        });
      }

      const chatResult = await model.generateContent(parts);
      
      const responseText = chatResult.response.text();
      let geminiResponse;
      try {
        geminiResponse = JSON.parse(responseText);
      } catch (err) {
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        geminiResponse = JSON.parse(cleanedText);
      }

      // Execute actions
      let executionResults = [];
      if (geminiResponse.actions && geminiResponse.actions.length > 0) {
        executionResults = await executeActions(geminiResponse.actions, req.user);
      }

      // Construct final reply
      let finalReply = geminiResponse.directReply || "";
      if (executionResults.length > 0) {
        const successList = executionResults.filter(r => r.success);
        const errorList = executionResults.filter(r => r.error);
        
        let resultSummary = "\n\n### ⚙️ Cập nhật hệ thống:\n";
        let hasTrack = false;
        let trackInfoText = "";

        if (successList.length > 0) {
          successList.forEach(r => {
            if (r.action === "IMPORT") {
              const fmtLabel = r.format === "bulk" ? "Lít hàng xá" : `chai ${r.format || ''}`;
              resultSummary += `- ✅ **Nhập kho:** +${r.quantity} ${fmtLabel} **${r.product}** thành công.\n`;
            } else if (r.action === "EXPORT") {
              const fmtLabel = r.format === "bulk" ? "Lít hàng xá" : `chai ${r.format || ''}`;
              resultSummary += `- ✅ **Xuất kho:** -${r.quantity} ${fmtLabel} **${r.product}** thành công.\n`;
            } else if (r.action === "PRODUCTION") {
              resultSummary += `- ✅ **Sản xuất:** Đóng chai thành công **${r.quantity}** chai **${r.format}** **${r.product}** từ nguyên liệu xá.\n`;
            } else if (r.action === "CREATE_PRODUCT") {
              resultSummary += `- ✅ **Thêm mới:** Sản phẩm **${r.product}** (${r.volume}) đã được tạo.\n`;
            } else if (r.action === "DELETE_PRODUCT") {
              resultSummary += `- ✅ **Xóa:** Sản phẩm **${r.product}** đã được gỡ khỏi hệ thống.\n`;
            } else if (r.action === "PRICE_UPDATE") {
              resultSummary += `- ✅ **Cập nhật giá:** Cập nhật ${r.priceField === 'importPrice' ? 'giá nhập' : 'giá bán'} của **${r.product}** thành **${r.price.toLocaleString('vi-VN')}đ**.\n`;
            } else if (r.action === "TRACK_WAYBILL") {
              hasTrack = true;
              trackInfoText = `📦 MÃ VẬN ĐƠN ${r.carrier.toUpperCase()}: ${r.trackingNumber}\n🚚 TRẠNG THÁI: ${r.status.toUpperCase()}\n`;
              if (r.latestEvent) {
                trackInfoText += `⏰ MỐC THỜI GIAN MỚI NHẤT: ${r.latestEvent}\n`;
              }
              if (r.shippingAddress) {
                trackInfoText += `📍 VỊ TRÍ/DỰ KIẾN: ${r.shippingAddress}\n`;
              }
              trackInfoText += `\n🔄 Đã đồng bộ thông tin vận đơn này vào trang quản lý Vận đơn trên hệ thống.`;
            }
          });
        }
        if (errorList.length > 0) {
          errorList.forEach(r => {
            resultSummary += `- ⚠️ **Lỗi:** ${r.error}\n`;
          });
        }
        
        if (hasTrack) {
          finalReply = trackInfoText;
          if (errorList.length > 0) {
            finalReply += "\n\n### ⚙️ Lỗi hệ thống:\n" + errorList.map(r => `- ⚠️ **Lỗi:** ${r.error}`).join("\n");
          }
        } else {
          finalReply += resultSummary;
        }
      }

      const finalAction = geminiResponse.action || "NONE";
      const resp = {
        success: executionResults.length > 0 ? executionResults.some(r => r.success) : true,
        reply: finalReply,
        data: executionResults.length > 0 ? executionResults : [{ action: finalAction, summary: geminiResponse.explanation }],
        action: finalAction
      };

      await prisma.chatHistory.create({
        data: { message, response: JSON.stringify(resp) }
      });

      return res.json(resp);

    } catch (e) {
      console.error("Gemini Assistant processing failed, falling back to rules:", e);
    }
  }

  // Fallback to rules-based chatbot
  return fallbackRulesChat(req, res, message, prevProduct);
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
        replyText = respObj.reply || h.response;
      } catch (e) {
        replyText = h.response;
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
