import React from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, ArrowUpRight, Package, Trash2, Edit3 } from "lucide-react";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;

export default function Products() {
  const [items, setItems] = React.useState([]);
  const [editing, setEditing] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [form, setForm] = React.useState({
    name: "",
    category: "",
    volume: "",
    quantity: 0,
    importPrice: 0,
    sellPrice: 0,
    bottles300: 0,
    bottles500: 0,
    bulkLiters: 0,
    importPrice300: 0,
    sellPrice300: 0,
    importPrice500: 0,
    sellPrice500: 0,
    importPriceBulk: 0,
    sellPriceBulk: 0,
  });
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [productHistory, setProductHistory] = React.useState([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);

  React.useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setIsAdmin(user.role === "ADMIN");
    } catch (e) {
      console.error(e);
    }
    fetchProducts();
  }, []);

  const handleProductClick = async (product) => {
    setSelectedProduct(product);
    setLoadingHistory(true);
    try {
      const res = await axios.get(api(`/inventory/history?productId=${product.id}&limit=100`), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setProductHistory(res.data.data);
    } catch (e) {
      console.error(e);
      setProductHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(api("/products"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setItems(res.data.data);
    } catch (e) {
      console.error(e);
      setError("Không thể tải danh sách sản phẩm.");
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      category: "",
      volume: "",
      quantity: 0,
      importPrice: 0,
      sellPrice: 0,
      bottles300: 0,
      bottles500: 0,
      bulkLiters: 0,
      importPrice300: 0,
      sellPrice300: 0,
      importPrice500: 0,
      sellPrice500: 0,
      importPriceBulk: 0,
      sellPriceBulk: 0,
    });
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category || "",
      volume: product.volume || "",
      quantity: product.quantity,
      importPrice: product.importPrice,
      sellPrice: product.sellPrice,
      bottles300: product.bottles300 || 0,
      bottles500: product.bottles500 || 0,
      bulkLiters: product.bulkLiters || 0,
      importPrice300: product.importPrice300 || 0,
      sellPrice300: product.sellPrice300 || 0,
      importPrice500: product.importPrice500 || 0,
      sellPrice500: product.sellPrice500 || 0,
      importPriceBulk: product.importPriceBulk || 0,
      sellPriceBulk: product.sellPriceBulk || 0,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editing) {
        await axios.put(api(`/products/${editing.id}`), form, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        setSuccess("Đã cập nhật sản phẩm thành công.");
      } else {
        await axios.post(api("/products"), form, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        setSuccess("Đã thêm sản phẩm mới thành công.");
      }
      await fetchProducts();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Lưu sản phẩm thất bại. Vui lòng kiểm tra lại.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh mục?")) return;
    setError("");
    setSuccess("");
    try {
      await axios.delete(api(`/products/${id}`), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setSuccess("Xóa sản phẩm thành công.");
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa sản phẩm. Có thể có giao dịch liên quan.");
    }
  };

  const filteredItems = items.filter((item) =>
    [item.name, item.category, item.volume].some((field) =>
      field?.toLowerCase().includes(search.toLowerCase())
    )
  );



  const importHistory = React.useMemo(() => {
    return productHistory.filter((h) => h.action === "IMPORT");
  }, [productHistory]);

  const exportHistory = React.useMemo(() => {
    return productHistory.filter((h) => h.action === "EXPORT");
  }, [productHistory]);

  return (
    <div className="grid gap-6 grid-cols-1">
      {/* Products List Section */}
      <section className="rounded-[32px] border border-white/20 bg-white/40 p-6 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Sản phẩm</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 font-sans">Danh mục sản phẩm</h1>
            <p className="mt-2 text-sm text-slate-600">Tìm kiếm, kiểm tra số lượng và nhấp vào sản phẩm để xem đợt nhập hàng.</p>
          </div>
          {isAdmin && (
            <button onClick={resetForm} className="btn-primary inline-flex items-center gap-2 rounded-2xl shadow-sm">
              <Plus size={16} /> Thêm mới
            </button>
          )}
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white/70 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="Tìm tên, danh mục hoặc dung tích..."
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center text-slate-500">
              Không tìm thấy sản phẩm nào.
            </div>
          ) : (
            filteredItems.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                onClick={() => handleProductClick(p)}
                className="group relative rounded-[28px] border border-white/30 bg-white/50 p-5 shadow-soft transition-all duration-300 hover:border-primary/40 hover:bg-white/80 cursor-pointer hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Image container */}
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-white/40 shadow-inner mb-4 flex items-center justify-center">
                    <img
                      src={
                        p.name.toLowerCase().includes("gừng") || p.name.toLowerCase().includes("gung")
                          ? "/gung.jpg"
                          : p.name.toLowerCase().includes("bồ kết") || p.name.toLowerCase().includes("bo ket")
                          ? "/boket.jpg"
                          : "/logo.jpg"
                      }
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-2 left-2 rounded-full bg-primary/15 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold text-primary uppercase tracking-wider">
                      {p.category === "Raw Material" ? "Nguyên liệu" : p.category}
                    </span>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-1.5 px-1">
                    <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-primary transition truncate">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Dung tích: <b className="text-slate-700">{p.volume || "N/A"}</b></p>
                  </div>
                </div>

                {/* Stock & Action footer */}
                <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
                  {p.category === "Dầu gội" ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Tổng thể tích:</span>
                        <span className="text-primary font-black">{(p.bottles300 * 0.3 + p.bottles500 * 0.5 + p.bulkLiters).toFixed(1)} L</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-center text-slate-600 bg-slate-100/50 p-2 rounded-xl mt-1 border border-slate-200/20 font-semibold">
                        <div>300ml: <b>{p.bottles300}c</b></div>
                        <div>500ml: <b>{p.bottles500}c</b></div>
                        <div>Xá: <b>{p.bulkLiters}L</b></div>
                      </div>
                    </div>
                  ) : p.category === "Raw Material" ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Thể tích xá:</span>
                        <span className="text-primary font-black">{p.bulkLiters} L</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Giá bán:</span>
                        <span className="text-slate-900 font-black">{p.sellPrice.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Tồn kho:</span>
                        <span className="text-slate-900 font-black">{p.quantity}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Giá bán:</span>
                        <span className="text-slate-900 font-black">{p.sellPrice.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex gap-2 pt-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(p);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 shadow-sm"
                      >
                        <Edit3 size={12} /> Sửa
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2 text-xs font-bold text-white transition hover:bg-red-700 shadow-sm"
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Editor Modal Section */}
      <AnimatePresence>
        {isAdmin && showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl rounded-[32px] border border-white/20 bg-white/95 p-6 md:p-8 shadow-xl backdrop-blur-md overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{editing ? "Chỉnh sửa chi tiết" : "Tạo sản phẩm mới"}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Nhập đầy đủ các thông tin và giá trị của sản phẩm bên dưới.</p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 shadow-sm"
                >
                  Đóng
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tên sản phẩm</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Danh mục</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="Ví dụ: Dầu gội, Nguyên liệu, Chăm sóc"
                list="category-options"
                required
              />
              <datalist id="category-options">
                <option value="Dầu gội" />
                <option value="Nguyên liệu" />
                <option value="Chăm sóc" />
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Dung tích</label>
              <input
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="Ví dụ: 300ml, 500ml"
                required
              />
            </div>
            {form.category === "Dầu gội" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Tồn kho 300ml</label>
                    <input
                      type="number"
                      value={form.bottles300}
                      onChange={(e) => setForm({ ...form, bottles300: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Tồn kho 500ml</label>
                    <input
                      type="number"
                      value={form.bottles500}
                      onChange={(e) => setForm({ ...form, bottles500: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Hàng xá (Lít)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.bulkLiters}
                      onChange={(e) => setForm({ ...form, bulkLiters: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Giá nhập 300ml (đ)</label>
                    <input
                      type="number"
                      value={form.importPrice300}
                      onChange={(e) => setForm({ ...form, importPrice300: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Giá bán 300ml (đ)</label>
                    <input
                      type="number"
                      value={form.sellPrice300}
                      onChange={(e) => setForm({ ...form, sellPrice300: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Giá nhập 500ml (đ)</label>
                    <input
                      type="number"
                      value={form.importPrice500}
                      onChange={(e) => setForm({ ...form, importPrice500: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Giá bán 500ml (đ)</label>
                    <input
                      type="number"
                      value={form.sellPrice500}
                      onChange={(e) => setForm({ ...form, sellPrice500: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Giá nhập Lít xá (đ)</label>
                    <input
                      type="number"
                      value={form.importPriceBulk}
                      onChange={(e) => setForm({ ...form, importPriceBulk: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Giá bán Lít xá (đ)</label>
                    <input
                      type="number"
                      value={form.sellPriceBulk}
                      onChange={(e) => setForm({ ...form, sellPriceBulk: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </>
            ) : form.category?.toLowerCase() === "raw material" || form.category?.toLowerCase() === "nguyên liệu" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Thể tích (Lít)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.bulkLiters}
                      onChange={(e) => setForm({ ...form, bulkLiters: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Giá nhập (đ)</label>
                    <input
                      type="number"
                      value={form.importPrice}
                      onChange={(e) => setForm({ ...form, importPrice: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Giá bán (đ)</label>
                  <input
                    type="number"
                    value={form.sellPrice}
                    onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Số lượng tồn kho</label>
                    <input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Giá nhập (đ)</label>
                    <input
                      type="number"
                      value={form.importPrice}
                      onChange={(e) => setForm({ ...form, importPrice: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Giá bán (đ)</label>
                  <input
                    type="number"
                    value={form.sellPrice}
                    onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary w-full justify-center">
                {editing ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="btn-secondary w-full justify-center"
              >
                Hủy
              </button>
            </div>
          </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Date Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl rounded-[32px] border border-white/20 bg-white/95 p-6 md:p-8 shadow-xl backdrop-blur-md overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      selectedProduct.name.toLowerCase().includes("gừng") || selectedProduct.name.toLowerCase().includes("gung")
                        ? "/gung.jpg"
                        : selectedProduct.name.toLowerCase().includes("bồ kết") || selectedProduct.name.toLowerCase().includes("bo ket")
                        ? "/boket.jpg"
                        : "/logo.jpg"
                    }
                    alt={selectedProduct.name}
                    className="h-12 w-12 rounded-xl object-cover border border-white/50 shadow-sm bg-white"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-sans leading-tight">Lịch sử giao dịch chi tiết</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{selectedProduct.name} ({selectedProduct.volume})</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 shadow-sm"
                >
                  Đóng
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1 pb-2">
                {/* Column 1: Import History */}
                <div className="flex flex-col">
                  <h4 className="flex items-center justify-between text-sm font-bold text-slate-800 border-b border-slate-200/60 pb-2.5 mb-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Lịch sử nhập kho
                    </span>
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md font-extrabold">
                      {importHistory.length} lần nhập
                    </span>
                  </h4>

                  <div className="space-y-3">
                    {loadingHistory ? (
                      <div className="flex h-32 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                      </div>
                    ) : importHistory.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-12">
                        Chưa có lịch sử nhập hàng nào.
                      </p>
                    ) : (
                      importHistory.map((h) => (
                        <div key={h.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs space-y-2 transition hover:bg-emerald-50/10">
                          <div className="flex justify-between items-center text-slate-900 font-bold">
                            <span>Ngày nhập: {new Date(h.createdAt).toLocaleString("vi-VN")}</span>
                            <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-extrabold">
                              +{h.quantity} cái
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-500 font-medium">
                            <div>
                              Đơn giá nhập:
                              <p className="font-bold text-slate-800 mt-0.5">
                                {(h.importPrice || selectedProduct.importPrice).toLocaleString("vi-VN")}đ
                              </p>
                            </div>
                            <div>
                              Thành tiền:
                              <p className="font-bold text-slate-800 mt-0.5">
                                {((h.importPrice || selectedProduct.importPrice) * h.quantity).toLocaleString("vi-VN")}đ
                              </p>
                            </div>
                          </div>
                          <div className="text-slate-400 flex items-center gap-1.5 pt-0.5">
                            <span>Người nhập:</span>
                            <span className="font-semibold text-slate-600">{h.user?.fullName || "Hệ thống (AI)"}</span>
                          </div>
                          {h.note && (
                            <div className="text-slate-400 italic pt-1.5 border-t border-slate-200/40">Ghi chú: {h.note}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: Export History */}
                <div className="flex flex-col">
                  <h4 className="flex items-center justify-between text-sm font-bold text-slate-800 border-b border-slate-200/60 pb-2.5 mb-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Lịch sử xuất kho
                    </span>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-md font-extrabold">
                      {exportHistory.length} lần xuất
                    </span>
                  </h4>

                  <div className="space-y-3">
                    {loadingHistory ? (
                      <div className="flex h-32 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
                      </div>
                    ) : exportHistory.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-12">
                        Chưa có lịch sử xuất hàng nào.
                      </p>
                    ) : (
                      exportHistory.map((h) => (
                        <div key={h.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs space-y-2 transition hover:bg-amber-50/10">
                          <div className="flex justify-between items-center text-slate-900 font-bold">
                            <span>Ngày xuất: {new Date(h.createdAt).toLocaleString("vi-VN")}</span>
                            <span className="text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full font-extrabold">
                              -{h.quantity} cái
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-500 font-medium">
                            <div>
                              Đơn giá bán:
                              <p className="font-bold text-slate-800 mt-0.5">
                                {(h.sellPrice || selectedProduct.sellPrice).toLocaleString("vi-VN")}đ
                              </p>
                            </div>
                            <div>
                              Thành tiền:
                              <p className="font-bold text-slate-800 mt-0.5">
                                {((h.sellPrice || selectedProduct.sellPrice) * h.quantity).toLocaleString("vi-VN")}đ
                              </p>
                            </div>
                          </div>
                          <div className="text-slate-400 flex items-center gap-1.5 pt-0.5">
                            <span>Người xuất:</span>
                            <span className="font-semibold text-slate-600">{h.user?.fullName || "Hệ thống (AI)"}</span>
                          </div>
                          {h.note && (
                            <div className="text-slate-400 italic pt-1.5 border-t border-slate-200/40">Ghi chú: {h.note}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
