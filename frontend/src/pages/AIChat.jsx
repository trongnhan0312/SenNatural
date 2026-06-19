import React from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Send, MessageCircle, Sparkles, AlertTriangle, FileText, BarChart3, RefreshCw } from "lucide-react";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

const QUICK_ACTIONS = [
  { label: "Báo cáo tồn kho & doanh thu", text: "xuất báo cáo" },
  { label: "Dự báo & Đề xuất restock", text: "dự báo kho hàng" },
  { label: "Kiểm tra kho dầu gội bồ kết", text: "kiểm tra tồn kho bồ kết" },
  { label: "Cảnh báo sản phẩm sắp hết", text: "sản phẩm nào sắp hết hàng" },
];

export default function AIChat() {
  const [msg, setMsg] = React.useState("");
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const chatEndRef = React.useRef(null);

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(api("/ai/history"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setHistory(res.data.data);
    } catch (e) {
      console.error("Load chat history error:", e);
    }
  };

  // Auto-scroll to the bottom when history changes
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const send = async (e, customMsg = null) => {
    e?.preventDefault();
    const queryText = (customMsg || msg).trim();
    if (!queryText) return;

    setLoading(true);
    // User message
    const userMessage = { role: "user", text: queryText };
    setHistory((h) => [...h, userMessage]);
    if (!customMsg) setMsg("");

    try {
      const res = await axios.post(
        api("/ai/chat"),
        { message: queryText },
        {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        }
      );
      
      // Assistant response
      setHistory((h) => [
        ...h,
        { role: "assistant", text: res.data.reply },
      ]);
    } catch (error) {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: error.response?.data?.message || "Có lỗi xảy ra khi kết nối trợ lý AI. Vui lòng thử lại sau.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-[80px]" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-info/10 blur-[100px]" />

      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Trợ lý AI Kho hàng</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Giao tiếp ngôn ngữ tự nhiên</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Nhập khẩu, xuất khẩu, chỉnh sửa giá bán, và kiểm tra dự báo tồn kho bằng tiếng Việt tự nhiên (hỗ trợ viết tắt).
            </p>
          </div>
          <div className="rounded-2xl border border-white/30 bg-white/70 p-4 shadow-sm backdrop-blur-md">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Cú pháp ví dụ</span>
            <p className="text-xs text-slate-600 font-mono leading-relaxed">
              - "nhập bồ kết 300ml 15 cái giá 28k"<br />
              - "xuất gừng 500ml 5 cái"<br />
              - "sửa giá bán xịt tóc thành 45k"
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] border border-white/30 bg-white/50 p-6 shadow-soft backdrop-blur-md flex flex-col min-h-[580px]"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2 text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="font-bold text-slate-800">Trò chuyện với Assistant</p>
              <p className="text-[11px] text-slate-400">Ghi nhớ ngữ cảnh trò chuyện</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-100/50 px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" /> Trực tuyến
          </span>
        </div>

        {/* Conversation Box */}
        <div className="flex-1 min-h-[350px] max-h-[420px] overflow-y-auto space-y-4 rounded-2xl border border-slate-100 bg-white/40 p-4">
          {history.length === 0 ? (
            <div className="grid place-items-center py-24 text-center text-slate-500">
              <MessageCircle size={44} className="mx-auto text-slate-300" />
              <p className="mt-4 text-sm font-semibold">Chào bạn! Tôi có thể giúp gì cho kho hàng của bạn hôm nay?</p>
              <p className="text-xs text-slate-400 mt-1">Chọn một mẫu lệnh nhanh phía dưới hoặc bắt đầu gõ tin nhắn.</p>
            </div>
          ) : (
            history.map((item, index) => (
              <motion.div
                key={`${item.role}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`w-full max-w-[85%] rounded-[24px] px-5 py-3.5 shadow-sm leading-6 text-sm ${
                    item.role === "user"
                      ? "rounded-tr-none bg-primary text-white"
                      : "rounded-tl-none bg-white/95 border border-slate-100 text-slate-800"
                  }`}
                >
                  <span className={`block text-[10px] uppercase tracking-wider mb-1 ${
                    item.role === "user" ? "text-emerald-200" : "text-slate-400"
                  }`}>
                    {item.role === "user" ? "Tài khoản" : "Trợ lý AI"}
                  </span>
                  <p className="whitespace-pre-wrap">{item.text}</p>
                </div>
              </motion.div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-none bg-white border border-slate-100 px-5 py-3 shadow-sm flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-primary" />
                <span className="text-xs text-slate-400">AI đang xử lý lệnh...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick action triggers */}
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => send(null, action.text)}
              className="text-xs rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-slate-600 transition hover:border-primary/50 hover:bg-white hover:text-primary disabled:opacity-60"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Message Input form */}
        <form onSubmit={(e) => send(e)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            disabled={loading}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Gõ lệnh tiếng Việt tự nhiên... (vd: nhập bồ kết 300ml 10)"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-900 disabled:opacity-60"
          >
            <Send size={16} /> Gửi lệnh
          </button>
        </form>
      </motion.div>
    </div>
  );
}
