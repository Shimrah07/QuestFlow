import React from "react";

/**
 * Surface container. `interactive` (or legacy `hoverEffect` + onClick) adds a hover lift.
 * `glowColor` is accepted for backwards compatibility and ignored.
 */
const Card = ({
  children,
  className = "",
  padding = "p-5 sm:p-6",
  interactive,
  hoverEffect = false,
  onClick,
  as: Comp = "div",
  // eslint-disable-next-line no-unused-vars
  glowColor,
  ...props
}) => {
  const lift = interactive ?? (hoverEffect && !!onClick);
  return (
    <Comp
      onClick={onClick}
      className={`surface ${padding} ${
        lift
          ? "transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-line-strong"
          : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
};

export default Card;
