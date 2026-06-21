import React from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, Sparkles, RefreshCw, X, Paperclip, FileText } from "lucide-react";
import { useLocation } from "react-router-dom";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

const QUICK_ACTIONS = [
  { label: "Báo cáo tồn kho", text: "xuất báo cáo" },
  { label: "Đề xuất nhập kho", text: "dự báo kho hàng" },
  { label: "Tồn dầu gội bồ kết", text: "kiểm tra tồn kho bồ kết" },
  { label: "Mặt hàng sắp hết", text: "sản phẩm nào sắp hết hàng" },
];

const parseInlineStyles = (text) => {
  if (!text) return "";
  const parts = [];
  let index = 0;
  
  // Regex to match **bold**, *italic*, `code`
  const regex = /(\*\*|`)(.*?)\1/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > index) {
      parts.push(text.substring(index, match.index));
    }
    
    const type = match[1];
    const content = match[2];
    
    if (type === "**") {
      parts.push(<strong key={match.index} className="font-semibold text-slate-900">{content}</strong>);
    } else if (type === "`") {
      parts.push(<code key={match.index} className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-rose-600 border border-slate-200">{content}</code>);
    }
    
    index = regex.lastIndex;
  }
  
  if (index < text.length) {
    parts.push(text.substring(index));
  }
  
  return parts.length > 0 ? parts : text;
};

const renderMarkdown = (text) => {
  if (!text) return null;
  
  const lines = text.split("\n");
  
  return lines.map((line, idx) => {
    // Check for headers
    if (line.startsWith("### ")) {
      return <h4 key={idx} className="text-xs font-bold text-slate-800 mt-2 mb-0.5">{parseInlineStyles(line.slice(4))}</h4>;
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      const cleanLine = line.startsWith("## ") ? line.slice(3) : line.slice(2);
      return <h3 key={idx} className="text-sm font-bold text-primary mt-3 mb-1">{parseInlineStyles(cleanLine)}</h3>;
    }
    
    // Check for lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const content = line.trim().substring(2);
      return (
        <div key={idx} className="flex items-start gap-1.5 ml-1.5 my-0.5 text-xs text-slate-700">
          <span className="text-primary mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
          <div className="flex-1">{parseInlineStyles(content)}</div>
        </div>
      );
    }
    
    // Check for order list (numbers)
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      return (
        <div key={idx} className="flex items-start gap-1.5 ml-1.5 my-0.5 text-xs text-slate-700">
          <span className="font-semibold text-primary text-[10px] mt-0.5">{numMatch[1]}.</span>
          <div className="flex-1">{parseInlineStyles(numMatch[2])}</div>
        </div>
      );
    }
    
    // Check for tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (cells.every(c => /^:-*|-*:-*|-*:$/.test(c) || c.startsWith("-"))) {
        return null;
      }
      const isHeader = idx === 0 || (lines[idx-1] && !lines[idx-1].trim().startsWith("|"));
      return (
        <div key={idx} className={`flex border-b border-slate-100 py-1 ${isHeader ? "bg-slate-50 font-semibold text-slate-900 border-t border-slate-200" : "text-slate-700"}`}>
          {cells.map((cell, cIdx) => (
            <div key={cIdx} className="flex-1 px-1.5 text-[10px] truncate">
              {parseInlineStyles(cell)}
            </div>
          ))}
        </div>
      );
    }
    
    // Empty line
    if (!line.trim()) {
      return <div key={idx} className="h-1" />;
    }
    
    // Normal paragraph
    return <p key={idx} className="text-xs text-slate-700 my-0.5 leading-relaxed">{parseInlineStyles(line)}</p>;
  });
};

