import React from "react";

/** Compact accent spinner. `color` is accepted for backwards compatibility and ignored. */
// eslint-disable-next-line no-unused-vars
const Spinner = ({ size = "md", color, label = "Loading" }) => {
  const px = { sm: 16, md: 24, lg: 32 }[size] || 24;
  return (
    <span role="status" aria-label={label} className="inline-grid place-items-center">
      <svg width={px} height={px} viewBox="0 0 24 24" className="animate-spin [animation-duration:700ms]" aria-hidden>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="var(--surface-3)" strokeWidth="2.5" />
        <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
};

export default Spinner;
