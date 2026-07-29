import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // Load user-specific notifications or seed default ones when user logs in
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`notifications_${user.id}`);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        // Seed default notifications for the user role
        const defaultNotifications = [
          {
            id: "welcome",
            title: "Welcome aboard, " + user.first_name + "!",
            description: `You are authenticated as ${user.role}. Start tracking tasks and expenses.`,
            time: "Just now",
            read: false,
            type: "info",
          },
          {
            id: "protocol",
            title: "Security Session Established",
            description: "Your session token has been securely generated.",
            time: "2 mins ago",
            read: false,
            type: "success",
          }
        ];
        // Admin gets system reports notification
        if (user.role === "Admin") {
          defaultNotifications.push({
            id: "admin-tip",
            title: "Admin Panel Active",
            description: "You have full access to manage projects, users, and view system reports.",
            time: "5 mins ago",
            read: false,
            type: "warning",
          });
        }
        setNotifications(defaultNotifications);
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(defaultNotifications));
      }
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Persist notifications to local storage on changes
  const saveNotifications = (newNotifications) => {
    setNotifications(newNotifications);
    if (user) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(newNotifications));
    }
  };

  const addNotification = (title, description, type = "info") => {
    const newNotif = {
      id: Date.now().toString(),
      title,
      description,
      time: "Just now",
      read: false,
      type,
    };
    saveNotifications([newNotif, ...notifications]);
  };

  const markAsRead = (id) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        hasUnread,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
