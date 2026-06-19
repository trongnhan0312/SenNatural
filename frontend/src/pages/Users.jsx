import React from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { User, Users as UsersIcon, Plus, Edit3, Trash2, Shield, Phone, Mail, CheckCircle, XCircle } from "lucide-react";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

export default function Users() {
  const [users, setUsers] = React.useState([]);
  const [editing, setEditing] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    role: "STAFF",
    status: true,
  });
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(api("/users"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setUsers(res.data.data);
    } catch (e) {
      console.error(e);
      setError("Không thể tải danh sách nhân sự. Có thể bạn không có quyền Admin.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      role: "STAFF",
      status: true,
    });
  };

  const handleEdit = (user) => {
    setEditing(user);
    setForm({
      username: user.username,
      password: "", // leave blank if not changing password
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone || "",
      role: user.role,
      status: user.status,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editing) {
        // Don't submit password if empty
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        
        await axios.put(api(`/users/${editing.id}`), payload, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        setSuccess("Cập nhật thông tin nhân viên thành công.");
      } else {
        await axios.post(api("/users"), form, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        setSuccess("Thêm nhân viên mới thành công.");
      }
      await fetchUsers();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || "Lưu thông tin thất bại. Vui lòng kiểm tra lại.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) return;
    setError("");
    setSuccess("");
    try {
      await axios.delete(api(`/users/${id}`), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setSuccess("Xóa tài khoản nhân viên thành công.");
      await fetchUsers();
    } catch (err) {
      setError("Không thể xóa tài khoản. Vui lòng kiểm tra lại.");
    }
  };

  const toggleStatus = async (user) => {
    try {
      await axios.put(
        api(`/users/${user.id}`),
        { status: !user.status },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      await fetchUsers();
    } catch (err) {
      setError("Không thể cập nhật trạng thái hoạt động.");
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
    <div className="grid gap-6 xl:grid-cols-[1.7fr_1.3fr]">
      {/* Users list section */}
      <section className="rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Nhân lực</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Danh sách nhân sự</h1>
            <p className="mt-2 text-sm text-slate-600">Quản lý và cấp quyền tài khoản làm việc của nhân viên.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-3xl bg-primaryLight/50 px-4 py-2 text-primary text-sm font-semibold">
            <UsersIcon size={16} /> Tổng số: {users.length}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {users.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
              Chưa có tài khoản nhân sự nào được tạo.
            </div>
          ) : (
            users.map((u, idx) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="rounded-[24px] border border-white/30 bg-white/50 p-5 shadow-sm transition hover:border-primary/50 hover:bg-white/80"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${u.role === "ADMIN" ? "bg-primary text-white" : "bg-slate-200 text-slate-700"}`}>
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{u.fullName}</span>
                        <span className="text-xs text-slate-400">(@{u.username})</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {u.email && <span className="flex items-center gap-1"><Mail size={12} /> {u.email}</span>}
                        {u.phone && <span className="flex items-center gap-1"><Phone size={12} /> {u.phone}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.role === "ADMIN" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                          <Shield size={10} /> {u.role}
                        </span>
                        <button
                          onClick={() => toggleStatus(u)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition hover:opacity-80 ${u.status ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                        >
                          {u.status ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {u.status ? "Đang hoạt động" : "Bị khóa"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(u)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                      title="Sửa nhân viên"
                    >
                      <Edit3 size={15} />
                    </button>
                    {u.username !== "admin" && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white transition hover:bg-red-700"
                        title="Xóa nhân viên"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Editor sidebar section */}
      <aside className="rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
        <h2 className="text-xl font-bold text-slate-800">{editing ? "Sửa tài khoản nhân sự" : "Thêm tài khoản nhân sự"}</h2>
        <p className="mt-2 text-sm text-slate-600">Điền thông tin tài khoản dưới đây. Vai trò có thể chọn ADMIN hoặc STAFF.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tên đăng nhập</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
              disabled={!!editing}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Mật khẩu {editing && "(Để trống nếu không đổi)"}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              required={!editing}
              placeholder={editing ? "••••••••" : ""}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Họ và tên</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Số điện thoại</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Vai trò</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
              <select
                value={form.status ? "true" : "false"}
                onChange={(e) => setForm({ ...form, status: e.target.value === "true" })}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="true">Kích hoạt</option>
                <option value="false">Tạm khóa</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary w-full justify-center">
              {editing ? "Cập nhật" : "Thêm mới"}
            </button>
            {editing && (
              <button type="button" onClick={resetForm} className="btn-secondary w-full justify-center">
                Hủy
              </button>
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}
