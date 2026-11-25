import { Mountains, Lightning, Crown, ShieldCheck } from "@phosphor-icons/react";

/**
 * Achievement rules, shared by the Dashboard and the Leaderboard page.
 * Same unlock conditions as before: level 2, 300 XP, 1000 XP, Manager/Admin role.
 * `progress` returns 0..1 so locked badges can show how close they are.
 */
export const getAchievements = (user) => {
  const level = user?.level || 1;
  const points = user?.points || 0;
  const role = user?.role || "Employee";
  const clamp = (n) => Math.max(0, Math.min(1, n));

  return [
    {
      id: "first-ascent",
      title: "First ascent",
      desc: "Reach level 2",
      icon: Mountains,
      unlocked: level >= 2,
      progress: clamp(points / 500),
      meta: `${Math.min(points, 500)}/500 XP`,
    },
    {
      id: "momentum",
      title: "Momentum",
      desc: "Earn 300 XP",
      icon: Lightning,
      unlocked: points >= 300,
      progress: clamp(points / 300),
      meta: `${Math.min(points, 300)}/300 XP`,
    },
    {
      id: "thousand-club",
      title: "Thousand club",
      desc: "Earn 1,000 XP",
      icon: Crown,
      unlocked: points >= 1000,
      progress: clamp(points / 1000),
      meta: `${Math.min(points, 1000).toLocaleString()}/1,000 XP`,
    },
    {
      id: "reviewer",
      title: "Reviewer",
      desc: "Manager or Admin role",
      icon: ShieldCheck,
      unlocked: role === "Manager" || role === "Admin",
      progress: role === "Manager" || role === "Admin" ? 1 : 0,
      meta: role,
    },
  ];
};
