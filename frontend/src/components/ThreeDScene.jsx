import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// SVG Premium Luxury Cosmetic Showcase Bottle Component
const SvgBottle = ({ fill, type, cutaway }) => {
  const [clicked, setClicked] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  // Trigger active bubble stream during stock updates
  const [isChanging, setIsChanging] = React.useState(false);
  const prevFillRef = React.useRef(fill);

  React.useEffect(() => {
    if (fill !== prevFillRef.current) {
      setIsChanging(true);
      const timer = setTimeout(() => setIsChanging(false), 2200);
      prevFillRef.current = fill;
      return () => clearTimeout(timer);
    }
  }, [fill]);

  // Stable bubble lists to prevent rendering glitches on state updates
  const idleBubbles = React.useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: `idle-${i}`,
      r: Math.random() * 2 + 1,
      x: Math.random() * 105 + 37,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 3.2,
    }));
  }, []);

  const activeBubbles = React.useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: `active-${i}`,
      r: Math.random() * 2.5 + 1.2,
      x: Math.random() * 105 + 37,
      delay: Math.random() * 1.5,
      duration: Math.random() * 1.5 + 1.6, // Float faster
    }));
  }, []);

  // Liquid color configurations
  const colors = {
    boket: {
      top: "#24140b",
      bottom: "#050302",
      backTop: "#1a0d07",
      backBottom: "#020100",
      transmit: "#5c3a21",
    },
    ginger: {
      top: "#fbbf24",
      bottom: "#d97706",
      backTop: "#f59e0b",
      backBottom: "#b45309",
      transmit: "#fde047",
    }
  }[type];

  // Liquid Y positioning inside bottle cavity:
  // Empty = 320, Full = 65 -> range of 255px
  const targetY = 320 - (fill * 255);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => setClicked(!clicked)}
      whileHover={{ 
        rotate: [0, 2.0, -2.0, 0],
        transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
      }}
      animate={{ 
        y: [0, -5, 0],
        scale: clicked ? 1.14 : 1.0
      }}
      transition={{
        y: { repeat: Infinity, duration: 4.8, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 120, damping: 14 }
      }}
      className="w-[185px] h-[370px] cursor-pointer relative select-none"
    >
      {/* Glow highlight effect that triggers on stock changes */}
      <AnimatePresence>
        {isChanging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1.05 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            style={{ borderColor: colors.transmit, boxShadow: `0 0 35px ${colors.transmit}` }}
            className="absolute inset-0 border-2 rounded-[40px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <svg
        viewBox="0 0 180 365"
        className="w-full h-full filter drop-shadow-2xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Floor shadow */}
          <radialGradient id="floor-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Showroom pedestal gradients */}
          <linearGradient id="platform-base-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#111827" />
            <stop offset="30%" stopColor="#374151" />
            <stop offset="50%" stopColor="#4b5563" />
            <stop offset="70%" stopColor="#374151" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          <radialGradient id="platform-top-grad" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>

          {/* Cap gold metallic gradient */}
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9a3412" />
            <stop offset="25%" stopColor="#ca8a04" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="75%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>

          {/* Thick Glass Refraction shading */}
          <linearGradient id="glass-back-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.18)" />
            <stop offset="25%" stopColor="rgba(255, 255, 255, 0.04)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="75%" stopColor="rgba(255, 255, 255, 0.04)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.18)" />
          </linearGradient>

          <linearGradient id="glass-front-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>

          {/* Liquid Gradients */}
          <linearGradient id={`liquid-front-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.top} stopOpacity={type === "ginger" ? 0.88 : 1.0} />
            <stop offset="100%" stopColor={colors.bottom} stopOpacity={type === "ginger" ? 0.96 : 1.0} />
          </linearGradient>

          <linearGradient id={`liquid-back-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.backTop} stopOpacity={type === "ginger" ? 0.84 : 1.0} />
            <stop offset="100%" stopColor={colors.backBottom} stopOpacity={type === "ginger" ? 0.92 : 1.0} />
          </linearGradient>

          {/* Dynamic Clipping cavity path */}
          <clipPath id={`cavity-clip-${type}`}>
            <path d="M 65 82 L 65 55 L 115 55 L 115 82 C 145 92 155 110 155 125 L 155 310 C 155 318 148 322 140 322 L 40 322 C 32 322 25 318 25 310 L 25 125 C 25 110 35 92 65 82 Z" />
          </clipPath>
        </defs>

        {/* 1. Floor shadow & circular glass podium */}
        <ellipse cx="90" cy="336" rx="80" ry="14" fill="url(#floor-shadow)" opacity={0.4} />

        {/* Base columns */}
        <path 
          d="M 15 328 C 15 340 165 340 165 328 L 165 338 C 165 346 15 346 15 338 Z" 
          fill="url(#platform-base-grad)" 
        />
        {/* Top platform lid */}
        <ellipse cx="90" cy="328" rx="75" ry="10" fill="url(#platform-top-grad)" stroke="#1f2937" strokeWidth="1" />
        
        {/* Platform circular gold trims */}
        <ellipse cx="90" cy="328" rx="75" ry="10" fill="none" stroke="url(#gold-grad)" strokeWidth="0.8" />
        <ellipse cx="90" cy="328" rx="66" ry="7.5" fill="none" stroke={type === "boket" ? "#5c3a21" : "#fbbf24"} strokeWidth="2.0" opacity={0.35} />

        {/* 2. Glass Back Cavity Wall */}
        <path 
          d="M 65 82 L 65 55 L 115 55 L 115 82 C 145 92 155 110 155 125 L 155 310 C 155 318 148 322 140 322 L 40 322 C 32 322 25 318 25 310 L 25 125 C 25 110 35 92 65 82 Z" 
          fill="url(#glass-back-grad)"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />

        {/* 3. Liquid Content (Masked Inside Cavity) */}
        <g clipPath={`url(#cavity-clip-${type})`}>
          {/* Dynamic rising/falling liquid group */}
          <motion.g
            animate={{ y: targetY }}
            transition={{ type: "spring", stiffness: 45, damping: 10.5 }}
          >
            {/* Back Wave Layer (darker, scrolling reverse) */}
            <motion.path
              d="M 0 10 Q 50 0 100 10 Q 150 20 200 10 Q 250 0 300 10 Q 350 20 400 10 L 400 350 L 0 350 Z"
              fill={`url(#liquid-back-${type})`}
              animate={{ x: [-200, 0] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 5.5 }}
            />

            {/* Front Wave Layer (main color, scrolling normal) */}
            <motion.path
              d="M 0 10 Q 50 20 100 10 Q 150 0 200 10 Q 250 20 300 10 Q 350 0 400 10 L 400 350 L 0 350 Z"
              fill={`url(#liquid-front-${type})`}
              animate={{ x: [0, -200] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 3.8 }}
            />

            {/* Glossy menicus shine highlight along the wave surface */}
            <motion.path
              d="M 0 10 Q 50 20 100 10 Q 150 0 200 10 Q 250 20 300 10 Q 350 0 400 10"
              fill="none"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="2.8"
              animate={{ x: [0, -200] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 3.8 }}
            />

            {/* Rising Bubbles inside Liquid */}
            {idleBubbles.map((b) => (
              <motion.circle
                key={b.id}
                cx={b.x}
                cy={310}
                r={b.r}
                fill="rgba(255, 255, 255, 0.28)"
                animate={{ cy: [310, 20], opacity: [0, 0.55, 0.55, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: b.duration,
                  delay: b.delay,
                  ease: "easeInOut"
                }}
              />
            ))}

            {/* Extra active bubbles (fade-in during volume changes) */}
            {activeBubbles.map((b) => (
              <motion.circle
                key={b.id}
                cx={b.x}
                cy={310}
                r={b.r}
                fill="rgba(255, 255, 255, 0.45)"
                animate={{ 
                  cy: [310, 20], 
                  opacity: isChanging ? [0, 0.75, 0.75, 0] : 0 
                }}
                transition={{
                  repeat: Infinity,
                  duration: b.duration,
                  delay: b.delay,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.g>

          {/* Scientific beaker measuring scale (Rendered only in Cutaway Mode) */}
          {cutaway && (
            <g className="scientific-scale" opacity={0.78}>
              {/* Dotted indicator line */}
              <line x1="38" y1="65" x2="38" y2="320" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.2" strokeDasharray="3,3" />
              
              {/* Scientific Grid Ticks */}
              {[
                { y: 320, label: "0L (Empty)" },
                { y: 256, label: "5L (25%)" },
                { y: 192, label: "10L (50%)" },
                { y: 128, label: "15L (75%)" },
                { y: 65, label: "20L (Full)" }
              ].map((tick, index) => (
                <g key={index}>
                  <line x1="38" y1={tick.y} x2="46" y2={tick.y} stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.2" />
                  <text 
                    x="50" 
                    y={tick.y + 3.2} 
                    fill="rgba(255, 255, 255, 0.7)" 
                    fontSize="7.5" 
                    fontFamily="monospace" 
                    fontWeight="bold"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}
            </g>
          )}
        </g>

        {/* 4. Glass Front Shell Outline & Reflections */}
        {/* Outer glass border with stroke */}
        <path 
          d="M 62 82 L 62 52 L 118 52 L 118 82 C 150 92 160 110 160 125 L 160 312 C 160 322 150 325 142 325 L 38 325 C 30 325 20 322 20 312 L 20 125 C 20 110 30 92 62 82 Z" 
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="2.5"
          opacity={cutaway ? 0.35 : 0.8}
        />

        {/* Glossy vertical reflection capsule (left side shine) */}
        <path 
          d="M 28 135 C 26 135 25 140 25 145 L 25 300 C 25 305 26 310 28 310 Z" 
          fill="url(#glass-front-highlight)" 
          opacity={cutaway ? 0.15 : 0.75}
        />

        {/* Curved shoulder reflection sweep */}
        <path
          d="M 32 130 Q 50 105 72 90"
          fill="none"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity={cutaway ? 0.12 : 0.65}
        />

        {/* Right side thin glossy highlight */}
        <path
          d="M 152 145 L 152 295"
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity={cutaway ? 0.1 : 0.5}
        />

        {/* Neck vertical specular shine */}
        <rect 
          x="69" 
          y="56" 
          width="4" 
          height="22" 
          rx="1" 
          fill="rgba(255, 255, 255, 0.3)" 
          opacity={cutaway ? 0.1 : 0.6}
        />

        {/* 5. Gold Dispenser Pump Cap */}
        <g id="pump-cap">
          {/* Base gold cylinder ring */}
          <path 
            d="M 62 48 C 62 51 118 51 118 48 L 118 55 C 118 58 62 58 62 55 Z" 
            fill="url(#gold-grad)" 
          />
          <ellipse cx="90" cy="48" rx="28" ry="3.5" fill="url(#gold-grad)" stroke="#78350f" strokeWidth="0.5" />
          
          {/* Metallic stem segment */}
          <rect x="85" y="37" width="10" height="9" fill="url(#gold-grad)" stroke="#78350f" strokeWidth="0.5" />
          
          {/* Pump head block */}
          <rect x="74" y="23" width="32" height="14" rx="2" fill="url(#gold-grad)" stroke="#78350f" strokeWidth="0.5" />
          <ellipse cx="90" cy="23" rx="16" ry="2.2" fill="url(#gold-grad)" stroke="#78350f" strokeWidth="0.5" />
          
          {/* Dispenser nozzle pointing forward-left */}
          <path 
            d="M 76 25 L 56 29 C 54 29.5 54 31.5 56 32 L 76 34 Z" 
            fill="url(#gold-grad)" 
            stroke="#78350f" 
            strokeWidth="0.5" 
          />
        </g>
      </svg>
    </motion.div>
  );
};

// 3D-styled Parallax background elements
const FloatingLeaf = ({ x, y, rotate, delay, parallaxCoords }) => {
  return (
    <motion.div
      style={{
        x: parallaxCoords.x * -25,
        y: parallaxCoords.y * -25,
        left: x,
        top: y,
        position: "absolute",
        zIndex: -1,
        opacity: 0.25
      }}
      animate={{
        y: [y, y - 8, y],
        rotate: [rotate, rotate + 4, rotate],
      }}
      transition={{
        repeat: Infinity,
        duration: 5,
        delay,
        ease: "easeInOut",
      }}
      className={`absolute pointer-events-none select-none text-2xl filter drop-shadow-md`}
    >
      🍃
    </motion.div>
  );
};

const FloatingGingerSlice = ({ x, y, rotate, delay, parallaxCoords }) => {
  return (
    <motion.div
      style={{
        x: parallaxCoords.x * 20,
        y: parallaxCoords.y * 20,
        left: x,
        top: y,
        position: "absolute",
        zIndex: -1,
        opacity: 0.22
      }}
      animate={{
        y: [y, y - 10, y],
        rotate: [rotate, rotate - 5, rotate],
      }}
      transition={{
        repeat: Infinity,
        duration: 6,
        delay,
        ease: "easeInOut",
      }}
      className="absolute pointer-events-none select-none text-xl filter drop-shadow-sm"
    >
      🥔
    </motion.div>
  );
};

const FloatingSoapberry = ({ x, y, delay, parallaxCoords }) => {
  return (
    <motion.div
      style={{
        x: parallaxCoords.x * -15,
        y: parallaxCoords.y * -15,
        left: x,
        top: y,
        position: "absolute",
        zIndex: -1,
        opacity: 0.2
      }}
      animate={{
        y: [y, y - 6, y],
      }}
      transition={{
        repeat: Infinity,
        duration: 4,
        delay,
        ease: "easeInOut",
      }}
      className="absolute pointer-events-none select-none text-lg filter drop-shadow-sm"
    >
      ⚫
    </motion.div>
  );
};

// SVG Scene Layout exporting two bottles side-by-side with full parallax environment
export default function ThreeDScene({ boKetFill, gingerFill, cutaway }) {
  const [parallaxCoords, setParallaxCoords] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) - 0.5;
    const y = (e.clientY / window.innerHeight) - 0.5;
    setParallaxCoords({ x, y });
  };

  React.useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="w-full h-[380px] md:h-[460px] flex justify-center items-center gap-10 md:gap-20 py-4 relative select-none overflow-hidden">
      
      {/* 3D-style Floating Organic Botanical Elements inside visual space */}
      {/* Leaves */}
      <FloatingLeaf x="15%" y={40} rotate={15} delay={0.2} parallaxCoords={parallaxCoords} />
      <FloatingLeaf x="80%" y={120} rotate={-10} delay={0.8} parallaxCoords={parallaxCoords} />
      <FloatingLeaf x="35%" y={300} rotate={25} delay={1.4} parallaxCoords={parallaxCoords} />
      <FloatingLeaf x="68%" y={260} rotate={-20} delay={2.0} parallaxCoords={parallaxCoords} />

      {/* Ginger slices (represented by textured circles) */}
      <FloatingGingerSlice x="75%" y={60} rotate={45} delay={0.5} parallaxCoords={parallaxCoords} />
      <FloatingGingerSlice x="20%" y={220} rotate={-30} delay={1.2} parallaxCoords={parallaxCoords} />

      {/* Soapberries (dark obsidian spheres) */}
      <FloatingSoapberry x="28%" y={90} delay={0.3} parallaxCoords={parallaxCoords} />
      <FloatingSoapberry x="82%" y={280} delay={1.6} parallaxCoords={parallaxCoords} />

      {/* Showcase Bottles */}
      <div className="flex flex-col items-center">
        <SvgBottle 
          fill={boKetFill} 
          type="boket" 
          cutaway={cutaway} 
        />
      </div>
      <div className="flex flex-col items-center">
        <SvgBottle 
          fill={gingerFill} 
          type="ginger" 
          cutaway={cutaway} 
        />
      </div>
    </div>
  );
}
