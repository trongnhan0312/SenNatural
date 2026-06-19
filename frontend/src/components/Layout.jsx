import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-secondary">
      <div className="md:flex md:min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Navbar onToggle={() => setOpen((v) => !v)} />
          <main className="flex-1 px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
