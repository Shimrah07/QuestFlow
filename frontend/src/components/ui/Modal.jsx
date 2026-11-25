import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "@phosphor-icons/react";

/**
 * Accessible dialog. Centered on desktop, bottom sheet on phones.
 * Closes on Escape and backdrop click, locks page scroll, restores focus on close.
 */
const Modal = ({ open, onClose, title, description, children, footer, size = "md", testId }) => {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const lastFocused = useRef(null);
  const reduce = useReducedMotion();

  // Pages pass inline onClose handlers that change every render. Keep the latest one in a ref
  // so the focus/scroll-lock effect below runs only when the dialog opens or closes. Otherwise
  // every keystroke would re-run it and yank focus out of the field being typed in.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current?.();
      if (e.key === "Tab" && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    // Initial focus: explicit [data-autofocus], else the first field, else the first button.
    // Skip it if the user (or a test) already focused something inside the dialog.
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const target =
        panel.querySelector("[data-autofocus]") ||
        panel.querySelector("input:not([disabled]), select:not([disabled]), textarea:not([disabled])") ||
        panel.querySelector("button:not([disabled])");
      target?.focus({ preventScroll: true });
    }, 30);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      lastFocused.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            data-testid={testId}
            className={`relative w-full ${widths[size]} max-h-[92dvh] flex flex-col surface !rounded-b-none sm:!rounded-2xl bg-surface`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.14 } }}
            transition={{ type: "spring", duration: 0.34, bounce: 0.12 }}
          >
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-line">
              <div className="min-w-0">
                {title && (
                  <h2 id={titleId} className="display text-lg font-semibold text-fg">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descId} className="mt-1 text-sm text-fg-muted">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="btn btn-ghost btn-sm btn-icon -mr-1.5 -mt-0.5 shrink-0"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="px-5 sm:px-6 py-5 overflow-y-auto">{children}</div>
            {footer && (
              <div className="px-5 sm:px-6 py-4 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
