import React from "react";
import { Menu, Bell, Search, LogOut } from "lucide-react";

export default function Navbar({ onToggle }) {
  const [user, setUser] = React.useState({ fullName: "Admin Sen Natural", role: "ADMIN" });

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      if (stored && stored.fullName) {
        setUser(stored);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
            onClick={onToggle}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-semibold text-slate-900">Sen Natural</span>
            <span className="text-xs text-slate-500">Admin Dashboard</span>
          </div>
        </div>

        <div className="flex-1 items-center justify-center hidden md:flex">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm sản phẩm, đơn hàng, lệnh AI..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50">
            <Bell size={18} />
          </button>
          <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <img
              src="/logo.jpg"
              alt="User Logo"
              className="h-10 w-10 rounded-2xl object-cover border border-white/40 shadow-sm bg-white"
            />
            <div className="text-sm">
              <div className="font-medium text-slate-900">{user.fullName}</div>
              <div className="text-xs text-slate-500">{user.role === "ADMIN" ? "Quản lý" : "Nhân viên"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
