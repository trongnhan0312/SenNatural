const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const prisma = require("../prismaClient");
const dayjs = require("dayjs");
const path = require("path");

const exportExcel = async (req, res) => {
  const data = await prisma.inventoryHistory.findMany({
    include: { product: true, user: true },
    orderBy: { createdAt: "desc" },
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inventory");
  // header style
  ws.columns = [
    { header: "Ngày", key: "date", width: 20 },
    { header: "Sản phẩm", key: "product", width: 30 },
    { header: "Loại", key: "action", width: 10 },
    { header: "Số lượng", key: "quantity", width: 12 },
    { header: "Giá nhập", key: "importPrice", width: 12 },
    { header: "Giá bán", key: "sellPrice", width: 12 },
    { header: "Người thực hiện", key: "user", width: 20 },
    { header: "Ghi chú", key: "note", width: 30 },
  ];
  // header color and style
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F5132" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 18;
  // add border to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  data.forEach((d) => {
    const qtyVal = d.bulkLiters ? `${d.bulkLiters} L` : d.quantity;
    const row = ws.addRow({
      date: dayjs(d.createdAt).format("YYYY-MM-DD HH:mm"),
      product: d.product.name,
      action: d.action,
      quantity: qtyVal,
      importPrice: d.importPrice || "",
      sellPrice: d.sellPrice || "",
      user: d.user?.fullName || "",
      note: d.note || "",
    });
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Inventory_Report_${dayjs().format("YYYYMMDD")}.xlsx`,
  );
  await wb.xlsx.write(res);
  res.end();
};

const exportPDF = async (req, res) => {
  const data = await prisma.inventoryHistory.findMany({
    include: { product: true, user: true },
    orderBy: { createdAt: "desc" },
  });
  const doc = new PDFDocument({ margin: 40 });
  const filename = `Inventory_Report_${dayjs().format("YYYYMMDD")}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  
  // Register Vietnamese fonts
  try {
    const arialPath = path.join(__dirname, "../fonts/Arial.ttf");
    const arialBoldPath = path.join(__dirname, "../fonts/Arialbd.ttf");
    doc.registerFont("Arial", arialPath);
    doc.registerFont("Arial-Bold", arialBoldPath);
    doc.font("Arial");
  } catch (err) {
    console.error("Font registration failed, using defaults:", err);
  }

  try {
    // prefer PNG
    const logoPng = path.join(__dirname, "../../logo.png");
    const fs = require("fs");
    if (fs.existsSync(logoPng)) {
      doc.image(logoPng, 40, 30, {
        width: 80,
        height: 40,
        align: "left",
      });
    }
  } catch (e) {
    /* ignore missing logo */
  }

  doc.font("Arial-Bold").fontSize(18).fillColor("#0f5132").text("BÁO CÁO NHẬP XUẤT KHO", 140, 40);
  doc.font("Arial").fontSize(10).fillColor("#666").text("Sen Natural - Hệ Thống Quản Lý Tồn Kho Tự Động", 140, 60);
  doc.moveDown(2);

  // draw header row helper
  const drawHeader = (yPos) => {
    doc.font("Arial-Bold").fontSize(9).fillColor("#0f5132");
    doc.text("Ngày", 40, yPos, { width: 80 });
    doc.text("Sản phẩm", 120, yPos, { width: 140 });
    doc.text("Giao dịch", 260, yPos, { width: 60 });
    doc.text("Số lượng", 320, yPos, { width: 50, align: "right" });
    doc.text("Giá nhập", 370, yPos, { width: 65, align: "right" });
    doc.text("Giá bán", 440, yPos, { width: 65, align: "right" });
    doc.text("Người thực hiện", 510, yPos, { width: 62 });
    doc.moveTo(40, yPos + 15).lineTo(572, yPos + 15).strokeColor("#0f5132").lineWidth(1).stroke();
  };

  let y = 95;
  drawHeader(y);
  y += 25;

  doc.font("Arial").fontSize(8).fillColor("#333");
  data.forEach((d) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
      drawHeader(y);
      y += 25;
      doc.font("Arial").fontSize(8).fillColor("#333");
    }

    doc.text(dayjs(d.createdAt).format("YYYY-MM-DD HH:mm"), 40, y, { width: 80 });
    doc.text(d.product.name, 120, y, { width: 140 });
    
    // translate action to Vietnamese
    const actionText = d.action === "IMPORT" ? "Nhập kho" : "Xuất kho";
    doc.text(actionText, 260, y, { width: 60 });
    const qtyText = d.bulkLiters ? `${d.bulkLiters} L` : String(d.quantity);
    doc.text(qtyText, 320, y, { width: 50, align: "right" });
    doc.text(d.importPrice ? d.importPrice.toLocaleString("vi-VN") + "đ" : "-", 370, y, { width: 65, align: "right" });
    doc.text(d.sellPrice ? d.sellPrice.toLocaleString("vi-VN") + "đ" : "-", 440, y, { width: 65, align: "right" });
    doc.text(d.user?.fullName || "-", 510, y, { width: 62 });

    // thin separator line
    doc.moveTo(40, y + 12).lineTo(572, y + 12).strokeColor("#eee").lineWidth(0.5).stroke();
    y += 18;
  });

  doc.moveDown(2);
  doc.font("Arial").fontSize(8).fillColor("#999").text("Báo cáo được tạo tự động bởi Sen Natural ERP - " + dayjs().format("YYYY-MM-DD HH:mm"), { align: "center" });
  doc.pipe(res);
  doc.end();
};

module.exports = { exportExcel, exportPDF };
