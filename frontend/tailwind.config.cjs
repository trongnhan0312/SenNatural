module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "#e2e8f0",
        background: "#f8fafc",
        surface: "#ffffff",
        muted: "#64748b",
        primary: "#0f5132",
        primaryLight: "#d9f7ec",
        secondary: "#0f172a",
        success: "#16a34a",
        info: "#0284c7",
        warning: "#f59e0b",
        danger: "#dc2626",
      },
      boxShadow: {
        soft: "0 24px 60px rgba(15, 23, 42, 0.08)",
        inner: "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-pattern": "radial-gradient(circle at top, rgba(16, 185, 129, 0.12), transparent 24%), radial-gradient(circle at right, rgba(14, 165, 233, 0.08), transparent 18%)",
      },
    },
  },
  plugins: [],
};
