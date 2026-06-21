import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

// Individual 3D Bottle component
function Bottle3D({ type, fill, cutaway, position }) {
  const groupRef = useRef();
  const liquidRef = useRef();
  
  // Dynamic color selection
  const liquidColor = type === "boket" ? "#3b1e08" : "#d97706";
  const capColor = "#d4af37"; // Luxury Gold metallic
  
  // Wave/liquid level animations
  const currentHeight = useRef(fill * 2.4);

  useFrame((state) => {
    // Smooth transition for liquid level changes
    const targetHeight = fill * 2.4;
    currentHeight.current = THREE.MathUtils.lerp(currentHeight.current, targetHeight, 0.08);
    
    if (liquidRef.current) {
      // Scale and position the liquid cylinder based on current height
      liquidRef.current.scale.y = Math.max(0.001, currentHeight.current);
      liquidRef.current.position.y = -1.2 + currentHeight.current / 2;
    }

    // Slowly rotate the entire bottle for showroom feel
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {/* 1. Gold pump dispenser cap */}
      {/* Cap collar */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.12, 32]} />
        <meshStandardMaterial color={capColor} metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, 1.48, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />
        <meshStandardMaterial color={capColor} metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Pump head */}
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[0.42, 0.14, 0.24]} />
        <meshStandardMaterial color={capColor} metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Nozzle */}
      <mesh position={[-0.24, 1.62, 0]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.03, 0.05, 0.22, 12]} />
        <meshStandardMaterial color={capColor} metalness={0.9} roughness={0.15} />
      </mesh>

      {/* 2. Inner Liquid Content */}
      {fill > 0.001 && (
        <mesh ref={liquidRef} position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 1.0, 32]} />
          <meshStandardMaterial 
            color={liquidColor} 
            roughness={0.18}
            metalness={0.1}
            transparent
            opacity={0.88}
          />
        </mesh>
      )}

      {/* 3. Outer Glass Bottle Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 2.5, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          transparent
          opacity={0.24}
          transmission={0.9} 
          roughness={0.06} 
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          ior={1.48}
          thickness={0.8}
        />
      </mesh>

      {/* Beaker graduation lines if cutaway mode is active */}
      {cutaway && (
        <group position={[0, 0, 0.66]}>
          {Array.from({ length: 5 }).map((_, i) => {
            const y = -1.2 + (i * 2.4) / 4;
            const volumeLiters = i * 5; // representing 0, 5, 10, 15, 20 Liters
            return (
              <group position={[0, y, 0]} key={i}>
                {/* Horizontal line mark */}
                <mesh>
                  <boxGeometry args={[0.18, 0.015, 0.01]} />
                  <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
                </mesh>
                {/* Text Label */}
                <Html 
                  distanceFactor={3.8} 
                  position={[0.22, 0.02, 0]} 
                  style={{ 
                    color: "rgba(255, 255, 255, 0.85)", 
                    fontSize: "8.5px", 
                    fontFamily: "monospace", 
                    fontWeight: "bold",
                    pointerEvents: "none",
                    whiteSpace: "nowrap"
                  }}
                >
                  <span>{volumeLiters}L</span>
                </Html>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

// Procedural floating botanical items
function FloatingLeaf3D({ position, speed, delay }) {
  const ref = useRef();
  
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.getElapsedTime() * speed + delay;
      ref.current.position.y = position[1] + Math.sin(time) * 0.25;
      ref.current.rotation.x = Math.sin(time * 0.4) * 0.3;
      ref.current.rotation.y = time * 0.18;
      ref.current.rotation.z = Math.cos(time * 0.3) * 0.15;
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <dodecahedronGeometry args={[0.16, 1]} />
        <meshStandardMaterial color="#15803d" roughness={0.65} metalness={0.05} />
      </mesh>
    </group>
  );
}

function FloatingGinger3D({ position, speed, delay }) {
  const ref = useRef();
  
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.getElapsedTime() * speed + delay;
      ref.current.position.y = position[1] + Math.sin(time * 0.8) * 0.2;
      ref.current.rotation.x = time * 0.12;
      ref.current.rotation.y = Math.cos(time * 0.5) * 0.25;
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 0.03, 16]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  );
}

function FloatingBerry3D({ position, speed, delay }) {
  const ref = useRef();
  
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.getElapsedTime() * speed + delay;
      ref.current.position.y = position[1] + Math.sin(time * 1.1) * 0.18;
      ref.current.rotation.y = time * 0.3;
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#111827" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

export default function ThreeDScene({ boKetFill, gingerFill, cutaway }) {
  const [width, setWidth] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const cameraZ = width < 640 ? 5.2 : 4.2;
  const spacing = width < 480 ? 0.92 : 1.15;

  return (
    <div className="w-full h-[380px] md:h-[460px] relative select-none rounded-[32px] overflow-hidden border border-white/20 bg-white/10 backdrop-blur-md shadow-inner">
      <Canvas
        camera={{ position: [0, 0, cameraZ], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Showcase Lighting Setup */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 12, 6]} intensity={1.1} castShadow />
        <pointLight position={[-6, 6, -6]} intensity={0.8} color="#ffffff" />
        <spotLight position={[0, 8, 0]} intensity={1.4} penumbra={1} angle={0.4} />

        {/* Showcase Bottles */}
        <group position={[0, -0.1, 0]}>
          <Bottle3D type="boket" fill={boKetFill} cutaway={cutaway} position={[-spacing, 0, 0]} />
          <Bottle3D type="ginger" fill={gingerFill} cutaway={cutaway} position={[spacing, 0, 0]} />
        </group>

        {/* Floating 3D botanical items in space */}
        <FloatingLeaf3D position={[-2.1, 1.0, -0.5]} speed={1.1} delay={0} />
        <FloatingLeaf3D position={[2.2, 0.6, -0.6]} speed={0.85} delay={2.2} />
        <FloatingLeaf3D position={[-1.7, -0.8, 0.4]} speed={1.3} delay={1.1} />
        <FloatingLeaf3D position={[1.8, -1.0, 0.5]} speed={1.0} delay={3.5} />

        <FloatingGinger3D position={[2.1, 1.2, -0.2]} speed={0.9} delay={0.6} />
        <FloatingGinger3D position={[-2.0, -0.2, 0.3]} speed={1.1} delay={1.8} />

        <FloatingBerry3D position={[-1.3, 1.3, 0.1]} speed={1.4} delay={0.4} />
        <FloatingBerry3D position={[1.4, -0.8, -0.3]} speed={1.0} delay={1.9} />

        {/* Orbit Controls for Zooming, Rotating, and Exploring */}
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          minDistance={2.2}
          maxDistance={6.5}
        />
      </Canvas>

      {/* Floating UX Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-white/80 font-semibold tracking-wider uppercase select-none">
        🖱️ Click & Drag để xoay | Scroll để zoom
      </div>
    </div>
  );
}
