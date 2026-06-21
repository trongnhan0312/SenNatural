import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import AIChat from "../pages/AIChat";

export default function Layout({ children }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#F8F3EE] text-[#1e293b] relative overflow-hidden">
      {/* Subtle organic background backdrop */}
      <div 
        className="pointer-events-none absolute -inset-10 bg-[url('/boket.jpg')] bg-cover bg-center opacity-[0.06] blur-3xl -z-10" 
      />
      <div className="lg:flex lg:min-h-screen relative z-10">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar onToggle={() => setOpen((v) => !v)} />
          <main className="flex-1 px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6">
            {children}
          </main>
        </div>
      </div>
      <AIChat />
    </div>
  );
}
