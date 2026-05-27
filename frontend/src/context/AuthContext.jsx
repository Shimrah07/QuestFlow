import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "./ToastContext";
import AuthService from "../services/auth";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    // Resolve any pre-existing active session on startup
    const activeUser = AuthService.getCurrentUser();
    if (activeUser) {
      setUser(activeUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await AuthService.login(email, password);
      setUser(data.user);
      showToast(`Welcome back, ${data.user.first_name}!`, "success");
      setLoading(false);
      return { success: true, role: data.user.role };
    } catch (error) {
      const errMsg = error.response?.data?.detail || error.message || "Authentication failed.";
      showToast(errMsg, "error");
      setLoading(false);
      return { success: false, error: errMsg };
    }
  };

  const register = async (email, name, password, role) => {
    setLoading(true);
    try {
      const data = await AuthService.register(email, name, password, role);
      showToast("Registration successful! Identity created, please log in.", "success");
      setLoading(false);
      return { success: true };
    } catch (error) {
      const errMsg = error.response?.data?.detail || error.message || "Registration failed.";
      showToast(errMsg, "error");
      setLoading(false);
      return { success: false, error: errMsg };
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    showToast("Session connection terminated.", "info");
  };

  // Gamification: helper to simulate XP increments in UI
  const gainXP = (xpAmount) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return null;
      const nextPoints = prev.points + xpAmount;
      const nextLevel = Math.floor(nextPoints / 500) + 1; // 500 XP per level
      
      if (nextLevel > prev.level) {
        showToast(`LEVEL UP! You reached Level ${nextLevel}! 🚀`, "success");
      } else {
        showToast(`+${xpAmount} XP Gained!`, "info");
      }

      const updated = {
        ...prev,
        points: nextPoints,
        level: nextLevel
      };
      localStorage.setItem("cyber_session", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, gainXP }}>
      {children}
    </AuthContext.Provider>
  );
};
