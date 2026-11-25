import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { Lightning, Trophy } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import { ProgressRing, XP_PER_LEVEL } from "../ui/primitives";
import { getAchievements } from "../../pages/gamification/achievements";

const AUTO_CLOSE_MS = 5200;
const GOLD = ["#f2a93b", "#f7bb5c", "#e8922a", "#fff4dc", "#ffffff"];

/**
 * Watches the signed-in user's level and celebrates when it goes up, whatever caused it
 * (completing a task by button, by drag, or from the edit dialog). Nothing fires on sign-in
 * or page load, only on an increase seen during the session.
 */
const LevelUpCelebration = () => {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const titleId = useId();
  const buttonRef = useRef(null);

  // "Adjust state when a prop changes": remember the last level seen, compare during render.
  const [seen, setSeen] = useState({ id: user?.id, level: user?.level, points: user?.points });
  const [celebration, setCelebration] = useState(null);
  if (user && (seen.id !== user.id || seen.level !== user.level || seen.points !== user.points)) {
    if (seen.id === user.id && seen.level != null && user.level > seen.level) {
      const before = new Set(getAchievements({ ...user, level: seen.level, points: seen.points }).filter((a) => a.unlocked).map((a) => a.id));
      const unlocked = getAchievements(user).filter((a) => a.unlocked && !before.has(a.id));
      setCelebration({ level: user.level, points: user.points, unlocked, key: `${user.id}-${user.level}` });
    }
    setSeen({ id: user.id, level: user.level, points: user.points });
  }

  const close = () => setCelebration(null);

  // Confetti, focus, Escape and auto-close while the celebration is showing.
  // The server records the level-up as a notification; this component only celebrates it.
  useEffect(() => {
    if (!celebration) return;
    buttonRef.current?.focus({ preventScroll: true });
    const onKey = (e) => e.key === "Escape" && setCelebration(null);
    document.addEventListener("keydown", onKey);
    const timer = setTimeout(() => setCelebration(null), AUTO_CLOSE_MS);

    let raf;
    if (!reduce) {
      const burst = (x, angle) =>
        confetti({ particleCount: 70, spread: 62, startVelocity: 48, angle, origin: { x, y: 0.72 }, colors: GOLD, zIndex: 66, scalar: 0.95, disableForReducedMotion: true });
      burst(0.18, 60);
      burst(0.82, 120);
      raf = setTimeout(() => confetti({ particleCount: 90, spread: 100, startVelocity: 32, origin: { x: 0.5, y: 0.35 }, colors: GOLD, zIndex: 66, scalar: 0.8, disableForReducedMotion: true }), 260);
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [celebration, reduce]);

  return createPortal(
    <AnimatePresence>
      {celebration && (
        <motion.div
          key={celebration.key}
          className="fixed inset-0 z-[65] grid place-items-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          onClick={close}
          data-testid="level-up"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", duration: 0.55, bounce: 0.3 }}
            className="surface relative w-full max-w-sm overflow-hidden px-7 pb-7 pt-9 text-center"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 38%, transparent), transparent)" }}
            />
            <div className="relative mx-auto w-fit">
              <ProgressRing value={100} size={132} stroke={9}>
                <motion.span
                  className="num display text-[3.25rem] font-semibold leading-none text-fg"
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.6, bounce: 0.45, delay: 0.35 }}
                >
                  {celebration.level}
                </motion.span>
              </ProgressRing>
            </div>

            <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">Level up</p>
            <h2 id={titleId} className="display relative mt-1 text-[1.75rem] font-semibold leading-tight text-fg">
              You reached level {celebration.level}
            </h2>
            <p className="relative mt-2 text-sm text-fg-muted">
              <span className="num font-semibold text-fg">{celebration.points.toLocaleString()}</span> XP in total. Level {celebration.level + 1} at{" "}
              <span className="num">{(celebration.level * XP_PER_LEVEL).toLocaleString()}</span> XP.
            </p>

            {celebration.unlocked.length > 0 && (
              <ul className="relative mt-5 flex flex-col gap-2 text-left">
                {celebration.unlocked.map((a) => {
                  const Icon = a.icon;
                  return (
                    <li key={a.id} className="flex items-center gap-3 rounded-[12px] border border-accent/30 bg-accent/[0.07] px-3 py-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent/15 text-accent-text">
                        <Icon size={17} weight="fill" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-[0.8125rem] font-semibold text-fg">
                          <Trophy size={12} weight="fill" className="text-accent-text" />
                          Achievement unlocked
                        </span>
                        <span className="block truncate text-xs text-fg-muted">
                          {a.title}: {a.desc}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <button ref={buttonRef} type="button" onClick={close} className="btn btn-primary btn-lg relative mt-6 w-full" data-testid="level-up-close">
              <Lightning size={17} weight="fill" />
              Keep going
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LevelUpCelebration;
