import React, { forwardRef } from "react";
import { CircleNotch } from "@phosphor-icons/react";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const SIZES = { sm: "btn-sm", md: "", lg: "btn-lg" };

/**
 * Button with one shape (10px radius), press feedback and an optional loading state.
 * `icon` renders a leading Phosphor icon; `iconOnly` squares the button (pass aria-label).
 */
const Button = forwardRef(function Button(
  {
    variant = "secondary",
    size = "md",
    icon: Icon,
    iconOnly = false,
    loading = false,
    className = "",
    children,
    type = "button",
    disabled,
    ...props
  },
  ref
) {
  const iconSize = size === "sm" ? 15 : 17;
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`btn ${VARIANTS[variant]} ${SIZES[size]} ${iconOnly ? "btn-icon" : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <CircleNotch size={iconSize} weight="bold" className="animate-spin" aria-hidden />
      ) : (
        Icon && <Icon size={iconSize} weight="bold" aria-hidden />
      )}
      {!iconOnly && children}
    </button>
  );
});

export default Button;
