import React, { forwardRef, useState } from "react";
import { Eye, EyeSlash, Check } from "@phosphor-icons/react";

/** Text input with an optional leading Phosphor icon. Forwards every native prop. */
export const TextInput = forwardRef(function TextInput({ icon: Icon, className = "", ...props }, ref) {
  return (
    <div className="relative">
      {Icon && (
        <Icon size={17} weight="regular" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
      )}
      <input ref={ref} className={`control ${Icon ? "pl-10" : ""} ${className}`} {...props} />
    </div>
  );
});

/** Password input with a reveal toggle. The toggle stays out of the tab order like the original. */
export const PasswordInput = forwardRef(function PasswordInput({ icon: Icon, className = "", ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {Icon && (
        <Icon size={17} weight="regular" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
      )}
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className={`control pr-11 ${Icon ? "pl-10" : ""} ${className}`}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-[8px] text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
      >
        {visible ? <EyeSlash size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
});

/** Native checkbox (keeps id/checked semantics for tests and a11y) with a custom face. */
export const Checkbox = ({ id, checked, onChange, disabled, label, className = "" }) => (
  <label htmlFor={id} className={`group inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-fg-muted ${disabled ? "opacity-60" : ""} ${className}`}>
    <span className="relative grid h-[18px] w-[18px] shrink-0 place-items-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-bg-sunken transition-colors checked:border-accent checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <Check size={12} weight="bold" className="pointer-events-none relative scale-75 text-accent-ink opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100" />
    </span>
    {label}
  </label>
);

/** Inline form error banner with a short shake to draw the eye. */
export const FormError = ({ children }) =>
  children ? (
    <div role="alert" className="qf-shake rounded-[10px] border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[0.8125rem] font-medium leading-snug text-danger">
      {children}
    </div>
  ) : null;
