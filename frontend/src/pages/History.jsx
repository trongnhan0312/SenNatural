import React from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Clock8, PackageOpen, ArrowUpRight, User, AlertCircle } from "lucide-react";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

const statusStyles = {
  IMPORT: "bg-emerald-100 text-emerald-800 border-emerald-200/50",
  EXPORT: "bg-amber-100 text-amber-800 border-amber-200/50",
};

export default function History() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(api("/inventory/history"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setRows(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Lịch sử</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Nhật ký hoạt động kho</h1>
            <p className="mt-2 text-sm text-slate-600">Báo cáo lịch sử chi tiết các lần nhập và xuất hàng hóa.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/60 px-4 py-2.5 text-sm text-slate-700 shadow-sm backdrop-blur-md">
            <Clock8 size={16} className="text-primary" /> Cập nhật thời gian thực
          </div>
        </div>
      </div>

      {/* History Transactions List */}
      <div className="overflow-hidden rounded-[32px] border border-white/20 bg-white/40 shadow-soft backdrop-blur-xl">
        {/* Table Header for desktop */}
        <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.8fr_1.7fr] gap-4 border-b border-slate-200/50 p-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          <span>Sản phẩm & Thời gian</span>
          <span>Người thực hiện</span>
          <span>Thao tác</span>
          <span>Ghi chú / Chi tiết giá</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-200/40">
          {rows.length === 0 ? (
            <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <AlertCircle size={36} className="text-slate-300" />
              <p className="text-sm">Chưa có giao dịch nào phát sinh.</p>
            </div>
          ) : (
            rows.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_0.8fr_1.7fr] gap-3 p-6 text-sm text-slate-700 transition hover:bg-white/40 items-center"
              >
                {/* Col 1: Product & Date */}
                <div>
                  <p className="font-bold text-slate-900 text-base">{r.product?.name} ({r.product?.volume})</p>
                  <p className="mt-1.5 text-xs text-slate-400 font-medium">
                    {new Date(r.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                {/* Col 2: Actor */}
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <User size={14} className="text-slate-400" />
                  <span>{r.user?.fullName || "Hệ thống (AI)"}</span>
                </div>

                {/* Col 3: Action Tag */}
                <div className="flex items-center">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                    statusStyles[r.action] || "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    {r.action === "IMPORT" ? <PackageOpen size={12} /> : <ArrowUpRight size={12} />}
                    {r.action === "IMPORT" ? "NHẬP KHO" : "XUẤT KHO"}
                  </span>
                </div>

                {/* Col 4: Note & Price Details */}
                <div className="text-xs font-medium text-slate-600 space-y-1">
                  <p className="text-sm text-slate-700 font-semibold">{r.note || `Số lượng giao dịch: ${r.quantity} cái`}</p>
                  <div className="flex gap-4 text-slate-400">
                    {r.action === "IMPORT" && r.importPrice && (
                      <span>Giá nhập khi đó: <strong className="text-slate-600">{r.importPrice.toLocaleString("vi-VN")}đ</strong></span>
                    )}
                    {r.action === "EXPORT" && r.sellPrice && (
                      <span>Giá bán khi đó: <strong className="text-slate-600">{r.sellPrice.toLocaleString("vi-VN")}đ</strong></span>
                    )}
                    <span>Số lượng: <strong className="text-slate-600">{r.quantity} cái</strong></span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
