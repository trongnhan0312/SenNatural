import React from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  PlusCircle, 
  ArrowUpRight, 
  Sparkles, 
  Send, 
  RefreshCw,
  Cpu
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";

const api = (path) => (import.meta.env.VITE_API_URL || "/api") + path;
const CHART_COLORS = ["#0f5132", "#16a34a", "#0284c7", "#f59e0b", "#dc2626", "#8b5cf6"];

// Lazily load the 3D Scene to prevent WebGL context initialization crashes from blocking the initial page bundle
const LazyThreeDScene = React.lazy(() => import("../components/ThreeDScene"));

// React Error Boundary to catch Three.js runtime crashes
class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("3D Canvas error caught, falling back to 2D:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Check WebGL support
const checkWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
};

// CountUp component for numerical animation
const CountUp = ({ to, duration = 1.0, formatter = (v) => v }) => {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (to === undefined || to === null) {
      setValue(0);
      return;
    }
    let start = 0;
    const end = parseInt(to);
    if (isNaN(end) || start === end) {
      setValue(to);
      return;
    }

    const totalMiliseconds = duration * 1000;
    const stepTime = 16;
    const stepsCount = totalMiliseconds / stepTime;
    const increment = end / stepsCount;

    let timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setValue(end);
      } else {
        setValue(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [to, duration]);

  return <span>{formatter(value)}</span>;
};

// Canvas-based botanical floating particles in background
const BotanicalParticles = () => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);

    const particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 5 + 2,
        speedY: Math.random() * 0.3 + 0.1,
        speedX: Math.random() * 0.15 - 0.07,
        opacity: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.5 ? "rgba(15, 81, 50, 0.12)" : "rgba(225, 173, 77, 0.1)", 
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        p.y -= p.speedY;
        p.x += p.speedX;

        if (p.y < -p.radius) {
          p.y = height + p.radius;
          p.x = Math.random() * width;
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none -z-10" />;
};

