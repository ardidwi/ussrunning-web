"use client";

import { useId } from "react";
import { FieldHint, FieldError } from "./Field";
export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  hint,
  error,
  disabled,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string; disabled?: boolean }[];
  value?: string;
  onChange?: (value: string) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const id = useId();
  return (
    <fieldset
      className="uss-radio-group"
      disabled={disabled}
      aria-describedby={id + "-hint " + id + "-error"}
      aria-invalid={Boolean(error)}
    >
      <legend className="uss-field-label">
        {label}
        {required && <span className="uss-required"> *</span>}
      </legend>
      {options.map((option, index) => (
        <div className="uss-choice" key={option.value}>
          <input
            type="radio"
            id={id + index}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={option.disabled}
            required={required}
          />
          <label htmlFor={id + index}>{option.label}</label>
        </div>
      ))}
      <FieldHint id={id + "-hint"}>{hint}</FieldHint>
      <FieldError id={id + "-error"}>{error}</FieldError>
    </fieldset>
  );
}
