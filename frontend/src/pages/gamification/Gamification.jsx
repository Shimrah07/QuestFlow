import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy, ArrowClockwise, Lightning, Medal } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import Button from "../../components/ui/Button";
import { PageHeader, Avatar, EmptyState, Skeleton, Stagger, StaggerItem } from "../../components/ui/primitives";
import { getAchievements } from "./achievements";

const getRankBadge = (rank) => {
  if (rank === 1) return "Champion";
  if (rank === 2) return "Elite";
  if (rank === 3) return "Expert";
  return "Challenger";
};

const levelOf = (points) => Math.floor(points / 500) + 1;

/** Top-three podium. Order on wide screens is 2, 1, 3 so the leader sits in the middle and highest. */
const Podium = ({ top, currentUserId }) => {
  const reduce = useReducedMotion();
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const height = { 1: "sm:h-44", 2: "sm:h-36", 3: "sm:h-32" };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
      {order.map((u) => {
        const rank = top.indexOf(u) + 1;
        const isSelf = u.id === currentUserId;
        const leader = rank === 1;
        return (
          <motion.div
            key={u.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: leader ? 0.05 : 0.15 }}
            className={`${rank === 1 ? "order-first sm:order-none" : ""}`}
            data-testid="podium-entry"
          >
            <div className="mb-3 flex items-center gap-3 sm:flex-col sm:text-center">
              <div className="relative">
                <Avatar name={u.first_name} size={leader ? 56 : 46} highlight={leader || isSelf} />
                <span
                  className={`num absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-[7px] border text-[0.6875rem] font-semibold ${
                    leader ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-surface-2 text-fg"
                  }`}
                >
                  {rank}
                </span>
              </div>
              <div className="min-w-0 sm:mt-1">
                <p className="truncate text-sm font-semibold text-fg">
                  {u.first_name}
                  {isSelf && <span className="ml-1 font-normal text-fg-subtle">(you)</span>}
                </p>
                <p className="text-xs text-fg-subtle">
                  {getRankBadge(rank)} · Level {levelOf(u.points)}
                </p>
              </div>
              <p className="num ml-auto text-sm font-semibold text-fg sm:hidden">{u.points.toLocaleString()} XP</p>
            </div>
            <div
              className={`hidden flex-col items-center justify-start rounded-t-[14px] border border-b-0 pt-4 sm:flex ${height[rank]} ${
                leader ? "border-accent/35 bg-gradient-to-b from-accent/[0.16] to-transparent" : "border-line bg-gradient-to-b from-surface-2 to-transparent"
              }`}
            >
              <Medal size={leader ? 26 : 22} weight="duotone" className={leader ? "text-accent-text" : "text-fg-subtle"} />
              <p className={`num mt-2 font-semibold ${leader ? "text-xl text-fg" : "text-base text-fg"}`}>{u.points.toLocaleString()}</p>
              <p className="text-[0.6875rem] text-fg-subtle">XP</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const Gamification = () => {
  const { user: currentUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/users/leaderboard");
      setLeaderboard(response.data);
    } catch (err) {
      console.error("Error loading leaderboard standings:", err);
      setError("Couldn't load the leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const achievements = getAchievements(currentUser);
  const myIndex = leaderboard.findIndex((u) => u.id === currentUser?.id);
  const myRank = myIndex + 1;
  const above = myIndex > 0 ? leaderboard[myIndex - 1] : null;
  const leaderXp = leaderboard[0]?.points || 0;
  const top = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader title="Leaderboard" description="Active members ranked by total XP. Finish tasks to climb." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Standings */}
        <section className="surface flex flex-col lg:col-span-8" aria-labelledby="standings-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <h2 id="standings-title" className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
              <Trophy size={17} weight="fill" className="text-accent-text" />
              Team standings
            </h2>
            {!loading && !error && myRank > 0 && (
              <p className="text-[0.8125rem] text-fg-muted" data-testid="my-rank">
                You're <span className="num font-semibold text-fg">#{myRank}</span> of <span className="num">{leaderboard.length}</span>
                {above && (
                  <span className="text-fg-subtle">
                    {" "}
                    · <span className="num">{(above.points - (currentUser?.points || 0)).toLocaleString()}</span> XP behind {above.first_name}
                  </span>
                )}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col gap-4 p-5 sm:p-6" aria-busy="true" aria-label="Loading standings">
              <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                <Skeleton className="h-40" />
                <Skeleton className="h-48" />
                <Skeleton className="h-36" />
              </div>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={Trophy}
              title={error}
              description="Check your connection and try again."
              action={
                <Button icon={ArrowClockwise} onClick={fetchLeaderboard}>
                  Try again
                </Button>
              }
            />
          ) : leaderboard.length === 0 ? (
            <EmptyState icon={Trophy} title="No one on the board yet" description="Standings appear once team members earn XP." />
          ) : (
            <div className="flex flex-col gap-6 p-5 sm:p-6">
              <Podium top={top} currentUserId={currentUser?.id} />

              {rest.length > 0 && (
                <Stagger className="flex flex-col" delay={0.03}>
                  {rest.map((user, idx) => {
                    const rank = idx + 4;
                    const isSelf = currentUser?.id === user.id;
                    const share = leaderXp ? (user.points / leaderXp) * 100 : 0;
                    return (
                      <StaggerItem
                        key={user.id}
                        className={`relative flex items-center gap-3 rounded-[12px] px-3 py-3 sm:gap-4 ${isSelf ? "bg-accent/[0.07] ring-1 ring-accent/25" : ""}`}
                      >
                        <span className={`num w-7 shrink-0 text-right text-[0.8125rem] font-semibold ${isSelf ? "text-accent-text" : "text-fg-subtle"}`}>{rank}</span>
                        <Avatar name={user.first_name} size={32} highlight={isSelf} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">
                            {user.first_name}
                            {isSelf && <span className="ml-1 font-normal text-fg-subtle">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-fg-subtle">
                            {user.role} · Level {levelOf(user.points)}
                          </p>
                        </div>
                        <span className="hidden text-xs text-fg-subtle sm:inline">{getRankBadge(rank)}</span>
                        <span className="num w-20 shrink-0 text-right text-sm font-semibold text-fg">{user.points.toLocaleString()} XP</span>
                        {/* share of the leader's XP, slim bar on the row's bottom edge */}
                        <span className="absolute inset-x-3 bottom-0 h-[3px] overflow-hidden rounded-full bg-surface-2" aria-hidden>
                          <span className={`block h-full rounded-full ${isSelf ? "bg-accent" : "bg-fg-subtle/40"}`} style={{ width: `${share}%` }} />
                        </span>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              )}
            </div>
          )}
        </section>

        {/* Achievements */}
        <section className="surface flex flex-col lg:col-span-4" aria-labelledby="achievements-title">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="achievements-title" className="text-[0.9375rem] font-semibold text-fg">
              Achievements
            </h2>
            <span className="num text-xs text-fg-subtle">
              {achievements.filter((a) => a.unlocked).length}/{achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-4">
            {achievements.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col gap-3 rounded-[14px] border p-3.5 transition-colors ${
                    badge.unlocked ? "border-accent/30 bg-accent/[0.06]" : "border-line bg-surface-2/50"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-[11px] border ${
                      badge.unlocked ? "border-accent/35 bg-accent/15 text-accent-text" : "border-line bg-surface-2 text-fg-subtle"
                    }`}
                  >
                    <Icon size={20} weight={badge.unlocked ? "fill" : "regular"} />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${badge.unlocked ? "text-fg" : "text-fg-muted"}`}>{badge.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-fg-subtle">{badge.desc}</p>
                  </div>
                  <div>
                    <div className="h-[3px] overflow-hidden rounded-full bg-surface-3">
                      <div className={`h-full rounded-full ${badge.unlocked ? "bg-accent" : "bg-fg-subtle/60"}`} style={{ width: `${badge.progress * 100}%` }} />
                    </div>
                    <p className="num mt-1.5 text-[0.6875rem] text-fg-subtle">{badge.unlocked ? "Unlocked" : badge.meta}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-auto flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-fg-subtle">
            <Lightning size={13} weight="fill" className="text-accent-text" />
            Every 500 XP is a new level.
          </div>
        </section>
      </div>
    </div>
  );
};

export default Gamification;
