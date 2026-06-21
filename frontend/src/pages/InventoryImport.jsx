import React from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { PackagePlus, Info, CheckCircle2 } from "lucide-react";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

export default function InventoryImport() {
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState(0);
  const [importPrice, setImportPrice] = React.useState("");
  const [format, setFormat] = React.useState("300ml");
  const [products, setProducts] = React.useState([]);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetch();
  }, []);

  const fetch = async () => {
    try {
      const res = await axios.get(api("/products"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setProducts(res.data.data);
      if (res.data.data[0]) {
        setProductId(res.data.data[0].id);
        setFormat(res.data.data[0].category === "Dầu gội" ? "300ml" : "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProductChange = (id) => {
    setProductId(id);
    const prod = products.find(p => p.id === Number(id));
    if (prod) {
      setFormat(prod.category === "Dầu gội" ? "300ml" : "");
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    setStatus("");
    setError("");
    try {
      await axios.post(
        api("/inventory/import"),
        { productId, quantity, importPrice, format: format || null },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      setStatus("Ghi nhận đơn hàng nhập kho thành công!");
      setQuantity(0);
      setImportPrice("");
      await fetch();
    } catch (err) {
      setError(err.response?.data?.message || "Nhập kho thất bại. Vui lòng thử lại.");
    }
  };

  const selectedProd = products.find(p => p.id === Number(productId));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Nhập kho</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Ghi nhận nhập hàng</h1>
            <p className="mt-2 text-sm text-slate-600">Thực hiện nhập bổ sung sản phẩm vào kho hệ thống.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-primaryLight/50 px-4 py-2 text-primary text-sm font-semibold">
            <PackagePlus size={16} /> Danh mục sản phẩm: {products.length}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Instruction guide */}
        <div className="rounded-[32px] border border-white/30 bg-white/50 p-6 shadow-soft backdrop-blur-md">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Info size={18} className="text-primary" /> Hướng dẫn nhanh
          </h2>
          <p className="mt-2 text-sm text-slate-600">Điền thông tin giao dịch để hệ thống lưu vết lịch sử nhập xuất.</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/30 bg-white/30 p-4">
              <p className="text-xs font-bold text-slate-700 uppercase">1. Chọn loại sản phẩm</p>
              <p className="mt-1 text-xs text-slate-500">Tìm kiếm chính xác tên sản phẩm và quy cách đóng gói cần nhập.</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/30 p-4">
              <p className="text-xs font-bold text-slate-700 uppercase">2. Số lượng & Giá nhập</p>
              <p className="mt-1 text-xs text-slate-500">Nhập đúng số lượng thực tế. Nếu giá nhập có thay đổi so với giá mặc định, hãy cập nhật giá mới.</p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
          <h2 className="text-lg font-bold text-slate-800">Thông tin chi tiết phiếu nhập</h2>
          <p className="text-xs text-slate-500">Các trường thông tin bắt buộc.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Chọn sản phẩm</label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                {products.map((p) => {
                  const isShampoo = p.category === "Dầu gội";
                  const isRaw = p.category === "Raw Material";
                  return (
                    <option key={p.id} value={p.id}>
                      {isShampoo
                        ? `${p.name} (300ml: ${p.bottles300} chai | 500ml: ${p.bottles500} chai | Xá: ${p.bulkLiters} L)`
                        : isRaw
                        ? `${p.name} (Nguyên liệu xá) - Hiện có: ${p.bulkLiters} L`
                        : `${p.name} (${p.volume}) - Hiện có: ${p.quantity} cái`}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedProd?.category === "Dầu gội" && (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Quy cách đóng gói nhập</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="300ml">Chai 300ml</option>
                  <option value="500ml">Chai 500ml</option>
                  <option value="bulk">Hàng xá (Lít)</option>
                </select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  {format === "bulk" ? "Số lượng nhập (Lít)" : "Số lượng nhập (Cái/Chai)"}
                </label>
                <input
                  type="number"
                  step={format === "bulk" ? "0.1" : "1"}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  required
                  min={format === "bulk" ? "0.1" : "1"}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Giá nhập thực tế (đ)</label>
                <input
                  type="number"
                  value={importPrice}
                  onChange={(e) => setImportPrice(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="Để trống để dùng giá cũ"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center rounded-2xl mt-2">
              Xác nhận nhập kho
            </button>

            {status && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mt-2">
                {status}
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-2">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </motion.div>
  );
}
