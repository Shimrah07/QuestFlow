import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { Moon, Sun } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";

/** Icon button that crossfades between sun and moon with a slight rotation. */
const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn btn-ghost btn-icon relative overflow-hidden ${className}`}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Dark theme" : "Light theme"}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -60, scale: 0.8, filter: "blur(2px)" }}
          animate={{ opacity: 1, rotate: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, rotate: 60, scale: 0.8, filter: "blur(2px)" }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="grid place-items-center"
        >
          {isLight ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

export default ThemeToggle;
