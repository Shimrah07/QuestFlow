import React, { useState, useEffect } from "react";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { Trophy, Award, Star, Zap } from "lucide-react";

const Gamification = () => {
  const { user: currentUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/users/leaderboard");
        setLeaderboard(response.data);
      } catch (err) {
        console.error("Error loading leaderboard standings:", err);
        setError("Failed to load operations standings. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) return "🥇 Champion";
    if (rank === 2) return "🥈 Elite";
    if (rank === 3) return "🥉 Expert";
    return "🎖️ Challenger";
  };

  // Dynamically calculate achievements based on current user stats/roles
  const userLevel = currentUser?.level || 1;
  const userPoints = currentUser?.points || 0;
  const userRole = currentUser?.role || "Employee";

  const achievements = [
    {
      title: "First Ascent",
      desc: "Achieved Level 2 operational clearance",
      unlocked: userLevel >= 2,
      icon: "⛰️",
    },
    {
      title: "Bug Squash Commando",
      desc: "Accumulated at least 300 XP in operations",
      unlocked: userPoints >= 300,
      icon: "🐞",
    },
    {
      title: "Financial Architect",
      desc: "Accumulated at least 1000 XP in operations ledger",
      unlocked: userPoints >= 1000,
      icon: "🏦",
    },
    {
      title: "Ledger Sentinel",
      desc: "Authorization level of Manager or Admin to block/approve ledgers",
      unlocked: userRole === "Manager" || userRole === "Admin",
      icon: "🛡️",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-neon-emerald uppercase font-display">
          XP Leaderboard & Achievements
        </span>
        <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">
          THE LEADERBOARD GRID
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard panel */}
        <Card glowColor="none" hoverEffect={false} className="lg:col-span-2 bg-bg-card border-slate-900/60">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-neon-amber animate-pulse" />
              Active System Standings
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner size="lg" color="emerald" />
              <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                Accessing operations ledger...
              </span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-neon-rose/10 border border-neon-rose/30 text-rose-400 text-xs font-semibold text-center">
              {error}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {leaderboard.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs uppercase tracking-wider">
                  No active operations logs found.
                </div>
              ) : (
                leaderboard.map((user, idx) => {
                  const rank = idx + 1;
                  const isSelf = currentUser?.id === user.id;
                  return (
                    <div
                      key={user.id}
                      className={`
                        flex items-center justify-between p-3 px-4 rounded-xl border transition-all duration-300
                        ${
                          isSelf
                            ? "border-neon-violet/30 bg-neon-violet/10 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                            : rank === 1
                            ? "border-neon-amber/25 bg-neon-amber/5"
                            : "border-slate-900/40 bg-slate-950/20"
                        }
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`font-display font-extrabold text-sm font-mono ${
                            rank === 1
                              ? "text-neon-amber font-display text-base"
                              : isSelf
                              ? "text-neon-violet"
                              : "text-slate-500"
                          }`}
                        >
                          #{rank}
                        </span>

                        <div className="w-9 h-9 rounded-lg bg-slate-950/60 border border-slate-900 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
                          {user.first_name.charAt(0)}
                        </div>

                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${isSelf ? "text-neon-violet" : "text-slate-200"}`}>
                            {user.first_name} {isSelf && "(You)"}
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase font-mono mt-0.5">
                            {user.role} • Level {Math.floor(user.points / 500) + 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neon-emerald/10 border border-neon-emerald/25 text-neon-emerald font-mono uppercase tracking-wider">
                          {getRankBadge(rank)}
                        </span>
                        <span className="text-xs font-bold text-slate-200 font-mono">
                          {user.points.toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Card>

        {/* Badges and achievements status */}
        <Card glowColor="violet" hoverEffect={false} className="bg-bg-card border-slate-900/60 flex flex-col gap-6">
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-neon-violet" />
              Achievements Gallery
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
              Acquired medals in operations
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {achievements.map((badge, idx) => (
              <div
                key={idx}
                className={`
                  flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-300
                  ${
                    badge.unlocked
                      ? "border-neon-violet/20 bg-neon-violet/5 text-slate-200"
                      : "border-slate-900/60 bg-slate-950/40 opacity-40"
                  }
                `}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    badge.unlocked
                      ? "bg-neon-violet/10 border border-neon-violet/20"
                      : "bg-slate-900 border border-slate-800"
                  }`}
                >
                  {badge.icon}
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold">{badge.title}</span>
                  <span className="text-[9px] leading-relaxed text-slate-400">
                    {badge.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Gamification;

