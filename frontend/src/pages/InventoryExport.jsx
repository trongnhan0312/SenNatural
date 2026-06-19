import React from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { ArrowUpRight, DollarSign, Info } from "lucide-react";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

export default function InventoryExport() {
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState(0);
  const [sellPrice, setSellPrice] = React.useState("");
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
      if (res.data.data[0]) setProductId(res.data.data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    setStatus("");
    setError("");
    try {
      await axios.post(
        api("/inventory/export"),
        { productId, quantity, sellPrice },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      setStatus("Ghi nhận xuất kho thành công!");
      setQuantity(0);
      setSellPrice("");
    } catch (err) {
      setError(err.response?.data?.message || "Xuất kho thất bại. Vui lòng thử lại.");
    }
  };

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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Xuất kho</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Ghi nhận xuất hàng</h1>
            <p className="mt-2 text-sm text-slate-600">Thực hiện xuất giảm tồn kho và ghi nhận doanh thu.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-amber-800 text-sm font-semibold">
            <ArrowUpRight size={16} /> Kiểm soát tồn kho chặt chẽ
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Helper Instructions */}
        <div className="rounded-[32px] border border-white/30 bg-white/50 p-6 shadow-soft backdrop-blur-md">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Info size={18} className="text-primary" /> Lưu ý kiểm kho
          </h2>
          <p className="mt-2 text-sm text-slate-600">Luôn đối chiếu số lượng thực tế trước khi xuất để tránh sai sót.</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/30 bg-white/30 p-4">
              <p className="text-xs font-bold text-slate-700 uppercase">Đối soát số lượng</p>
              <p className="mt-1 text-xs text-slate-500">Hệ thống sẽ không cho phép xuất kho nếu số lượng trong kho ít hơn số lượng yêu cầu.</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/30 p-4">
              <p className="text-xs font-bold text-slate-700 uppercase">Doanh thu & Lợi nhuận</p>
              <p className="mt-1 text-xs text-slate-500">Nếu bạn thay đổi giá bán khi xuất, giá trị này sẽ dùng trực tiếp để tính doanh thu và lợi nhuận ròng.</p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
          <h2 className="text-lg font-bold text-slate-800">Thông tin chi tiết phiếu xuất</h2>
          <p className="text-xs text-slate-500">Các trường thông tin bắt buộc.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Chọn sản phẩm xuất</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.volume}) - Hiện có: {p.quantity} cái
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Số lượng xuất</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  required
                  min="1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Giá bán thực tế (đ)</label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="Để trống để dùng giá cũ"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center rounded-2xl mt-2">
              Xác nhận xuất kho
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
