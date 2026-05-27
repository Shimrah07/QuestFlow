import React from "react";
import { motion } from "framer-motion";

const Card = ({
  children,
  className = "",
  glowColor = "violet", // "violet" | "emerald" | "amber" | "rose" | "none"
  hoverEffect = true,
  onClick,
}) => {
  const getGlowStyles = () => {
    switch (glowColor) {
      case "violet":
        return "hover:border-neon-violet/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]";
      case "emerald":
        return "hover:border-neon-emerald/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]";
      case "amber":
        return "hover:border-neon-amber/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]";
      case "rose":
        return "hover:border-neon-rose/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]";
      default:
        return "hover:border-slate-800";
    }
  };

  const getStaticBorder = () => {
    switch (glowColor) {
      case "violet":
        return "border-neon-violet/10";
      case "emerald":
        return "border-neon-emerald/10";
      case "amber":
        return "border-neon-amber/10";
      case "rose":
        return "border-neon-rose/10";
      default:
        return "border-slate-800/40";
    }
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={hoverEffect ? { y: -4, scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      className={`
        glass-card rounded-2xl p-6 border text-slate-100 transition-all duration-300
        ${getStaticBorder()}
        ${hoverEffect ? getGlowStyles() : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

export default Card;
