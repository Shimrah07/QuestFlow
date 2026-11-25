import {
  SquaresFour,
  Kanban,
  Receipt,
  SealCheck,
  Trophy,
  UsersThree,
  FolderSimple,
  ChartBar,
  Flag,
} from "@phosphor-icons/react";

/** Single source of truth for nav items, their role access and page titles. */
export const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: SquaresFour, roles: ["Admin", "Manager", "Employee"] },
      { to: "/tasks", label: "Tasks", icon: Kanban, roles: ["Admin", "Manager", "Employee"] },
      { to: "/expenses", label: "Expenses", icon: Receipt, roles: ["Admin", "Manager", "Employee"] },
      { to: "/approvals", label: "Approvals", icon: SealCheck, roles: ["Admin", "Manager"], badgeKey: "pending" },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/quests", label: "Quests", icon: Flag, roles: ["Admin", "Manager", "Employee"] },
      { to: "/gamification", label: "Leaderboard", icon: Trophy, roles: ["Admin", "Manager", "Employee"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/admin/users", label: "Users", icon: UsersThree, roles: ["Admin"] },
      { to: "/admin/projects", label: "Projects", icon: FolderSimple, roles: ["Admin"] },
      { to: "/admin/reports", label: "Reports", icon: ChartBar, roles: ["Admin"] },
    ],
  },
];

export const pageTitleFor = (pathname) => {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return item.label;
    }
  }
  return "Dashboard";
};
