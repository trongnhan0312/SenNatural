import React from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { BarChart3, FileSpreadsheet, FileText, TrendingUp, DollarSign, PieChart, Sparkles } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

const COLORS = ["#0f5132", "#16a34a", "#0284c7", "#f59e0b", "#dc2626", "#8b5cf6"];

export default function Statistics() {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(api("/statistic/dashboard"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      const res = await axios.get(api("/export/excel"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SenNatural_Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Lỗi tải file Excel. Vui lòng kiểm tra quyền Admin của bạn.");
    }
  };

  const downloadPDF = async () => {
    try {
      const res = await axios.get(api("/export/pdf"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SenNatural_Inventory_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Lỗi tải file PDF. Vui lòng kiểm tra quyền Admin của bạn.");
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-info/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Phân tích & Thống kê</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Báo cáo doanh số & Kho</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Xuất các báo cáo định dạng Excel và PDF, đồng thời phân tích hiệu suất kinh doanh trong tháng.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadExcel}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <FileSpreadsheet size={16} /> Xuất Excel
            </button>
            <button
              onClick={downloadPDF}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <FileText size={16} /> Xuất PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-white/30 bg-white/50 p-6 shadow-soft backdrop-blur-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" /> Lịch sử xuất nhập kho (15 ngày)
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.inventoryCharts || []}>
                <defs>
                  <linearGradient id="colorImports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="imports" name="Nhập kho" stroke="#16a34a" fillOpacity={1} fill="url(#colorImports)" strokeWidth={2} />
                <Area type="monotone" dataKey="exports" name="Xuất kho" stroke="#f59e0b" fillOpacity={1} fill="url(#colorExports)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[32px] border border-white/30 bg-white/50 p-6 shadow-soft backdrop-blur-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <PieChart size={18} className="text-info" /> Phân bố giá trị sản phẩm theo danh mục
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.categoryDistribution || []}>
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip formatter={(value) => `${value.toLocaleString("vi-VN")}đ`} />
                <Bar dataKey="value" name="Giá trị kho" radius={[8, 8, 0, 0]}>
                  {(stats?.categoryDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Metrics breakdown */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/40 bg-white/40 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Giá trị kho nhập</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.inventoryValue?.toLocaleString("vi-VN")}đ</p>
          <p className="mt-1 text-xs text-slate-500">Tổng vốn lưu động tồn kho</p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/40 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Giá trị bán dự tính</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.retailValue?.toLocaleString("vi-VN")}đ</p>
          <p className="mt-1 text-xs text-slate-500">Doanh thu dự kiến khi bán hết</p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/40 p-5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Biên lợi nhuận gộp</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {stats?.retailValue > 0
              ? (((stats.retailValue - stats.inventoryValue) / stats.retailValue) * 100).toFixed(1)
              : "0"}%
          </p>
          <p className="mt-1 text-xs text-slate-500">Ước tính tỉ lệ sinh lời lý thuyết</p>
        </div>
      </div>
    </div>
  );
}
