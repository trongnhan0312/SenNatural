import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Package, PlusCircle, ArrowUpRight, Clock3, BarChart3, MessageSquare, Users, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/products", label: "Sản phẩm", icon: Package },
  { to: "/inventory/import", label: "Nhập kho", icon: PlusCircle },
  { to: "/inventory/export", label: "Xuất kho", icon: ArrowUpRight },
  { to: "/inventory/history", label: "Lịch sử", icon: Clock3 },
  { to: "/statistic", label: "Thống kê", icon: BarChart3 },
  { to: "/ai", label: "AI Chat", icon: MessageSquare },
  { to: "/users", label: "Nhân sự", icon: Users },
  { to: "/settings", label: "Cài đặt", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 overflow-hidden border-r border-white/20 bg-white/60 backdrop-blur-xl shadow-soft transition-transform duration-200 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex h-full flex-col px-4 py-6">
        <div className="mb-8 flex items-center gap-3 rounded-[24px] border border-white/30 bg-white/40 px-4 py-3.5 shadow-sm">
          <img
            src="/logo.jpg"
            alt="Sen Natural Logo"
            className="h-12 w-12 rounded-[18px] object-cover border border-white/50 shadow-sm bg-white"
          />
          <div>
            <div className="text-sm font-bold text-slate-900 leading-tight">Sen Natural</div>
            <div className="text-[11px] text-slate-500 font-medium">Kho & AI Assistant</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                      : "text-slate-700 hover:bg-slate-200/50 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-6 rounded-[24px] border border-white/40 bg-white/30 p-4 text-xs leading-5 text-slate-500 shadow-sm overflow-hidden relative">
          <img 
            src="/gung.jpg" 
            alt="Sen Natural Herbs" 
            className="w-full h-28 object-cover rounded-xl mb-3 shadow-sm"
          />
          <p className="font-bold text-slate-700 uppercase tracking-wider mb-1">Trợ giúp nhanh</p>
          <p>Dùng tab <strong>AI Chat</strong> để gõ lệnh bằng Tiếng Việt giúp nhập xuất hoặc chỉnh sửa hàng nhanh chóng.</p>
        </div>
      </div>
    </aside>
  );
}