// Flat/2D Fallback bottle representation for WebGL-less clients
const BottleFallback = ({ src, volume, label }) => {
  const formatVolume = (ml) => {
    if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
    return `${ml} ml`;
  };

  return (
    <div className="flex flex-col items-center bg-white/20 border border-white/40 p-6 rounded-[28px] shadow-sm backdrop-blur-md flex-1">
      <motion.img 
        src={src} 
        alt={label} 
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
        className="w-40 h-56 object-contain filter drop-shadow-lg"
      />
      <div className="mt-4 text-center">
        <h4 className="text-sm font-extrabold uppercase text-primary tracking-wider">{label}</h4>
        <p className="text-2xl font-black text-slate-800 mt-1">{(volume || 0).toLocaleString()} ml</p>
        <span className="text-xs bg-primaryLight text-primary px-3 py-1 rounded-full font-bold inline-block mt-1">
          {formatVolume(volume)}
        </span>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [hasWebGL, setHasWebGL] = React.useState(true);
  const [cutaway, setCutaway] = React.useState(false);
  
  // Parallax mouse coordinates state
  const [mouseCoords, setMouseCoords] = React.useState({ x: 0, y: 0 });

  // Header slide bar state for product images
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const slides = [
    { 
      image: "/ginger_bottle.jpg", 
      title: "Dầu gội Gừng Cô Đặc Sen Natural", 
      desc: "Chiết xuất 100% gừng tươi hữu cơ giúp kích thích tuần hoàn chân tóc, thúc đẩy mọc tóc con, làm sạch sâu da đầu và loại bỏ gàu ngứa hiệu quả.",
      themeColor: "from-amber-500/10 via-amber-500/5 to-transparent",
      borderColor: "border-amber-500/25"
    },
    { 
      image: "/boket_bottle.jpg", 
      title: "Dầu gội Bồ Kết Cô Đặc Sen Natural", 
      desc: "Sự kết hợp tinh túy từ quả bồ kết, hương nhu, vỏ bưởi truyền thống giúp nuôi dưỡng sợi tóc đen mượt, phục hồi hư tổn và ngăn rụng tóc tối đa.",
      themeColor: "from-emerald-800/15 via-emerald-800/5 to-transparent",
      borderColor: "border-emerald-800/25"
    },
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // AI Assistant panel context
  const [aiMsg, setAiMsg] = React.useState("");
  const [aiHistory, setAiHistory] = React.useState([
    { role: "assistant", text: "Xin chào! Tôi là Trợ lý Kho hàng AI WebSen. Nhập tin nhắn tiếng Việt để điều khiển kho nhanh chóng. (Vd: 'nhập bồ kết 300ml 15 cái')" }
  ]);
  const [aiLoading, setAiLoading] = React.useState(false);
  const chatEndRef = React.useRef(null);

  // Glow triggers when inventory quantities change
  const [glowBoket, setGlowBoket] = React.useState(false);
  const [glowGinger, setGlowGinger] = React.useState(false);
  const [prevBoketVol, setPrevBoketVol] = React.useState(0);
  const [prevGingerVol, setPrevGingerVol] = React.useState(0);

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(api("/ai/history"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      if (res.data.data && res.data.data.length > 0) {
        setAiHistory(res.data.data);
      }
    } catch (e) {
      console.error("Load dashboard chat history error:", e);
    }
  };

  React.useEffect(() => {
    setHasWebGL(checkWebGL());
    fetchStats();
    fetchChatHistory();
  }, []);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiHistory]);

  // Handle glow states when volumes change
  React.useEffect(() => {
    if (stats) {
      const bVol = stats.boKetVolume || 0;
      const gVol = stats.gingerVolume || 0;
      
      if (prevBoketVol !== 0 && bVol !== prevBoketVol) {
        setGlowBoket(true);
        const t = setTimeout(() => setGlowBoket(false), 1500);
        return () => clearTimeout(t);
      }
      setPrevBoketVol(bVol);
    }
  }, [stats?.boKetVolume]);

  React.useEffect(() => {
    if (stats) {
      const gVol = stats.gingerVolume || 0;
      
      if (prevGingerVol !== 0 && gVol !== prevGingerVol) {
        setGlowGinger(true);
        const t = setTimeout(() => setGlowGinger(false), 1500);
        return () => clearTimeout(t);
      }
      setPrevGingerVol(gVol);
    }
  }, [stats?.gingerVolume]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(api("/statistic/dashboard"), {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setStats(res.data);
    } catch (e) {
      console.error("Dashboard statistics loading failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAi = async (e, customText = null) => {
    e?.preventDefault();
    const query = (customText || aiMsg).trim();
    if (!query) return;

    setAiLoading(true);
    setAiHistory((h) => [...h, { role: "user", text: query }]);
    if (!customText) setAiMsg("");

    try {
      const res = await axios.post(
        api("/ai/chat"),
        { message: query },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      
      setAiHistory((h) => [...h, { role: "assistant", text: res.data.reply }]);
      fetchStats(); 
    } catch (err) {
      setAiHistory((h) => [...h, { role: "assistant", text: "Trợ lý đang bận xử lý dữ liệu. Vui lòng gửi lại sau." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) - 0.5; // [-0.5, 0.5]
    const y = (e.clientY / window.innerHeight) - 0.5; // [-0.5, 0.5]
    setMouseCoords({ x, y });
  };

  const formatLiters = (ml) => {
    if (!ml || isNaN(ml)) return "0 ml";
    if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
    return `${ml} ml`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F3EE]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Calculate volume ratios inside 3D simulation cylinder
  const MAX_CAPACITY = 20000;
  const boKetVolume = stats?.boKetVolume || 0;
  const gingerVolume = stats?.gingerVolume || 0;

  const boKetFill = Math.min(1.0, boKetVolume / MAX_CAPACITY);
  const gingerFill = Math.min(1.0, gingerVolume / MAX_CAPACITY);

  const fallback2D = (
    <div className="flex gap-6 justify-center max-w-3xl mx-auto py-8">
      <BottleFallback src="/boket_bottle.jpg" volume={boKetVolume} label="Bồ Kết Shampoo" />
      <BottleFallback src="/ginger_bottle.jpg" volume={gingerVolume} label="Ginger Shampoo" />
    </div>
  );

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-gradient-to-b from-[#F8F3EE] via-[#EFEAE4] to-[#F8F3EE] text-slate-800 p-4 md:p-6 lg:p-8 font-sans overflow-hidden"
    >
      {/* Background Canvas Particles */}
      <BotanicalParticles />

      {/* Floating botanical laboratory parallax layers */}
      <div 
        style={{ transform: `translate(${mouseCoords.x * -25}px, ${mouseCoords.y * -25}px)` }}
        className="pointer-events-none absolute left-[5%] top-[12%] w-16 h-16 opacity-30 select-none -z-10"
      >
        🍃
      </div>
      <div 
        style={{ transform: `translate(${mouseCoords.x * 20}px, ${mouseCoords.y * 20}px)` }}
        className="pointer-events-none absolute right-[10%] top-[40%] w-12 h-12 opacity-25 select-none -z-10 text-xl"
      >
        🌿
      </div>
      <div 
        style={{ transform: `translate(${mouseCoords.x * -15}px, ${mouseCoords.y * -15}px)` }}
        className="pointer-events-none absolute left-[8%] bottom-[15%] w-14 h-14 opacity-25 select-none -z-10 text-lg"
      >
        🌾
      </div>

      {/* Main Grid: Left Section (76%), Right AI Panel (24%) */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.5fr] max-w-[1700px] mx-auto">
        
        {/* Left dashboard space */}
        <div className="space-y-6">
          
          {/* Top Navbar details */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-300/40 pb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#0f5132] tracking-tight flex items-center gap-2">
                WebSen <span className="text-xs font-semibold uppercase bg-primary text-white px-2.5 py-1 rounded-full tracking-widest">3D Real-time Inventory</span>
              </h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Premium Herbal Shampoo Laboratory Dashboard</p>
            </div>
            <button 
              onClick={fetchStats}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-md hover:bg-white/60 transition shrink-0"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Full-width Product Slider Banner Animation */}
          <div className={`relative w-full h-44 md:h-40 rounded-[32px] border transition-all duration-1000 bg-white/40 shadow-soft backdrop-blur-md overflow-hidden p-6 select-none flex items-center ${slides[currentSlide].borderColor}`}>
            {/* Ambient sliding theme color overlays */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].themeColor} opacity-70 transition-all duration-1000 -z-10`} />

            {/* Shimmer light flare sweep on slide transition */}
            <AnimatePresence>
              <motion.div
                key={`shimmer-${currentSlide}`}
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10 skew-x-12 pointer-events-none"
              />
            </AnimatePresence>

            {/* Decorative background plants */}
            <div className="absolute right-[-10px] top-[-10px] text-7xl opacity-10 pointer-events-none select-none">🌿</div>
            <div className="absolute left-[35%] bottom-[-15px] text-5xl opacity-10 pointer-events-none select-none">🍃</div>

            <div className="flex justify-between items-center w-full gap-6 h-full relative z-10">
              {/* Animated Text Content */}
              <div className="min-w-0 flex-1 space-y-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 25, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -25, filter: "blur(5px)" }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-2"
                  >
                    <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-3 py-1 rounded-full tracking-widest inline-block select-none">
                      Sản phẩm nổi bật
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase truncate">
                      {slides[currentSlide].title}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-xl line-clamp-2">
                      {slides[currentSlide].desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Animated Product Image */}
              <div className="shrink-0 relative">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 1.4, rotate: -15, y: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 15, y: 10 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 90, 
                      damping: 15,
                      opacity: { duration: 0.3 }
                    }}
                    src={slides[currentSlide].image}
                    alt={slides[currentSlide].title}
                    className="h-28 md:h-32 w-28 md:w-32 rounded-2xl object-contain filter drop-shadow-lg bg-transparent transform"
                  />
                </AnimatePresence>
              </div>
            </div>

            {/* Indicator dots */}
            <div className="absolute right-6 bottom-4 flex gap-1.5 z-10">
              {slides.map((_, i) => (
                <span
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentSlide === i ? "bg-primary w-4" : "bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 3D Bottle Fluid Simulation Container */}
          <section className="relative rounded-[40px] border border-white/40 bg-[#FAF6F0]/45 p-6 md:p-8 shadow-soft backdrop-blur-md">
            
            {/* Cutaway mode toggle control */}
            <div className="absolute top-6 right-6 z-10 flex gap-2">
              <button
                onClick={() => setCutaway(!cutaway)}
                className={`inline-flex h-9 items-center gap-1.5 px-4 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all backdrop-blur-md shadow-sm select-none ${
                  cutaway 
                    ? "bg-[#0f5132]/10 border-[#0f5132]/40 text-[#0f5132] hover:bg-[#0f5132]/25 animate-pulse" 
                    : "bg-white/40 border-white/50 text-slate-600 hover:bg-white/60"
                }`}
              >
                <Cpu size={12} />
                {cutaway ? "Mặt Cắt: Bật" : "Mặt Cắt: Tắt"}
              </button>
            </div>

            {/* Glow ring overlays when inventory updates */}
            <div className={`absolute inset-0 transition-opacity duration-700 rounded-[40px] border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 pointer-events-none -z-10 ${
              glowBoket ? "opacity-100" : "opacity-0"
            }`} />
            <div className={`absolute inset-0 transition-opacity duration-700 rounded-[40px] border-2 border-amber-500/40 shadow-2xl shadow-amber-500/10 pointer-events-none -z-10 ${
              glowGinger ? "opacity-100" : "opacity-0"
            }`} />

            <div className="text-center max-w-xl mx-auto mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-[0.22em]">3D Fluid Viscosity Simulation</span>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mt-1">Trữ Lượng Dung Dịch Thực Tế</h2>
              <p className="text-xs text-slate-500 mt-2">
                Được dựng hình dạng chai thủy tinh PBR với mô phỏng chuyển động của chất lỏng đậm đặc (shampoo) trong thời gian thực.
              </p>
            </div>

            {/* Render dynamically loaded 3D Scene under Suspense or fallback directly to 2D */}
            {hasWebGL ? (
              <CanvasErrorBoundary fallback={fallback2D}>
                <React.Suspense fallback={
                  <div className="w-full h-[380px] md:h-[460px] flex items-center justify-center bg-white/10 rounded-[32px] border border-dashed border-slate-300/30">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      <span className="text-xs text-slate-500 font-medium">Đang tải cấu hình 3D...</span>
                    </div>
                  </div>
                }>
                  <LazyThreeDScene boKetFill={boKetFill} gingerFill={gingerFill} cutaway={cutaway} />
                </React.Suspense>
              </CanvasErrorBoundary>
            ) : (
              fallback2D
            )}

            {/* Readout labels directly underneath 3D canvas */}
            <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto mt-4 text-center border-t border-slate-300/30 pt-6">
              {/* Bottle 1 Readout */}
              <div className="space-y-3 relative bg-white/30 border border-white/50 p-5 rounded-[24px] shadow-sm backdrop-blur-md">
                <h3 className="text-base font-black text-[#0f5132] tracking-wider flex items-center justify-center gap-1.5 uppercase">
                  BỒ KẾT
                  {glowBoket && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
                </h3>
                
                <div className="flex justify-between items-baseline px-2">
                  <span className="text-xs font-bold text-slate-500">Current Inventory</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">
                      <CountUp to={boKetVolume} formatter={(v) => typeof v === "number" ? v.toLocaleString() : "0"} /> ml
                    </span>
                    <span className="text-xs font-bold text-primary ml-1.5">
                      ({((boKetVolume || 0) / 1000).toFixed(1)} L)
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-slate-200/50 rounded-full h-3 overflow-hidden shadow-inner border border-slate-300/30">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${boKetFill * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="bg-gradient-to-r from-[#2c1e15] to-[#16a34a] h-full rounded-full shadow-lg"
                  />
                </div>

                <div className="flex justify-between text-[11px] font-bold text-slate-500 px-1">
                  <span>Fill Level: <CountUp to={boKetFill * 100} formatter={(v) => typeof v === "number" ? `${v.toFixed(1)}%` : "0%"} /></span>
                  <span>Capacity: 20L</span>
                </div>
              </div>

              {/* Bottle 2 Readout */}
              <div className="space-y-3 relative bg-white/30 border border-white/50 p-5 rounded-[24px] shadow-sm backdrop-blur-md">
                <h3 className="text-base font-black text-amber-700 tracking-wider flex items-center justify-center gap-1.5 uppercase">
                  GỪNG
                  {glowGinger && <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
                </h3>
                
                <div className="flex justify-between items-baseline px-2">
                  <span className="text-xs font-bold text-slate-500">Current Inventory</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">
                      <CountUp to={gingerVolume} formatter={(v) => typeof v === "number" ? v.toLocaleString() : "0"} /> ml
                    </span>
                    <span className="text-xs font-bold text-amber-700 ml-1.5">
                      ({((gingerVolume || 0) / 1000).toFixed(1)} L)
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-slate-200/50 rounded-full h-3 overflow-hidden shadow-inner border border-slate-300/30">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${gingerFill * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="bg-gradient-to-r from-[#f0ba42] to-amber-500 h-full rounded-full shadow-lg"
                  />
                </div>

                <div className="flex justify-between text-[11px] font-bold text-slate-500 px-1">
                  <span>Fill Level: <CountUp to={gingerFill * 100} formatter={(v) => typeof v === "number" ? `${v.toFixed(1)}%` : "0%"} /></span>
                  <span>Capacity: 20L</span>
                </div>
              </div>
            </div>
          </section>

          {/* Premium Glass Dashboard Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Tổng số mặt hàng", value: stats?.totalProducts, format: (v) => typeof v === "number" ? `${v} loại` : "0 loại", icon: Package },
              { label: "Tổng số lượng tồn", value: stats?.totalQuantity, format: (v) => typeof v === "number" ? `${v.toLocaleString()} cái` : "0 cái", icon: ShoppingBag },
              { label: "Giá trị kho hàng", value: stats?.inventoryValue, format: (v) => typeof v === "number" ? `${v.toLocaleString()}đ` : "0đ", icon: TrendingUp },
              { label: "Doanh thu tháng này", value: stats?.monthlyRevenue, format: (v) => typeof v === "number" ? `${v.toLocaleString()}đ` : "0đ", icon: ArrowUpRight },
              { label: "Cảnh báo cạn kho", value: stats?.lowStockCount, format: (v) => typeof v === "number" ? `${v} loại sản phẩm` : "0 loại", icon: AlertTriangle, alert: stats?.lowStockCount > 0 },
              { label: "Dự báo thông minh (AI)", value: stats?.lowStockCount === 0 ? "Ổn định" : "Cần nhập hàng", format: (v) => v, icon: Cpu }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`rounded-[26px] border border-white/50 bg-white/20 p-5 shadow-soft backdrop-blur-md flex items-center justify-between transition-colors ${
                    card.alert ? "border-red-400 bg-red-500/5 shadow-red-200" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.label}</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                      <CountUp to={card.value} formatter={card.format} />
                    </p>
                  </div>
                  <div className={`h-11 w-11 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center ${
                    card.alert ? "text-red-500 animate-bounce" : "text-slate-600"
                  }`}>
                    <Icon size={18} />
                  </div>
                </motion.div>
              );
            })}
          </section>

          {/* Charts Row */}
          <section className="grid gap-6 md:grid-cols-2">
            {/* Chart 1: Giao dịch */}
            <div className="rounded-[32px] border border-white/40 bg-white/30 p-5 shadow-soft backdrop-blur-md">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Nhật ký hoạt động 15 ngày qua</h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.inventoryCharts || []}>
                    <defs>
                      <linearGradient id="importG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="exportG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="imports" name="Nhập kho" stroke="#16a34a" fillOpacity={1} fill="url(#importG)" strokeWidth={2} />
                    <Area type="monotone" dataKey="exports" name="Xuất kho" stroke="#f59e0b" fillOpacity={1} fill="url(#exportG)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Cơ cấu */}
            <div className="rounded-[32px] border border-white/40 bg-white/30 p-5 shadow-soft backdrop-blur-md">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Cơ cấu danh mục</h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.categoryDistribution || []}>
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip formatter={(value) => typeof value === "number" ? `${value.toLocaleString()}đ` : "0đ"} />
                    <Bar dataKey="value" name="Vốn tồn kho" radius={[5, 5, 0, 0]}>
                      {(stats?.categoryDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        {/* Right Sidebar - AI Assistant */}
        <aside className="rounded-[36px] border border-white/50 bg-[#FAF6F0]/60 p-5 shadow-soft backdrop-blur-xl flex flex-col justify-between h-[calc(100vh-6rem)] sticky top-24 min-w-[320px]">
          <div className="flex-1 flex flex-col min-h-0">
            {/* AI Title branding */}
            <div className="flex items-center gap-2 border-b border-slate-300/40 pb-3 mb-3">
              <div className="rounded-xl bg-[#0f5132] p-2 text-white shadow-md">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Trợ lý AI WebSen</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Công cụ điều khiển tự động</p>
              </div>
            </div>

            {/* Messages box */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px]">
              {aiHistory.map((item, i) => (
                <div key={i} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`rounded-2xl px-4 py-2.5 shadow-sm text-xs leading-relaxed max-w-[88%] ${
                    item.role === "user" 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-white border border-slate-200/50 text-slate-800 rounded-tl-none"
                  }`}>
                    <span className={`block text-[9px] uppercase tracking-wider mb-0.5 ${
                      item.role === "user" ? "text-emerald-200" : "text-slate-400"
                    }`}>
                      {item.role === "user" ? "Nhân viên" : "AI WebSen"}
                    </span>
                    <p className="whitespace-pre-wrap">{item.text}</p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none bg-white border border-slate-200/50 px-4 py-2.5 shadow-sm text-xs text-slate-400 flex items-center gap-2">
                    <span className="animate-spin text-primary">⚡</span> AI đang tính toán...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestion triggers */}
            <div className="border-t border-slate-300/40 pt-3 mt-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Đề xuất lệnh nhanh</span>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: "Nhập 300ml bồ kết giá 85k", query: "nhập 300ml bồ kết giá 85k" },
                  { label: "Xuất gừng 500ml 10 cái", query: "xuất gừng 500ml 10 cái" },
                  { label: "Dự báo & Restock kho", query: "dự báo kho hàng" },
                  { label: "Xuất báo cáo tổng hợp", query: "xuất báo cáo" }
                ].map((act, i) => (
                  <button
                    key={i}
                    disabled={aiLoading}
                    onClick={() => handleSendAi(null, act.query)}
                    className="text-left text-xs bg-white border border-slate-200 hover:border-primary/50 rounded-xl px-3 py-2 text-slate-700 transition font-medium hover:text-primary shadow-sm hover:bg-white"
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form prompts input */}
          <form onSubmit={handleSendAi} className="mt-4 flex gap-2">
            <input
              value={aiMsg}
              onChange={(e) => setAiMsg(e.target.value)}
              disabled={aiLoading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="Gửi câu lệnh kho..."
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="rounded-xl bg-primary text-white p-2.5 shadow-md transition hover:bg-slate-900 disabled:opacity-60 flex items-center justify-center"
            >
              <Send size={14} />
            </button>
          </form>
        </aside>

      </div>
    </div>
  );
}
