import React from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User } from "lucide-react";

export default function Login() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Background slides
  const bgSlides = ["/boket.jpg", "/gung.jpg"];
  const [bgSlideIndex, setBgSlideIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setBgSlideIndex((prev) => (prev + 1) % bgSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await axios.post(
        (import.meta.env.VITE_API_URL || "/api") + "/auth/login",
        { username, password },
      );
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.location.href = "/";
    } catch (e) {
      setErr(e.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans select-none">
      
      {/* Fullscreen Cinematic Slide Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={bgSlideIndex}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 0.9 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Blurred background image to fill screen without gaps */}
            <img
              src={bgSlides[bgSlideIndex]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-[0.25]"
            />
            {/* Sharp centered product image displayed fully */}
            <img
              src={bgSlides[bgSlideIndex]}
              alt="Product Background"
              className="absolute inset-0 w-full h-full object-contain p-6 sm:p-12 filter brightness-[0.9] saturate-[0.95]"
            />
          </motion.div>
        </AnimatePresence>
        
        {/* Soft overlay to dim slightly and tint green without blurring the sharp image */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-[#0f5132]/18 mix-blend-overlay z-10 pointer-events-none" />
      </div>

      {/* Centered Login Form Card */}
      <div className="relative z-20 flex items-center justify-center w-full min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-slate-950/80 border border-white/10 shadow-2xl backdrop-blur-xl rounded-[36px] p-8 text-white relative"
        >
          {/* Logo & Branding */}
          <div className="mb-8 flex flex-col items-center text-center select-none">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="h-16 w-16 rounded-[22px] object-cover border border-white/30 shadow-md bg-white mb-3"
            />
            <span className="text-2xl font-black text-white tracking-wide">Sen Natural</span>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Admin Portal</span>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Đăng Nhập</h2>
            <p className="text-xs text-slate-300 font-medium mt-1">Nhập tài khoản để tiếp tục vào hệ thống quản trị.</p>
          </div>

          {err && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/45 p-4 text-xs font-semibold text-red-300 backdrop-blur-sm"
            >
              {err}
            </motion.div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase text-slate-300 tracking-wider">Tên đăng nhập</label>
              <div className="relative">
                <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 pl-12 pr-4 text-sm text-white placeholder-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 backdrop-blur-sm"
                  placeholder="senadmin"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase text-slate-300 tracking-wider">Mật khẩu</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 pl-12 pr-4 text-sm text-white placeholder-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 backdrop-blur-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-600 text-white py-3 text-sm font-extrabold uppercase tracking-wider transition-all hover:bg-emerald-500 shadow-md hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang kết nối...</span>
                </div>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          {/* Footer inside login card */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sen Natural © 2026</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
