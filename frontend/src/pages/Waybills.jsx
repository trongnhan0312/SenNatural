import React from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Search, Plus, Calendar, MapPin, User, Phone, Trash2, ChevronRight, RefreshCw, X, CheckCircle2, Package } from "lucide-react";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

export default function Waybills() {
  const [waybills, setWaybills] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedWaybill, setSelectedWaybill] = React.useState(null);
  const [inputTracking, setInputTracking] = React.useState("");
  const [inputCarrier, setInputCarrier] = React.useState("SPX Express");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [message, setMessage] = React.useState({ text: "", type: "" });

  const fetchWaybills = async () => {
    setLoading(true);
    try {
      const res = await axios.get(api("/waybill"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      });
      setWaybills(res.data.data);
      if (res.data.data.length > 0 && !selectedWaybill) {
        setSelectedWaybill(res.data.data[0]);
      }
    } catch (err) {
      showMsg("Không thể tải danh sách vận đơn. Vui lòng kiểm tra kết nối.", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchWaybills();
  }, []);

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleTrackNew = async (e) => {
    e.preventDefault();
    if (!inputTracking.trim()) return;

    setActionLoading(true);
    try {
      const res = await axios.post(api("/waybill"), {
        trackingNumber: inputTracking.trim(),
        carrier: inputCarrier
      }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      });
      showMsg("Đã tra cứu và lưu thông tin vận đơn thành công!");
      setInputTracking("");
      fetchWaybills();
      setSelectedWaybill(res.data.data);
    } catch (err) {
      showMsg("Lỗi khi tra cứu vận đơn. Vui lòng thử lại sau.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa theo dõi vận đơn này không?")) return;

    try {
      await axios.delete(api(`/waybill/${id}`), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      });
      showMsg("Đã xóa vận đơn khỏi hệ thống.");
      fetchWaybills();
      if (selectedWaybill?.id === id) {
        setSelectedWaybill(null);
      }
    } catch (err) {
      showMsg("Lỗi khi xóa vận đơn.", "error");
    }
  };

  const filteredWaybills = waybills.filter(w =>
    w.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.status && w.status.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status) => {
    if (!status) return "bg-slate-100 text-slate-700";
    const s = status.toLowerCase();
    if (s.includes("thành công") || s.includes("đã giao") || s.includes("delivered") || s.includes("completed")) {
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (s.includes("giao hàng") || s.includes("delivering") || s.includes("đang giao")) {
      return "bg-sky-100 text-sky-800 border-sky-200";
    }
    if (s.includes("lấy hàng") || s.includes("chờ") || s.includes("pending")) {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const parseHistory = (historyStr) => {
    try {
      return JSON.parse(historyStr) || [];
    } catch (e) {
      return [];
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6" /> QUẢN LÝ VẬN ĐƠN
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Theo dõi trạng thái giao nhận và lịch trình từ hãng vận chuyển SPX Express
          </p>
        </div>
        <button
          onClick={fetchWaybills}
          disabled={loading}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 hover:border-primary/50 text-slate-700 px-4 text-xs font-semibold shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Tải lại
        </button>
      </div>

      {/* Message feedback */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-2xl text-xs font-semibold border ${
              message.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-100"
                : "bg-emerald-50 text-emerald-800 border-emerald-100"
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Lookup Form and Shipment List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Quick Lookup Form */}
          <form
            onSubmit={handleTrackNew}
            className="rounded-[32px] border border-white/40 bg-white/40 p-5 shadow-soft backdrop-blur-md flex flex-col gap-4"
          >
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tra cứu vận đơn mới
            </h3>
            
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  placeholder="Mã vận đơn (SPXVN...)"
                  value={inputTracking}
                  onChange={(e) => setInputTracking(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-primary focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !inputTracking}
                  className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-slate-900 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Thêm
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium">Hãng vận chuyển:</span>
                <select
                  value={inputCarrier}
                  onChange={(e) => setInputCarrier(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-slate-700 outline-none cursor-pointer border-b border-slate-300 pb-0.5"
                >
                  <option value="SPX Express">SPX Express</option>
                  <option value="Giao Hàng Nhanh">Giao Hàng Nhanh (GHN)</option>
                  <option value="Viettel Post">Viettel Post</option>
                </select>
              </div>
            </div>
          </form>

          {/* Waybills List */}
          <div className="rounded-[32px] border border-white/40 bg-white/30 p-5 shadow-soft backdrop-blur-md flex flex-col gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="Tìm mã vận đơn, trạng thái..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/60 pl-9 pr-4 py-2 text-xs text-slate-950 outline-none focus:border-primary focus:bg-white transition"
              />
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {loading && waybills.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="animate-spin mx-auto text-primary mb-2 h-5 w-5" />
                  Đang tải vận đơn...
                </div>
              ) : filteredWaybills.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-medium">
                  <Package className="mx-auto text-slate-300 mb-2 h-8 w-8" />
                  Chưa có vận đơn nào được theo dõi.
                  <p className="text-[10px] text-slate-400 mt-1">Hãy nhập mã vận đơn ở trên hoặc hỏi trợ lý AI.</p>
                </div>
              ) : (
                filteredWaybills.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWaybill(w)}
                    className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 ${
                      selectedWaybill?.id === w.id
                        ? "bg-white border-primary shadow-sm scale-[1.01]"
                        : "bg-white/60 border-slate-200/60 hover:bg-white/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-950 font-mono tracking-tight truncate">
                          {w.trackingNumber}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 rounded px-1">
                          {w.carrier}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(w.status)}`}>
                          {w.status || "Đang xử lý"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(w.updatedAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(w.id, e)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Xóa theo dõi"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={14} className="text-slate-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: Waybill Detailed View (7 cols) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedWaybill ? (
              <motion.div
                key={selectedWaybill.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="rounded-[36px] border border-white/50 bg-white/70 p-6 shadow-soft backdrop-blur-xl flex flex-col gap-6"
              >
                {/* Header detail */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-200/50 pb-4">
                  <div>
                    <span className="text-[10px] font-black text-primary bg-primary/10 rounded-lg px-2 py-0.5 uppercase tracking-wider block w-fit mb-1.5">
                      {selectedWaybill.carrier}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight font-mono">
                      {selectedWaybill.trackingNumber}
                    </h2>
                  </div>
                  
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(selectedWaybill.status)}`}>
                    {selectedWaybill.status || "Đang xử lý"}
                  </span>
                </div>

                {/* Delivery Information Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Shipper info */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white/50 p-4 flex gap-3">
                    <div className="rounded-xl bg-sky-50 text-sky-600 p-2 h-fit">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Người giao hàng (Shipper)</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">{selectedWaybill.shipperName || "Đang cập nhật..."}</p>
                      {selectedWaybill.shipperPhone && (
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                          <Phone size={10} /> {selectedWaybill.shipperPhone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Ship Address / Details */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white/50 p-4 flex gap-3">
                    <div className="rounded-xl bg-amber-50 text-amber-600 p-2 h-fit">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Địa chỉ giao hàng</p>
                      <p className="text-xs font-bold text-slate-800 mt-1 truncate max-w-[200px]" title={selectedWaybill.shippingAddress}>
                        {selectedWaybill.shippingAddress || "Đang cập nhật..."}
                      </p>
                      {selectedWaybill.weight && (
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Trọng lượng: {selectedWaybill.weight} kg
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tracking History Timeline */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Calendar size={13} /> Lịch trình chi tiết
                  </h3>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {parseHistory(selectedWaybill.history).length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium py-2">Chưa ghi nhận lịch trình vận chuyển.</p>
                    ) : (
                      parseHistory(selectedWaybill.history).map((evt, idx) => {
                        const isLatest = idx === parseHistory(selectedWaybill.history).length - 1;
                        return (
                          <div key={idx} className="relative flex flex-col gap-1">
                            {/* Dot indicator */}
                            <span className={`absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-white flex items-center justify-center ${
                              isLatest ? "border-emerald-500 scale-110 shadow-sm" : "border-slate-300"
                            }`}>
                              {isLatest && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />}
                            </span>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-semibold font-mono">
                                {new Date(evt.time).toLocaleDateString("vi-VN")} {new Date(evt.time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isLatest && (
                                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1 uppercase tracking-widest">Mới nhất</span>
                              )}
                            </div>

                            <p className={`text-xs font-medium leading-relaxed ${
                              isLatest ? "text-slate-900 font-semibold" : "text-slate-500"
                            }`}>
                              {evt.message}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-[36px] border border-white/40 bg-white/20 p-16 text-center text-slate-400 text-xs font-semibold backdrop-blur-md">
                <Truck className="mx-auto text-slate-300 mb-2 h-10 w-10 animate-bounce" />
                Chọn một vận đơn ở cột bên trái để hiển thị thông tin lịch trình chi tiết.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
