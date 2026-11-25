import React, { createContext, useContext, useCallback } from "react";
import { Toaster, toast } from "sonner";
import { useTheme } from "./ThemeContext";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

/**
 * Same API as before: showToast(message, type = "success", duration = 4000).
 * Backed by Sonner. Identical messages are de-duplicated by id so a repeated
 * action refreshes the existing toast instead of stacking copies.
 */
export const ToastProvider = ({ children }) => {
  const { theme } = useTheme();

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    const text = typeof message === "string" ? message : String(message ?? "");
    const fn = { success: toast.success, error: toast.error, warning: toast.warning, info: toast.info }[type] || toast;
    fn(text, { id: `${type}:${text}`, duration });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        theme={theme === "light" ? "light" : "dark"}
        position="bottom-right"
        closeButton
        gap={8}
        offset={20}
        mobileOffset={12}
        toastOptions={{
          classNames: {
            toast: "qf-toast",
            title: "qf-toast-title",
          },
        }}
        style={{ zIndex: 70 }}
      />
    </ToastContext.Provider>
  );
};
