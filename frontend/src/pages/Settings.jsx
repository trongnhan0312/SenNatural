import React from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Bell, Lock, User, Info, Save } from "lucide-react";

export default function Settings() {
  const [profile, setProfile] = React.useState({
    name: "Admin Sen Natural",
    email: "admin@sennatural.local",
    phone: "0987654321",
  });
  
  const [threshold, setThreshold] = React.useState(10);
  const [saved, setSaved] = React.useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveThreshold = (e) => {
    e.preventDefault();
    localStorage.setItem("lowStockThreshold", threshold);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Cấu hình</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Cài đặt hệ thống</h1>
        <p className="mt-2 text-sm text-slate-600">Điều chỉnh cấu hình cảnh báo tồn kho và thông tin cá nhân của bạn.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-white/30 bg-white/50 p-6 shadow-soft backdrop-blur-md"
        >
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <User size={18} className="text-primary" /> Thông tin cá nhân
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Họ và tên</label>
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Email liên hệ</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Số điện thoại</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <button type="submit" className="btn-primary inline-flex items-center gap-2">
              <Save size={14} /> Lưu hồ sơ
            </button>
          </form>
        </motion.div>

        {/* System Settings Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[32px] border border-white/30 bg-white/50 p-6 shadow-soft backdrop-blur-md"
        >
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Bell size={18} className="text-warning" /> Ngưỡng cảnh báo kho
          </h2>
          <form onSubmit={handleSaveThreshold} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Sản phẩm có số lượng tồn kho bằng hoặc thấp hơn ngưỡng này sẽ được đánh dấu là "Sắp hết hàng" (Cảnh báo đỏ trên Dashboard).
              </p>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-24 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-center text-sm font-bold text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <span className="text-sm font-medium text-slate-700">đơn vị / sản phẩm</span>
              </div>
            </div>
            <button type="submit" className="btn-primary inline-flex items-center gap-2">
              <Save size={14} /> Lưu cấu hình
            </button>
          </form>

          {/* System info */}
          <div className="mt-8 rounded-2xl bg-white/30 border border-slate-200 p-4 flex gap-3 text-slate-600">
            <Info size={20} className="shrink-0 text-info mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase text-slate-700">Thông tin hệ thống</p>
              <p className="mt-1 text-xs leading-5">
                Phiên bản: v1.1.0-AI (Sen Natural Edition)<br />
                Môi trường: Local Development<br />
                Hệ quản trị cơ sở dữ liệu: SQLite v3 / Prisma Client
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 right-6 rounded-2xl bg-slate-900 text-white px-5 py-3 shadow-lg flex items-center gap-2 text-sm z-50"
        >
          <span>✨ Đã lưu thiết lập thành công!</span>
        </motion.div>
      )}
    </div>
  );
}