export default function AIChat() {
  const location = useLocation();
  
  if (location.pathname === "/") {
    return null;
  }

  const [isOpen, setIsOpen] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const chatBoxRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Tệp tin quá lớn. Vui lòng chọn tệp dưới 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(",")[1];
      setSelectedFile({
        data: base64Data,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  // Auto-scroll to the bottom of the chat box when history changes
  React.useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: "auto"
      });
    }
  }, [history]);

  // Focus input when popover opens
  React.useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, loading]);

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

  const send = async (e, customMsg = null) => {
    e?.preventDefault();
    if (loading) return;
    const queryText = (customMsg || msg).trim();
    if (!queryText && !selectedFile) return;

    setLoading(true);
    const userMessage = { 
      role: "user", 
      text: queryText + (selectedFile ? `\n[Tệp đính kèm: ${selectedFile.name}]` : "") 
    };
    setHistory((h) => [...h, userMessage]);
    if (!customMsg) setMsg("");

    const payload = { message: queryText };
    if (selectedFile) {
      payload.file = {
        data: selectedFile.data,
        mimeType: selectedFile.mimeType
      };
    }

    // Clear file selection immediately
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const res = await axios.post(
        api("/ai/chat"),
        payload,
        {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        }
      );
      
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
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-300 hover:bg-slate-900 hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
        aria-label="Toggle AI Assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <Sparkles size={24} />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Chat Popover Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[400px] h-[520px] flex flex-col rounded-[24px] border border-white/40 bg-white/95 shadow-soft backdrop-blur-lg overflow-hidden"
          >
            {/* Header */}
            <div className="relative border-b border-slate-100 bg-white/60 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-primary p-1.5 text-white shadow-sm">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">Trợ lý AI Kho hàng</h3>
                  <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-semibold mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đang hoạt động
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchHistory}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                  title="Tải lại lịch sử"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Conversation Box */}
            <div
              ref={chatBoxRef}
              className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-50/50"
            >
              {history.length === 0 ? (
                <div className="grid place-items-center py-20 text-center text-slate-500">
                  <MessageCircle size={32} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-[11px] font-semibold">Chào bạn! Tôi có thể giúp gì cho kho hàng của bạn hôm nay?</p>
                  <p className="text-[9px] text-slate-400 mt-1">Chọn mẫu lệnh nhanh bên dưới hoặc gõ trực tiếp.</p>
                </div>
              ) : (
                history.map((item, index) => (
                  <motion.div
                    key={`${item.role}-${index}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`w-full max-w-[85%] rounded-[18px] px-3.5 py-2 shadow-sm leading-relaxed text-[11px] ${
                        item.role === "user"
                          ? "rounded-tr-none bg-primary text-white"
                          : "rounded-tl-none bg-white border border-slate-100 text-slate-800"
                      }`}
                    >
                      <span className={`block text-[8px] uppercase tracking-wider mb-0.5 ${
                        item.role === "user" ? "text-emerald-200" : "text-slate-400"
                      }`}>
                        {item.role === "user" ? "Tài khoản" : "Trợ lý AI"}
                      </span>
                      {item.role === "user" ? (
                        <p className="whitespace-pre-wrap">{item.text}</p>
                      ) : (
                        <div className="space-y-0.5">{renderMarkdown(item.text)}</div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl rounded-tl-none bg-white border border-slate-100 px-3.5 py-2 shadow-sm flex items-center gap-1.5">
                    <RefreshCw size={10} className="animate-spin text-primary" />
                    <span className="text-[10px] text-slate-400">AI đang xử lý...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-1 max-h-[75px] overflow-y-auto shrink-0">
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  disabled={loading}
                  onClick={() => send(null, action.text)}
                  className="text-[9px] rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600 transition hover:border-primary/50 hover:bg-slate-50 hover:text-primary disabled:opacity-60 cursor-pointer"
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
              <div className="px-3.5 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600 gap-2 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText size={12} className="text-primary shrink-0" />
                  <span className="truncate font-semibold">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => send(e)}
              className="p-2.5 bg-white border-t border-slate-100 flex gap-2 items-center shrink-0"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-60 cursor-pointer"
                title="Tải ảnh hoặc tài liệu PDF"
              >
                <Paperclip size={12} />
              </button>
              <input
                ref={inputRef}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                placeholder="Gõ lệnh tiếng Việt tự nhiên..."
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60 cursor-pointer"
              >
                <Send size={12} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
