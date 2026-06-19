import React from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Lock, User } from "lucide-react";

export default function Login() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-soft backdrop-blur-xl">
        <div className="grid gap-0 md:grid-cols-[1.6fr_1fr]">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative bg-[url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center p-10 text-white md:p-12"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-slate-900/40 to-slate-900/70" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center gap-2.5 select-none">
                  <img
                    src="/logo.jpg"
                    alt="Logo"
                    className="h-10 w-10 rounded-xl object-cover border border-white/20 bg-white"
                  />
                  <span className="text-xl font-extrabold text-white tracking-wide font-sans">Sen Natural</span>
                </div>
                <div className="mb-6 inline-flex rounded-3xl bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-100">
                  Sen Natural Admin
                </div>
                <h1 className="text-4xl font-semibold tracking-tight">Chào mừng trở lại</h1>
                <p className="mt-4 max-w-sm text-sm leading-7 text-slate-200">
                  Quản lý kho hàng, sản phẩm và đơn hàng của Sen Natural với giao diện hiện đại.
                </p>
              </div>
              <div className="space-y-4 text-sm text-slate-200">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="font-semibold">Bảng điều khiển</div>
                  <div className="mt-2 text-xs text-slate-300">Xem nhanh tổng quan sản phẩm, nhập kho và trạng thái AI.</div>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="font-semibold">Trợ lý AI</div>
                  <div className="mt-2 text-xs text-slate-300">Điều khiển bằng tiếng Việt để tự động hóa thao tác kho.</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="px-6 py-8 md:px-10 md:py-12"
          >
            <div className="mb-8 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
              <img
                src="/logo.jpg"
                alt="Sen Natural Logo"
                className="h-12 w-12 rounded-[18px] object-cover border border-slate-200 bg-white shadow-sm shrink-0"
              />
              <div>
                <p className="text-sm font-medium text-slate-600">Đăng nhập vào hệ thống</p>
                <p className="text-xs text-slate-400">Nhập thông tin tài khoản để tiếp tục.</p>
              </div>
            </div>

            {err && (
              <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Tên đăng nhập</label>
              <div className="relative">
                <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="senadmin"
                />
              </div>

              <label className="block text-sm font-semibold text-slate-700">Mật khẩu</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
