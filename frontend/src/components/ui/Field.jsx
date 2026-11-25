import React, { useId } from "react";

/**
 * Label above the control, hint or error below it. Never placeholder-as-label.
 * Pass the control as a render function to receive the generated id and aria props:
 *   <Field label="Title">{(p) => <input className="control" {...p} />}</Field>
 * or as a plain element with your own id via `htmlFor`.
 */
const Field = ({ label, hint, error, htmlFor, className = "", optional = false, children }) => {
  const autoId = useId();
  const id = htmlFor || autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const control =
    typeof children === "function"
      ? children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
      : children;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {optional && <span className="ml-1 font-normal text-fg-subtle">(optional)</span>}
        </label>
      )}
      {control}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
};

export default Field;
