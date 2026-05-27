import React from "react";
import { motion } from "framer-motion";

const Spinner = ({ size = "md", color = "violet" }) => {
  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "w-6 h-6 border-2";
      case "lg":
        return "w-16 h-16 border-4";
      default:
        return "w-10 h-10 border-3";
    }
  };

  const getColorStyles = () => {
    switch (color) {
      case "emerald":
        return "border-t-neon-emerald border-r-neon-emerald/30 border-b-transparent border-l-transparent";
      case "amber":
        return "border-t-neon-amber border-r-neon-amber/30 border-b-transparent border-l-transparent";
      case "rose":
        return "border-t-neon-rose border-r-neon-rose/30 border-b-transparent border-l-transparent";
      default:
        return "border-t-neon-violet border-r-neon-violet/30 border-b-transparent border-l-transparent";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Outer Pulsing Glow */}
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inset-0 rounded-full blur-md ${
            color === "emerald" ? "bg-neon-emerald/20" : "bg-neon-violet/20"
          }`}
        />
        
        {/* Spinning HUD Sector */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={`rounded-full ${getSizeStyles()} ${getColorStyles()}`}
        />
      </div>
    </div>
  );
};

export default Spinner;
