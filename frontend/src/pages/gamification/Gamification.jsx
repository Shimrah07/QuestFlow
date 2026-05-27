import React from "react";
import Card from "../../components/common/Card";
import { Trophy, Award, Target, Star, Zap } from "lucide-react";

const Gamification = () => {
  const leaderboard = [
    { rank: 1, name: "Aria Sterling", role: "Admin", level: 12, points: "1,540 XP", badge: "🥇 Rank 1" },
    { rank: 2, name: "Kaelen Vance", role: "Manager", level: 7, points: "820 XP", badge: "🥈 Rank 2" },
    { rank: 3, name: "Lyra Thorne", role: "Employee", level: 3, points: "340 XP", badge: "🥉 Rank 3" }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-neon-emerald uppercase font-display">XP Leaderboard & Achievements</span>
        <h1 className="text-2xl font-display font-extrabold text-slate-100 mt-1">THE LEADERBOARD GRID</h1>
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

          <div className="flex flex-col gap-3">
            {leaderboard.map((user, idx) => (
              <div
                key={idx}
                className={`
                  flex items-center justify-between p-3 px-4 rounded-xl border transition-all duration-300
                  ${
                    user.rank === 1
                      ? "border-neon-amber/25 bg-neon-amber/5"
                      : "border-slate-900/40 bg-slate-950/20"
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-display font-extrabold text-sm font-mono ${user.rank === 1 ? "text-neon-amber font-display text-base" : "text-slate-500"}`}>
                    #{user.rank}
                  </span>
                  
                  <div className="w-9 h-9 rounded-lg bg-slate-950/60 border border-slate-900 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
                    {user.name.charAt(0)}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">{user.name}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-mono mt-0.5">{user.role} • Level {user.level}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neon-emerald/10 border border-neon-emerald/25 text-neon-emerald font-mono uppercase tracking-wider">
                    {user.badge}
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {user.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Badges and achievements status */}
        <Card glowColor="violet" hoverEffect={false} className="bg-bg-card border-slate-900/60 flex flex-col gap-6">
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-neon-violet" />
              Achievements Gallery
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Acquired medals in operations</p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { title: "Bug Squash Commando", desc: "Successfully resolved 5 high priority tasks", unlocked: true, icon: "🐞" },
              { title: "Financial Architect", desc: "Accumulated $2k approved operations ledger", unlocked: true, icon: "🏦" },
              { title: "First Ascent", desc: "Achieved Level 2 operational clearance", unlocked: true, icon: "⛰️" },
              { title: "Ledger Sentinel", desc: "Block 3 fraudulent expense requests", unlocked: false, icon: "🛡️" }
            ].map((badge, idx) => (
              <div
                key={idx}
                className={`
                  flex items-start gap-3.5 p-3 rounded-xl border
                  ${
                    badge.unlocked
                      ? "border-neon-violet/20 bg-neon-violet/5 text-slate-200"
                      : "border-slate-900/60 bg-slate-950/40 opacity-40"
                  }
                `}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${badge.unlocked ? "bg-neon-violet/10 border border-neon-violet/20" : "bg-slate-900 border border-slate-800"}`}>
                  {badge.icon}
                </div>
                
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold">{badge.title}</span>
                  <span className="text-[9px] leading-relaxed text-slate-400">{badge.desc}</span>
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
