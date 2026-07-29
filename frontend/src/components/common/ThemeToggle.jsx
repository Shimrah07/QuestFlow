import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-lg border border-slate-900 bg-slate-950/40 hover:bg-slate-900/50 hover:border-slate-800 transition-all cursor-pointer group flex items-center justify-center overflow-hidden ${className}`}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ y: theme === "light" ? 30 : 0, opacity: theme === "light" ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-slate-400 group-hover:text-neon-violet transition-colors"
      >
        <Moon className="w-4.5 h-4.5" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ y: theme === "light" ? 0 : -30, opacity: theme === "light" ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="absolute text-slate-400 group-hover:text-neon-amber transition-colors"
      >
        <Sun className="w-4.5 h-4.5" />
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
